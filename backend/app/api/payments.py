"""
M-Pesa Payment API Routes.
Handles payment initiation, callbacks, and status checking.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.db.database import get_db
from app.db.models import User, Transaction, TransactionStatus, Subscription, SubscriptionStatus, Plan, PlanType
from app.api.users import get_current_user
from app.services.mpesa_service import mpesa_service
from app.schemas import ApiResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


# ==================== Request/Response Schemas ====================

class InitiatePaymentRequest(BaseModel):
    """Request to initiate M-Pesa payment."""
    phone: str = Field(..., description="Kenyan phone number (254XXXXXXXXX or 07XXXXXXXX)")
    amount: int = Field(..., gt=0, description="Amount in KES")
    plan_type: str = Field(..., description="Plan type: 'paygo', 'pro_monthly', 'pro_annual'")

    @field_validator("phone")
    def validate_phone(cls, v):
        """Validate Kenyan phone number format."""
        # Remove whitespace
        v = v.strip().replace(" ", "").replace("-", "")
        
        # Check if it starts with valid prefixes
        if not (v.startswith("254") or v.startswith("07") or v.startswith("01") or v.startswith("7") or v.startswith("1")):
            raise ValueError("Phone number must be a valid Kenyan number (07XX or 254XXX)")
        
        return v


class PaymentStatusResponse(BaseModel):
    """Response for payment status check."""
    transaction_id: int
    status: str
    amount: int
    phone_number: str
    mpesa_receipt: Optional[str]
    result_desc: Optional[str]


class CallbackAcknowledgement(BaseModel):
    """Standard Safaricom callback acknowledgement."""
    ResultCode: int = 0
    ResultDesc: str = "Success"


# ==================== Payment Routes ====================

@router.post("/initiate", response_model=ApiResponse[dict])
async def initiate_payment(
    payment_request: InitiatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate M-Pesa STK Push payment.
    Sends payment request to user's phone for PIN entry.
    """
    try:
        # Validate amount based on plan type
        plan_amounts = {
            "paygo": 50,
            "pro_monthly": 1999,
            "pro_annual": 19990,
        }

        expected_amount = plan_amounts.get(payment_request.plan_type)
        if not expected_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {payment_request.plan_type}",
            )

        if payment_request.amount != expected_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount mismatch. Expected KES {expected_amount} for {payment_request.plan_type}",
            )

        # Prepare payment description
        plan_names = {
            "paygo": "Pay-As-You-Go (1 Application)",
            "pro_monthly": "Pro Monthly Subscription",
            "pro_annual": "Pro Annual Subscription",
        }
        description = f"Aditus {plan_names[payment_request.plan_type]}"

        # Initiate STK Push
        result = await mpesa_service.initiate_stk_push(
            phone=payment_request.phone,
            amount=payment_request.amount,
            account_ref=payment_request.plan_type,
            description=description,
            db=db,
            user=current_user,
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Payment request sent successfully. Please check your phone.",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Payment initiation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment initiation failed: {str(e)}",
        )


@router.post("/callback")
async def mpesa_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    M-Pesa callback endpoint (called by Safaricom).
    This endpoint must be publicly accessible.
    
    IMPORTANT: Set your callback URL in environment:
    DARAJA_CALLBACK_URL=https://your-domain.com/api/v1/payments/callback
    
    For local testing, use ngrok: ngrok http 8000
    """
    try:
        # Parse callback data
        callback_data = await request.json()
        logger.info(f"📥 Received M-Pesa callback: {callback_data}")

        # Process callback
        result = await mpesa_service.process_callback(callback_data, db)

        # If payment successful, unlock feature for user
        if result.get("success") and result.get("status") == "completed":
            transaction_id = result.get("transaction_id")
            
            # Get transaction
            stmt = select(Transaction).where(Transaction.id == transaction_id)
            trans_result = await db.execute(stmt)
            transaction = trans_result.scalar_one_or_none()

            if transaction:
                # Handle different plan types
                account_ref = transaction.account_reference

                if account_ref == "paygo":
                    user_stmt = select(User).where(User.id == transaction.user_id)
                    user_result = await db.execute(user_stmt)
                    user = user_result.scalar_one_or_none()
                    if user:
                        user.paygo_credits = (user.paygo_credits or 0) + 1
                        logger.info(f"✅ User {transaction.user_id} purchased 1 application credit")
                        await db.commit()
                    
                elif account_ref in ["pro_monthly", "pro_annual"]:
                    plan_type = PlanType.PRO_MONTHLY if account_ref == "pro_monthly" else PlanType.PRO_ANNUAL
                    plan_stmt = select(Plan).where(Plan.plan_type == plan_type)
                    plan_result = await db.execute(plan_stmt)
                    plan = plan_result.scalar_one_or_none()

                    if plan:
                        sub_stmt = select(Subscription).where(
                            Subscription.user_id == transaction.user_id
                        )
                        sub_result = await db.execute(sub_stmt)
                        subscription = sub_result.scalar_one_or_none()

                        now = datetime.utcnow()
                        period_days = 30 if plan_type == PlanType.PRO_MONTHLY else 365
                        period_end = now + timedelta(days=period_days)

                        if subscription:
                            subscription.plan_id = plan.id
                            subscription.status = SubscriptionStatus.ACTIVE
                            subscription.current_period_start = now
                            subscription.current_period_end = period_end
                            subscription.total_paid += transaction.amount
                            subscription.payment_method = "m-pesa"
                        else:
                            subscription = Subscription(
                                user_id=transaction.user_id,
                                plan_id=plan.id,
                                status=SubscriptionStatus.ACTIVE,
                                current_period_start=now,
                                current_period_end=period_end,
                                total_paid=transaction.amount,
                                payment_method="m-pesa",
                            )
                            db.add(subscription)

                        logger.info(f"✅ Activated subscription for user {transaction.user_id}")
                        await db.commit()

        # Always return success to Safaricom
        return CallbackAcknowledgement(
            ResultCode=0,
            ResultDesc="Callback processed successfully",
        )

    except Exception as e:
        logger.error(f"❌ Callback processing error: {str(e)}")
        # Still return success to avoid Safaricom retries
        return CallbackAcknowledgement(
            ResultCode=0,
            ResultDesc="Acknowledged",
        )


@router.get("/status/{checkout_request_id}", response_model=ApiResponse[PaymentStatusResponse])
async def check_payment_status(
    checkout_request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check payment status by checkout_request_id.
    Used for polling from frontend to detect when payment completes.
    """
    try:
        transaction_data = await mpesa_service.check_transaction_status(
            checkout_request_id, db
        )

        if not transaction_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )

        # Verify transaction belongs to current user
        stmt = select(Transaction).where(
            Transaction.checkout_request_id == checkout_request_id
        )
        result = await db.execute(stmt)
        transaction = result.scalar_one_or_none()

        if transaction and transaction.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        return ApiResponse(
            success=True,
            data=PaymentStatusResponse(**transaction_data),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Status check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check payment status",
        )


@router.get("/history", response_model=ApiResponse[list])
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 10,
):
    """
    Get user's payment transaction history.
    """
    try:
        stmt = (
            select(Transaction)
            .where(Transaction.user_id == current_user.id)
            .order_by(Transaction.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        transactions = result.scalars().all()

        history = []
        for trans in transactions:
            history.append({
                "id": trans.id,
                "amount": trans.amount,
                "phone_number": trans.phone_number,
                "account_reference": trans.account_reference,
                "status": trans.status.value,
                "mpesa_receipt": trans.mpesa_receipt_number,
                "result_desc": trans.result_desc,
                "created_at": trans.created_at.isoformat(),
                "completed_at": trans.completed_at.isoformat() if trans.completed_at else None,
            })

        return ApiResponse(
            success=True,
            data=history,
        )

    except Exception as e:
        logger.error(f"❌ Failed to fetch payment history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch payment history",
        )
