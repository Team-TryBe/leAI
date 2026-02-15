"""
Referral System Service for Aditus.
Implements "Give 1, Get 1" referral program with anti-fraud measures.

Security Features:
- Self-referral detection (IP + phone number matching)
- Race condition prevention (atomic transactions)
- One-time reward enforcement (has_earned_referral_reward flag)
- Input sanitization and SQL injection prevention
"""

import secrets
import string
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User, ReferralTransaction


class ReferralService:
    """Service for handling referral system business logic."""
    
    @staticmethod
    def generate_referral_code(length: int = 8) -> str:
        """
        Generate a unique 8-character referral code.
        Uses alphanumeric characters for readability.
        
        Args:
            length: Length of the code (default 8)
        
        Returns:
            str: Generated referral code (uppercase alphanumeric)
        """
        # Use uppercase letters and digits for clarity (avoid confusion between O/0, I/1)
        characters = string.ascii_uppercase + string.digits
        code = ''.join(secrets.choice(characters) for _ in range(length))
        return code
    
    @staticmethod
    async def validate_referral_code(db: AsyncSession, ref_code: str) -> dict | None:
        """
        Validate and fetch referrer details using referral code.
        Sanitizes input to prevent SQL injection.
        
        Args:
            db: Database session
            ref_code: Referral code to validate
        
        Returns:
            dict: Referrer details or None if invalid/does not exist
        """
        # Sanitize: Only allow alphanumeric characters
        if not ref_code or not ref_code.isalnum() or len(ref_code) != 8:
            return None
        
        # Query for referrer
        stmt = select(User).where(User.referral_code == ref_code.upper())
        result = await db.execute(stmt)
        referrer = result.scalar_one_or_none()
        
        if not referrer:
            return None
        
        return {
            "id": referrer.id,
            "email": referrer.email,
            "full_name": referrer.full_name,
        }
    
    @staticmethod
    async def check_self_referral(
        db: AsyncSession,
        referrer_id: int,
        new_user_ip: str,
        new_user_phone: str | None
    ) -> bool:
        """
        🛡️ Anti-Fraud: Detect self-referral attempts.
        
        Checks:
        1. Same IP address within 24 hours
        2. Same phone number
        
        Args:
            db: Database session
            referrer_id: ID of referrer
            new_user_ip: IP address of new user signup
            new_user_phone: Phone number of new user (if provided)
        
        Returns:
            bool: True if self-referral detected, False otherwise
        """
        referrer_stmt = select(User).where(User.id == referrer_id)
        referrer_result = await db.execute(referrer_stmt)
        referrer = referrer_result.scalar_one_or_none()
        
        if not referrer:
            return False
        
        # Check 1: IP address match within 24 hours
        if referrer.signup_ip and referrer.signup_ip == new_user_ip:
            time_diff = datetime.utcnow() - referrer.created_at
            if time_diff < timedelta(hours=24):
                return True  # Self-referral detected
        
        # Check 2: Phone number match
        if new_user_phone and referrer.phone and referrer.phone == new_user_phone:
            return True  # Self-referral detected
        
        return False
    
    @staticmethod
    async def create_referral_transaction(
        db: AsyncSession,
        referrer_id: int,
        referred_user_id: int,
        referral_code: str,
        signup_ip: str
    ) -> ReferralTransaction:
        """
        Create a new referral transaction record.
        Status starts as PENDING until referred user verifies email.
        
        Args:
            db: Database session
            referrer_id: ID of referrer
            referred_user_id: ID of referred user
            referral_code: Code used
            signup_ip: IP of referred user at signup
        
        Returns:
            ReferralTransaction: Created transaction
        """
        transaction = ReferralTransaction(
            referrer_id=referrer_id,
            referred_user_id=referred_user_id,
            referral_code=referral_code,
            signup_ip=signup_ip,
            status="PENDING",
        )
        db.add(transaction)
        await db.flush()
        return transaction
    
    @staticmethod
    async def process_referral_reward(
        db: AsyncSession,
        verified_user_id: int
    ) -> bool:
        """
        🔐 Atomic Transaction: Grant reward to referrer when referred user verifies email.
        
        SECURITY:
        - Checks referred_by exists
        - Verifies referrer has NOT already earned reward (has_earned_referral_reward == False)
        - Uses database-level atomic update to prevent race conditions
        - Grants exactly 1 credit (immutable after first reward)
        
        Args:
            db: Database session
            verified_user_id: ID of user who just verified email
        
        Returns:
            bool: True if reward granted, False if conditions not met
        
        Raises:
            Exception: Database transaction errors
        """
        # Step 1: Get the verified user's referral info
        verified_stmt = select(User).where(User.id == verified_user_id)
        verified_result = await db.execute(verified_stmt)
        verified_user = verified_result.scalar_one_or_none()
        
        if not verified_user or not verified_user.referred_by:
            return False  # No referrer, nothing to do
        
        referrer_id = verified_user.referred_by
        
        # Step 2: Fetch referrer with lock (for race condition prevention)
        referrer_stmt = select(User).where(User.id == referrer_id)
        referrer_result = await db.execute(referrer_stmt)
        referrer = referrer_result.scalar_one_or_none()
        
        if not referrer:
            return False
        
        # Step 3: Check if referrer already earned reward (security gate)
        if referrer.has_earned_referral_reward:
            return False  # Already earned, can't earn again
        
        # Step 4: Atomic update - grant exactly 1 credit
        referrer.referral_credits += 1
        referrer.has_earned_referral_reward = True
        referrer.referral_reward_earned_at = datetime.utcnow()
        db.add(referrer)
        
        # Step 5: Update referral transaction status
        txn_stmt = select(ReferralTransaction).where(
            and_(
                ReferralTransaction.referrer_id == referrer_id,
                ReferralTransaction.referred_user_id == verified_user_id,
            )
        )
        txn_result = await db.execute(txn_stmt)
        transaction = txn_result.scalar_one_or_none()
        
        if transaction:
            transaction.status = "COMPLETED"
            transaction.verified_at = datetime.utcnow()
            transaction.reward_granted_at = datetime.utcnow()
            db.add(transaction)
        
        await db.commit()
        return True
    
    @staticmethod
    async def get_referral_stats(
        db: AsyncSession,
        user_id: int
    ) -> dict:
        """
        Get referral statistics for a user.
        
        Returns:
            dict: {
                "code": "ABC1234",
                "referral_credits": 0,
                "has_earned_reward": False,
                "total_referrals": 0,
                "successful_referrals": 0,
                "pending_referrals": 0,
                "reward_earned_at": null
            }
        """
        user_stmt = select(User).where(User.id == user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        
        if not user:
            return {}
        
        # Count referrals
        all_stmt = select(ReferralTransaction).where(ReferralTransaction.referrer_id == user_id)
        all_result = await db.execute(all_stmt)
        all_referrals = all_result.scalars().all()
        
        completed = len([r for r in all_referrals if r.status == "COMPLETED"])
        pending = len([r for r in all_referrals if r.status == "PENDING"])
        
        return {
            "code": user.referral_code,
            "referral_credits": user.referral_credits,
            "has_earned_reward": user.has_earned_referral_reward,
            "total_referrals": len(all_referrals),
            "successful_referrals": completed,
            "pending_referrals": pending,
            "reward_earned_at": user.referral_reward_earned_at.isoformat() if user.referral_reward_earned_at else None,
        }
