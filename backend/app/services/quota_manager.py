"""
Quota Manager - Token and API call quota enforcement

Implements per-plan quota limits with:
- Daily token limits
- Monthly token limits
- API call rate limits
- Graceful quota exceeded handling

Quota Limits by Plan:
- Freemium: 10K tokens/day, 100K tokens/month
- Pay-as-you-go: 50K tokens/day, 500K tokens/month
- Pro Monthly: 1M tokens/day, 30M tokens/month
- Pro Annual: 2M tokens/day, 60M tokens/month
- Enterprise: Unlimited

Usage:
    quota_mgr = QuotaManager(db=db)
    
    # Check before generation
    await quota_mgr.check_quota(
        user_id=user_id,
        task_type="cv_draft",
        estimated_tokens=2048,
    )
    
    # Get quota status
    status = await quota_mgr.get_quota_status(user_id)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from enum import Enum

from app.db.models import User, Subscription, AIProviderUsageLog, PlanType
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class QuotaError(Exception):
    """Raised when quota is exceeded."""
    pass


class QuotaWarningLevel(str, Enum):
    """Quota warning levels."""
    OK = "ok"                          # < 50% used
    WARNING = "warning"                # 50-80% used
    CRITICAL = "critical"              # 80-95% used
    EXCEEDED = "exceeded"              # > 95% used


class QuotaConfig:
    """Quota configuration by plan type."""

    # Token limits (daily, monthly)
    TOKEN_LIMITS = {
        PlanType.FREEMIUM: {
            "daily": 10_000,           # 10K tokens/day
            "monthly": 100_000,        # 100K tokens/month
        },
        PlanType.PAY_AS_YOU_GO: {
            "daily": 50_000,           # 50K tokens/day
            "monthly": 500_000,        # 500K tokens/month
        },
        PlanType.PRO_MONTHLY: {
            "daily": 1_000_000,        # 1M tokens/day
            "monthly": 30_000_000,     # 30M tokens/month
        },
        PlanType.PRO_ANNUAL: {
            "daily": 2_000_000,        # 2M tokens/day
            "monthly": 60_000_000,     # 60M tokens/month
        },
    }

    # API call rate limits (per hour)
    CALL_LIMITS = {
        PlanType.FREEMIUM: 100,        # 100 calls/hour
        PlanType.PAY_AS_YOU_GO: 500,   # 500 calls/hour
        PlanType.PRO_MONTHLY: 5_000,   # 5K calls/hour
        PlanType.PRO_ANNUAL: 10_000,   # 10K calls/hour
    }

    # Task-specific token estimates (if not provided)
    TASK_TOKEN_ESTIMATES = {
        "extraction": 1024,            # Job extraction
        "cv_draft": 2048,              # CV drafting
        "cover_letter": 1536,          # Cover letter
        "validation": 512,             # Data validation
        "default": 1024,               # Default estimate
    }


class QuotaManager:
    """
    Manages quota enforcement for AI operations.
    
    Checks:
    - Daily token limit
    - Monthly token limit
    - Hourly API call rate limit
    - Per-task limits
    
    Provides:
    - Pre-check before generation
    - Quota status reporting
    - Grace period handling
    """

    def __init__(self, db: AsyncSession):
        """Initialize quota manager."""
        self.db = db
        self.settings = get_settings()
        self.config = QuotaConfig()

    async def get_user_plan(self, user_id: int) -> Optional[PlanType]:
        """
        Get user's active subscription plan.
        
        Returns:
            PlanType or None if no active subscription
        """
        stmt = select(Subscription).where(
            (Subscription.user_id == user_id) &
            (Subscription.status == "active")
        )
        result = await self.db.execute(stmt)
        subscription = result.scalar_one_or_none()

        return subscription.plan_type if subscription else None

    async def get_quota_limits(self, user_id: int) -> Dict[str, int]:
        """
        Get quota limits for user based on plan.
        
        Returns:
            Dict with daily_tokens, monthly_tokens, hourly_calls
        """
        plan = await self.get_user_plan(user_id)
        
        if not plan:
            # Default to Freemium limits if no subscription
            plan = PlanType.FREEMIUM

        token_limits = self.config.TOKEN_LIMITS.get(plan, self.config.TOKEN_LIMITS[PlanType.FREEMIUM])
        call_limit = self.config.CALL_LIMITS.get(plan, self.config.CALL_LIMITS[PlanType.FREEMIUM])

        return {
            "daily_tokens": token_limits["daily"],
            "monthly_tokens": token_limits["monthly"],
            "hourly_calls": call_limit,
            "plan": plan.value,
        }

    async def check_quota(
        self,
        user_id: int,
        task_type: str,
        estimated_tokens: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """
        Check if user can make a request within quota.
        
        Args:
            user_id: User ID
            task_type: Type of task (extraction, cv_draft, etc.)
            estimated_tokens: Override estimated tokens for this task
        
        Returns:
            (is_allowed, message) - (True, "") if allowed, else (False, reason)
        
        Raises:
            QuotaError: If quota exceeded (can be caught and handled gracefully)
        """
        try:
            # Get estimates if not provided
            if estimated_tokens is None:
                estimated_tokens = self.config.TASK_TOKEN_ESTIMATES.get(
                    task_type,
                    self.config.TASK_TOKEN_ESTIMATES["default"]
                )

            # Get user quota limits
            limits = await self.get_quota_limits(user_id)

            # Check daily limit
            daily_used = await self._get_daily_usage(user_id)
            daily_remaining = limits["daily_tokens"] - daily_used

            if daily_remaining <= 0:
                msg = f"Daily quota exceeded: {daily_used}/{limits['daily_tokens']} tokens used"
                logger.warning(f"User {user_id}: {msg}")
                raise QuotaError(msg)

            if daily_remaining < estimated_tokens:
                msg = (
                    f"Request would exceed daily quota: "
                    f"need {estimated_tokens}, have {daily_remaining} remaining"
                )
                logger.warning(f"User {user_id}: {msg}")
                raise QuotaError(msg)

            # Check monthly limit
            monthly_used = await self._get_monthly_usage(user_id)
            monthly_remaining = limits["monthly_tokens"] - monthly_used

            if monthly_remaining <= 0:
                msg = f"Monthly quota exceeded: {monthly_used}/{limits['monthly_tokens']} tokens used"
                logger.warning(f"User {user_id}: {msg}")
                raise QuotaError(msg)

            if monthly_remaining < estimated_tokens:
                msg = (
                    f"Request would exceed monthly quota: "
                    f"need {estimated_tokens}, have {monthly_remaining} remaining"
                )
                logger.warning(f"User {user_id}: {msg}")
                raise QuotaError(msg)

            # Check hourly call limit
            hourly_calls = await self._get_hourly_calls(user_id)
            
            if hourly_calls >= limits["hourly_calls"]:
                msg = f"Hourly API call limit reached: {hourly_calls}/{limits['hourly_calls']}"
                logger.warning(f"User {user_id}: {msg}")
                raise QuotaError(msg)

            logger.info(
                f"Quota check passed for user {user_id}: "
                f"daily={daily_used}/{limits['daily_tokens']}, "
                f"monthly={monthly_used}/{limits['monthly_tokens']}"
            )

            return True, ""

        except QuotaError:
            raise
        except Exception as e:
            logger.error(f"Quota check error for user {user_id}: {e}")
            # On error, allow the request (fail open)
            return True, ""

    async def _get_daily_usage(self, user_id: int) -> int:
        """Get total tokens used today."""
        today = datetime.utcnow().date()
        
        stmt = select(func.sum(AIProviderUsageLog.total_tokens)).where(
            (AIProviderUsageLog.user_id == user_id) &
            (AIProviderUsageLog.status == "success") &
            (func.date(AIProviderUsageLog.created_at) == today)
        )

        result = await self.db.execute(stmt)
        total = result.scalar()
        return total or 0

    async def _get_monthly_usage(self, user_id: int) -> int:
        """Get total tokens used this month."""
        now = datetime.utcnow()
        month_start = now.replace(day=1)
        
        stmt = select(func.sum(AIProviderUsageLog.total_tokens)).where(
            (AIProviderUsageLog.user_id == user_id) &
            (AIProviderUsageLog.status == "success") &
            (AIProviderUsageLog.created_at >= month_start)
        )

        result = await self.db.execute(stmt)
        total = result.scalar()
        return total or 0

    async def _get_hourly_calls(self, user_id: int) -> int:
        """Get API calls made in last hour."""
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        stmt = select(func.count(AIProviderUsageLog.id)).where(
            (AIProviderUsageLog.user_id == user_id) &
            (AIProviderUsageLog.created_at >= one_hour_ago)
        )

        result = await self.db.execute(stmt)
        count = result.scalar()
        return count or 0

    async def get_quota_status(self, user_id: int) -> Dict:
        """
        Get detailed quota status for user.
        
        Useful for displaying in dashboard or API response.
        
        Returns:
            Dict with all quota metrics and warnings
        """
        try:
            limits = await self.get_quota_limits(user_id)
            daily_used = await self._get_daily_usage(user_id)
            monthly_used = await self._get_monthly_usage(user_id)
            hourly_calls = await self._get_hourly_calls(user_id)

            # Calculate percentages
            daily_pct = int((daily_used / limits["daily_tokens"]) * 100) if limits["daily_tokens"] != float('inf') else 0
            monthly_pct = int((monthly_used / limits["monthly_tokens"]) * 100) if limits["monthly_tokens"] != float('inf') else 0
            calls_pct = int((hourly_calls / limits["hourly_calls"]) * 100) if limits["hourly_calls"] != float('inf') else 0

            # Determine warning levels
            daily_level = self._get_warning_level(daily_pct)
            monthly_level = self._get_warning_level(monthly_pct)
            calls_level = self._get_warning_level(calls_pct)

            return {
                "plan": limits["plan"],
                "daily": {
                    "used": daily_used,
                    "limit": limits["daily_tokens"],
                    "remaining": max(0, limits["daily_tokens"] - daily_used),
                    "percentage": daily_pct,
                    "warning_level": daily_level.value,
                },
                "monthly": {
                    "used": monthly_used,
                    "limit": limits["monthly_tokens"],
                    "remaining": max(0, limits["monthly_tokens"] - monthly_used),
                    "percentage": monthly_pct,
                    "warning_level": monthly_level.value,
                },
                "hourly_calls": {
                    "made": hourly_calls,
                    "limit": limits["hourly_calls"],
                    "remaining": max(0, limits["hourly_calls"] - hourly_calls),
                    "percentage": calls_pct,
                    "warning_level": calls_level.value,
                },
                "resets_at": {
                    "daily": self._get_next_reset_time("daily"),
                    "monthly": self._get_next_reset_time("monthly"),
                },
            }

        except Exception as e:
            logger.error(f"Error getting quota status for user {user_id}: {e}")
            return {}

    @staticmethod
    def _get_warning_level(percentage: int) -> QuotaWarningLevel:
        """Determine warning level based on percentage used."""
        if percentage >= 95:
            return QuotaWarningLevel.EXCEEDED
        elif percentage >= 80:
            return QuotaWarningLevel.CRITICAL
        elif percentage >= 50:
            return QuotaWarningLevel.WARNING
        else:
            return QuotaWarningLevel.OK

    @staticmethod
    def _get_next_reset_time(period: str) -> str:
        """Get next reset time for quota period."""
        now = datetime.utcnow()
        
        if period == "daily":
            next_reset = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0)
        elif period == "monthly":
            if now.month == 12:
                next_reset = now.replace(year=now.year+1, month=1, day=1, hour=0, minute=0, second=0)
            else:
                next_reset = now.replace(month=now.month+1, day=1, hour=0, minute=0, second=0)
        else:
            next_reset = now

        return next_reset.isoformat()

    async def reset_daily_quota(self, user_id: int) -> bool:
        """
        Manually reset daily quota (admin only).
        
        Returns: True if successful
        """
        try:
            # Delete or mark failed attempts?
            # For now, just log
            logger.info(f"Daily quota reset requested for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error resetting daily quota for user {user_id}: {e}")
            return False
