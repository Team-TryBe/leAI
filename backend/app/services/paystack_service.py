"""
Paystack Payment Service - Handles M-Pesa and other payment methods

Features:
- Payment initialization (M-Pesa, Card, Bank Transfer)
- Payment verification
- Webhook handling and verification
- Transaction history tracking
- Subscription activation on successful payment

Uses Paystack API v1 endpoints:
- POST /transaction/initialize - Start payment
- GET /transaction/verify/{reference} - Check payment status
- Webhooks for charge.success / charge.failed events
"""

import httpx
import logging
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.models import PaystackPayment, PaystackTransaction, PaystackLog, Plan, Subscription

logger = logging.getLogger(__name__)
settings = get_settings()


class PaystackError(Exception):
    """Base exception for Paystack operations"""
    pass


class PaymentInitializationError(PaystackError):
    """Raised when payment initialization fails"""
    pass


class WebhookVerificationError(PaystackError):
    """Raised when webhook verification fails"""
    pass


class PaystackService:
    """
    Service for handling Paystack payment operations.
    
    Supports:
    - Payment initialization (M-Pesa, Card, Bank Transfer)
    - Payment verification
    - Webhook handling
    - Transaction history
    
    Uses Paystack API v1 endpoints:
    - POST /transaction/initialize - Start payment
    - GET /transaction/verify/{reference} - Check payment status
    """
    
    BASE_URL = "https://api.paystack.co"
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.api_key = settings.PAYSTACK_SECRET_KEY
        self.public_key = settings.PAYSTACK_PUBLIC_KEY
        self.webhook_secret = settings.PAYSTACK_WEBHOOK_SECRET
        self.timeout = settings.PAYSTACK_TIMEOUT
        self.currency = settings.PAYSTACK_CURRENCY
        
    async def initialize_payment(
        self,
        user_id: int,
        email: str,
        amount: int,
        plan_id: Optional[int] = None,
        payment_method: Optional[str] = "mpesa",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Initialize a payment transaction.
        
        Args:
            user_id: User making payment
            email: User's email for receipt
            amount: Amount in KES cents (e.g., 9900 = 99.00)
            plan_id: Plan being purchased
            payment_method: Preferred payment method
            metadata: Additional data to track
            
        Returns:
            {
                "authorization_url": "https://checkout.paystack.com/...",
                "access_code": "xxxxx",
                "reference": "xxxxx",
                "amount": 9900,
                "payment_id": 123
            }
        """
        try:
            # Validate amount
            if amount <= 0:
                raise PaymentInitializationError("Amount must be greater than 0")
            
            # Prepare metadata
            if not metadata:
                metadata = {}
            
            metadata.update({
                "user_id": user_id,
                "plan_id": plan_id,
                "payment_method": payment_method,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Prepare Paystack request
            payload = {
                "email": email,
                "amount": amount,
                "currency": self.currency,
                "metadata": metadata,
            }
            
            # Add channels for M-Pesa
            if payment_method == "mpesa":
                payload["channels"] = ["mobile_money"]
            
            logger.info(f"Initializing payment: user_id={user_id}, amount={amount}, method={payment_method}")
            
            # Call Paystack API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/transaction/initialize",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            
            if response.status_code != 200:
                error_msg = response.json().get("message", "Payment initialization failed")
                logger.error(f"Paystack error: {error_msg}")
                raise PaymentInitializationError(error_msg)
            
            data = response.json()
            
            if not data.get("status"):
                raise PaymentInitializationError(data.get("message", "Unknown error"))
            
            paystack_data = data["data"]
            reference = paystack_data["reference"]
            access_code = paystack_data["access_code"]
            authorization_url = paystack_data["authorization_url"]
            
            # Store payment record
            payment = PaystackPayment(
                user_id=user_id,
                reference=reference,
                access_code=access_code,
                authorization_url=authorization_url,
                amount=amount,
                currency=self.currency,
                payment_method=payment_method,
                plan_id=plan_id,
                status="pending",
                payment_metadata=metadata,
                initiated_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(hours=24)
            )
            
            self.db.add(payment)
            await self.db.flush()
            await self.db.refresh(payment)
            
            # Log initialization
            await self._log_payment_event(
                payment.id,
                "initiated",
                f"Payment initialized: {amount} {self.currency}",
                payload,
                paystack_data
            )
            
            logger.info(f"Payment initialized: reference={reference}, amount={amount}")
            
            return {
                "authorization_url": authorization_url,
                "access_code": access_code,
                "reference": reference,
                "amount": amount,
                "payment_id": payment.id,
                "public_key": self.public_key
            }
            
        except httpx.TimeoutException:
            logger.error(f"Paystack API timeout: {self.timeout}s")
            raise PaymentInitializationError(f"Payment service timeout (>{self.timeout}s)")
        except PaymentInitializationError:
            raise
        except Exception as e:
            logger.error(f"Payment initialization error: {str(e)}")
            raise PaymentInitializationError(str(e))
    
    async def verify_payment(self, reference: str) -> Dict[str, Any]:
        """
        Verify payment status with Paystack.
        
        Args:
            reference: Payment reference from Paystack
            
        Returns:
            {
                "status": "success|failed|pending",
                "amount": 9900,
                "message": "Verification successful",
                "transaction_id": "xxxxx",
                "receipt": "xxxxx"
            }
        """
        try:
            logger.info(f"Verifying payment: {reference}")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers=self._get_headers(),
                    timeout=self.timeout
                )
            
            if response.status_code != 200:
                logger.error(f"Verification failed: HTTP {response.status_code}")
                raise PaystackError("Payment verification failed")
            
            data = response.json()
            
            if not data.get("status"):
                logger.warning(f"Verification returned false: {data}")
                return {
                    "status": "pending",
                    "message": data.get("message", "Payment verification pending")
                }
            
            transaction = data["data"]
            
            # Update payment record in database
            await self._update_payment_from_verification(reference, transaction)
            
            return {
                "status": "success" if transaction.get("status") == "success" else "failed",
                "amount": transaction.get("amount"),
                "message": transaction.get("gateway_response", "Payment processed"),
                "transaction_id": transaction.get("id"),
                "receipt": transaction.get("reference"),
                "paid_at": transaction.get("paid_at")
            }
            
        except Exception as e:
            logger.error(f"Verification error: {str(e)}")
            raise
    
    def verify_webhook_signature(self, signature: str, body: bytes) -> bool:
        """
        Verify webhook signature to ensure it's from Paystack.
        
        Args:
            signature: x-paystack-signature header from Paystack
            body: Raw request body
            
        Returns:
            True if signature is valid, False otherwise
        """
        computed_hash = hmac.new(
            self.webhook_secret.encode(),
            body,
            hashlib.sha512
        ).hexdigest()
        
        is_valid = computed_hash == signature
        
        if not is_valid:
            logger.warning(f"Invalid webhook signature received")
        
        return is_valid
    
    async def handle_webhook(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle Paystack webhook event.
        
        Args:
            event_data: Webhook payload from Paystack
            
        Returns:
            Success confirmation
        """
        try:
            event = event_data.get("event")
            data = event_data.get("data", {})
            
            reference = data.get("reference")
            status = data.get("status")
            
            logger.info(f"Webhook received: event={event}, reference={reference}, status={status}")
            
            if event == "charge.success":
                await self._handle_charge_success(data)
            elif event == "charge.failed":
                await self._handle_charge_failed(data)
            else:
                logger.warning(f"Unknown event type: {event}")
            
            return {"success": True, "message": "Webhook processed"}
            
        except Exception as e:
            logger.error(f"Webhook handling error: {str(e)}")
            raise
    
    async def _handle_charge_success(self, transaction_data: Dict[str, Any]) -> None:
        """Handle successful payment."""
        reference = transaction_data.get("reference")
        
        # Find payment record
        stmt = select(PaystackPayment).where(PaystackPayment.reference == reference)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            logger.error(f"Payment not found: {reference}")
            return
        
        # Check if already processed (idempotency)
        if payment.status == "success":
            logger.info(f"Payment already marked as success: {reference}")
            return
        
        # Update payment status
        payment.status = "success"
        payment.completed_at = datetime.utcnow()
        payment.payer_phone = transaction_data.get("customer", {}).get("phone")
        
        # Create transaction record
        transaction = PaystackTransaction(
            paystack_payment_id=payment.id,
            transaction_id=str(transaction_data.get("id")),
            receipt_number=transaction_data.get("reference"),
            status="completed",
            message="Payment successful",
            timestamp=datetime.utcnow(),
            raw_response=transaction_data
        )
        
        self.db.add(transaction)
        
        # Activate subscription if plan is linked
        if payment.plan_id:
            await self._activate_subscription(payment.user_id, payment.plan_id, payment.id)
        
        await self.db.commit()
        
        logger.info(f"Payment marked as success: {reference}")
    
    async def _handle_charge_failed(self, transaction_data: Dict[str, Any]) -> None:
        """Handle failed payment."""
        reference = transaction_data.get("reference")
        
        stmt = select(PaystackPayment).where(PaystackPayment.reference == reference)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            logger.error(f"Payment not found: {reference}")
            return
        
        # Check if already processed
        if payment.status == "failed":
            logger.info(f"Payment already marked as failed: {reference}")
            return
        
        payment.status = "failed"
        payment.failure_reason = transaction_data.get("gateway_response", "Unknown error")
        
        transaction = PaystackTransaction(
            paystack_payment_id=payment.id,
            status="failed",
            message=payment.failure_reason,
            timestamp=datetime.utcnow(),
            raw_response=transaction_data
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        logger.warning(f"Payment marked as failed: {reference}")
    
    async def _activate_subscription(self, user_id: int, plan_id: int, payment_id: int) -> None:
        """Activate subscription after successful payment."""
        try:
            # Get plan details
            stmt = select(Plan).where(Plan.id == plan_id)
            result = await self.db.execute(stmt)
            plan = result.scalar_one_or_none()
            
            if not plan:
                logger.error(f"Plan not found: {plan_id}")
                return
            
            # Create or update subscription
            stmt = select(Subscription).where(Subscription.user_id == user_id)
            result = await self.db.execute(stmt)
            subscription = result.scalar_one_or_none()
            
            now = datetime.utcnow()
            
            # Calculate expiry based on plan period
            if plan.period == "annual":
                expiry_delta = timedelta(days=365)
            else:  # monthly or default
                expiry_delta = timedelta(days=30)
            
            if subscription:
                # Extend existing subscription
                if subscription.status == "active":
                    subscription.end_date = subscription.end_date + expiry_delta
                else:
                    subscription.start_date = now
                    subscription.end_date = now + expiry_delta
                    subscription.status = "active"
            else:
                # Create new subscription
                subscription = Subscription(
                    user_id=user_id,
                    plan_id=plan_id,
                    start_date=now,
                    end_date=now + expiry_delta,
                    status="active",
                    payment_method="mpesa",
                    last_payment_id=payment_id,
                    last_payment_status="success"
                )
                self.db.add(subscription)
            
            # Update last payment info
            subscription.last_payment_id = payment_id
            subscription.last_payment_status = "success"
            subscription.next_billing_date = subscription.end_date
            
            await self.db.commit()
            
            logger.info(f"Subscription activated: user_id={user_id}, plan_id={plan_id}, expires={subscription.end_date}")
            
        except Exception as e:
            logger.error(f"Subscription activation error: {str(e)}")
            raise
    
    async def _update_payment_from_verification(
        self,
        reference: str,
        transaction_data: Dict[str, Any]
    ) -> None:
        """Update payment record based on verification response."""
        stmt = select(PaystackPayment).where(PaystackPayment.reference == reference)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            return
        
        if transaction_data.get("status") == "success":
            payment.status = "success"
            payment.completed_at = datetime.utcnow()
            payment.payer_phone = transaction_data.get("customer", {}).get("phone")
            
            # Activate subscription if not already done
            if payment.plan_id and not payment.subscription_id:
                await self._activate_subscription(payment.user_id, payment.plan_id, payment.id)
        elif transaction_data.get("status") == "failed":
            payment.status = "failed"
            payment.failure_reason = transaction_data.get("gateway_response", "Unknown error")
        
        await self.db.commit()
    
    async def _log_payment_event(
        self,
        payment_id: int,
        event_type: str,
        message: str,
        request_data: Dict[str, Any],
        response_data: Dict[str, Any]
    ) -> None:
        """Log payment event for debugging."""
        log = PaystackLog(
            paystack_payment_id=payment_id,
            event_type=event_type,
            message=message,
            request_data=request_data,
            response_data=response_data
        )
        
        self.db.add(log)
        await self.db.commit()
    
    async def get_user_payment_status(self, user_id: int) -> Dict[str, Any]:
        """
        Get user's payment history and subscription status.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with payment history, current subscription, and account status
        """
        try:
            # Get recent payments
            stmt = select(PaystackPayment).where(
                PaystackPayment.user_id == user_id
            ).order_by(PaystackPayment.created_at.desc()).limit(10)
            result = await self.db.execute(stmt)
            payments = result.scalars().all()
            
            # Get current subscription
            from sqlalchemy import and_
            stmt = select(Subscription).where(
                and_(
                    Subscription.user_id == user_id,
                    Subscription.status == "active"
                )
            ).order_by(Subscription.created_at.desc()).limit(1)
            result = await self.db.execute(stmt)
            subscription = result.scalar_one_or_none()
            
            # Calculate account balance (paid subscriptions)
            total_paid = sum(p.amount for p in payments if p.status == "success")
            
            return {
                "user_id": user_id,
                "recent_payments": [
                    {
                        "id": p.id,
                        "reference": p.reference,
                        "amount": p.amount,
                        "status": p.status,
                        "payment_method": p.payment_method,
                        "created_at": p.created_at.isoformat(),
                        "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                    }
                    for p in payments
                ],
                "current_subscription": {
                    "id": subscription.id,
                    "plan_id": subscription.plan_id,
                    "status": subscription.status,
                    "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
                    "created_at": subscription.created_at.isoformat(),
                } if subscription else None,
                "account_balance": total_paid,
                "total_successful_payments": sum(1 for p in payments if p.status == "success"),
                "total_failed_payments": sum(1 for p in payments if p.status == "failed"),
            }
            
        except Exception as e:
            logger.error(f"Error fetching user payment status: {str(e)}")
            raise
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Paystack API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
