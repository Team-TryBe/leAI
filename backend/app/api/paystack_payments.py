"""
Paystack payment API endpoints for payment processing and webhooks.

Endpoints:
- POST /payments/initiate - Start a new payment
- GET /payments/verify/{reference} - Check payment status
- POST /payments/webhook - Receive Paystack webhook events
- GET /payments/status - Get user's payment status
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.api.users import get_current_user
from app.db.models import User, PaystackPayment
from app.services.paystack_service import PaystackService, PaystackError, WebhookVerificationError
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class PaymentInitiateRequest:
    """Schema for payment initiation."""
    email: str
    plan_id: int
    amount: int  # In KES cents (9900 = 99.00)
    payment_method: str = "mpesa"  # mpesa, card, bank_transfer
    phone: Optional[str] = None  # For M-Pesa


class PaymentResponse:
    """Standard payment response."""
    success: bool
    data: dict
    message: Optional[str] = None


# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================

@router.post("/initiate")
async def initiate_payment(
    email: str,
    plan_id: int,
    amount: int,
    payment_method: str = "mpesa",
    phone: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a payment via Paystack.
    
    Args:
        email: Customer email for receipt
        plan_id: Subscription plan ID
        amount: Payment amount in KES cents (9900 = 99.00)
        payment_method: 'mpesa', 'card', or 'bank_transfer'
        phone: Phone number for M-Pesa reference
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Payment initialization details with Paystack checkout URL
    
    Raises:
        HTTPException: For invalid input or service errors
    """
    try:
        # Validate inputs
        if amount <= 0:
            raise ValueError("Amount must be greater than 0")
        if not email:
            raise ValueError("Email is required")
        
        logger.info(
            f"Initiating payment for user {current_user.id}: "
            f"plan_id={plan_id}, amount={amount}, method={payment_method}"
        )
        
        # Initialize payment
        service = PaystackService(db)
        result = await service.initialize_payment(
            user_id=current_user.id,
            email=email,
            amount=amount,
            plan_id=plan_id,
            payment_method=payment_method,
            payer_phone=phone
        )
        
        logger.info(
            f"Payment initiated successfully for user {current_user.id}: "
            f"reference={result.get('reference')}"
        )
        
        return {
            "success": True,
            "data": result,
            "message": "Payment initialized successfully"
        }
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except PaystackError as e:
        logger.error(f"Paystack error during initialization: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment service error: {str(e)}")
    
    except Exception as e:
        logger.error(f"Unexpected error during payment initialization: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/verify/{reference}")
async def verify_payment(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify payment status using Paystack reference.
    
    Args:
        reference: Paystack payment reference (e.g., 'pslv_xxxxx')
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Current payment status and details
    
    Raises:
        HTTPException: If payment not found or verification fails
    """
    try:
        if not reference:
            raise ValueError("Payment reference is required")
        
        logger.info(f"Verifying payment: reference={reference}, user={current_user.id}")
        
        service = PaystackService(db)
        result = await service.verify_payment(reference)
        
        # Security: Only allow users to check their own payments
        if result.get("user_id") != current_user.id:
            logger.warning(
                f"Unauthorized payment verification attempt: "
                f"user={current_user.id}, payment_user={result.get('user_id')}"
            )
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"Payment verified: reference={reference}, status={result.get('status')}")
        
        return {
            "success": True,
            "data": result,
            "message": "Payment verified"
        }
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to verify payment")


@router.get("/status")
async def get_payment_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's current payment and subscription status.
    
    Args:
        current_user: Authenticated user
        db: Database session
    
    Returns:
        User's payment history and current subscription status
    """
    try:
        logger.info(f"Fetching payment status for user {current_user.id}")
        
        service = PaystackService(db)
        result = await service.get_user_payment_status(current_user.id)
        
        return {
            "success": True,
            "data": result,
            "message": "Payment status retrieved"
        }
        
    except Exception as e:
        logger.error(f"Error fetching payment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch payment status")


# ============================================================================
# WEBHOOK ENDPOINT
# ============================================================================

@router.post("/webhook")
async def handle_webhook(
    request: Request,
    x_paystack_signature: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Paystack webhook events.
    
    IMPORTANT: This endpoint must be HTTPS in production.
    Paystack only sends webhooks to HTTPS URLs.
    
    Webhook Security:
    - Verifies HMAC-SHA512 signature from Paystack
    - Processes events: charge.success, charge.failed
    - Handles idempotency (ignores duplicate events)
    - Logs all events for audit trail
    
    Args:
        request: FastAPI request object
        x_paystack_signature: Webhook signature from Paystack header
        db: Database session
    
    Returns:
        200 OK for successful event receipt
    
    Raises:
        HTTPException: If signature verification fails
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_paystack_signature:
            logger.warning("Webhook received without signature header")
            raise HTTPException(status_code=401, detail="Missing signature")
        
        # Parse event data
        try:
            event_data = json.loads(body.decode())
        except json.JSONDecodeError:
            logger.error("Invalid JSON in webhook body")
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        logger.info(
            f"Webhook received: event={event_data.get('event')}, "
            f"reference={event_data.get('data', {}).get('reference')}"
        )
        
        # Verify webhook signature
        service = PaystackService(db)
        try:
            is_valid = service.verify_webhook_signature(x_paystack_signature, body)
        except WebhookVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        if not is_valid:
            logger.warning("Webhook signature verification failed (mismatch)")
            raise HTTPException(status_code=401, detail="Signature mismatch")
        
        # Process webhook event
        try:
            await service.handle_webhook(event_data)
            
            logger.info(
                f"Webhook processed successfully: event={event_data.get('event')}"
            )
            
            # Return 200 OK to acknowledge receipt
            return {"success": True, "message": "Webhook processed"}
            
        except Exception as e:
            logger.error(f"Error processing webhook event: {str(e)}")
            # Still return 200 to prevent Paystack retries
            # Event is logged and can be manually reviewed
            return {"success": False, "message": "Event logged for review"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in webhook handler: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# ADMIN/DEBUG ENDPOINTS (Development only)
# ============================================================================

@router.get("/debug/list")
async def debug_list_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    DEBUG ONLY: List all payments for authenticated user.
    
    WARNING: This endpoint should be restricted to admin users in production.
    """
    if not settings.DEBUG:
        raise HTTPException(status_code=403, detail="Debug endpoint not available in production")
    
    try:
        from sqlalchemy import select
        
        result = await db.execute(
            select(PaystackPayment).filter(PaystackPayment.user_id == current_user.id)
        )
        payments = result.scalars().all()
        
        return {
            "success": True,
            "data": [
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
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch payments")


# ============================================================================
# ROUTE METADATA
# ============================================================================

"""
Payment API Routes:

1. POST /api/v1/payments/initiate
   - Start a new payment
   - Requires: email, plan_id, amount
   - Returns: authorization_url, reference, access_code, payment_id
   - Authentication: JWT token required

2. GET /api/v1/payments/verify/{reference}
   - Check payment status
   - Requires: reference (Paystack reference)
   - Returns: status, amount, transaction_id, message
   - Authentication: JWT token required
   - Note: User can only check their own payments

3. GET /api/v1/payments/status
   - Get user's payment history and subscription status
   - No additional parameters
   - Returns: recent_payments, current_subscription, account_balance
   - Authentication: JWT token required

4. POST /api/v1/payments/webhook
   - Receive Paystack webhook events
   - Webhook URL: https://your-domain.com/api/v1/payments/webhook
   - Header: x-paystack-signature (HMAC-SHA512)
   - Events: charge.success, charge.failed
   - No authentication required (signature verified instead)

5. GET /api/v1/payments/debug/list (DEBUG ONLY)
   - List all payments for user
   - Only available if DEBUG=true
   - Use for testing/debugging only

Error Responses:
- 400: Invalid input or validation error
- 401: Unauthorized (auth required or invalid signature)
- 403: Forbidden (user trying to access other user's payment)
- 500: Server error

Example Usage:

# Initiate payment
curl -X POST http://localhost:8000/api/v1/payments/initiate \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "plan_id": 2,
    "amount": 9900,
    "payment_method": "mpesa",
    "phone": "07xxxxxxxx"
  }'

# Verify payment
curl -X GET http://localhost:8000/api/v1/payments/verify/pslv_xxxxx \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get payment status
curl -X GET http://localhost:8000/api/v1/payments/status \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
"""
