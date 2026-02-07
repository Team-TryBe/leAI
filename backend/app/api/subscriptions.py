"""
Subscription management API routes for plan upgrades, downgrades, and payment tracking.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import (
    User,
    Subscription,
    Plan,
    PlanType,
    SubscriptionStatus,
    Payment,
    PaymentStatus,
    Invoice,
)
from app.api.users import get_current_user

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


# ==================== Schemas ====================

class PlanResponse(BaseModel):
    id: int
    plan_type: str
    name: str
    price: int
    period: str
    description: Optional[str]
    features: List[str]
    max_applications: Optional[int]

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan_id: int
    status: str
    started_at: datetime
    current_period_start: datetime
    current_period_end: Optional[datetime]
    auto_renew: bool
    cancellation_requested: bool
    total_paid: int
    payment_method: Optional[str]
    plan: Optional[PlanResponse]

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    id: int
    amount: int
    currency: str
    status: str
    transaction_id: Optional[str]
    payment_method: Optional[str]
    paid_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    amount: int
    issued_at: datetime
    paid_at: Optional[datetime]
    payment_id: Optional[int]

    class Config:
        from_attributes = True


class UpgradePlanRequest(BaseModel):
    plan_id: str


class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None
    immediate: bool = False  # If true, cancel immediately; if false, at end of period


# ==================== Routes ====================

@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's current active subscription."""
    result = await db.execute(
        select(Subscription)
        .where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
        )
        .options(__import__("sqlalchemy.orm", fromlist=["joinedload"]).joinedload(Subscription.plan))
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    return subscription


@router.get("/plans", response_model=List[PlanResponse])
async def get_all_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all available subscription plans."""
    result = await db.execute(
        select(Plan).where(Plan.is_active == True).order_by(Plan.price)
    )
    plans = result.scalars().all()
    return plans


@router.post("/upgrade")
async def upgrade_plan(
    request: UpgradePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upgrade or change subscription plan."""
    # Get new plan
    result = await db.execute(select(Plan).where(Plan.plan_type == request.plan_id))
    new_plan = result.scalar_one_or_none()

    if not new_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    # Get current subscription
    result = await db.execute(
        select(Subscription).where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
        )
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        # Create new subscription if none exists
        subscription = Subscription(
            user_id=current_user.id,
            plan_id=new_plan.id,
            status=SubscriptionStatus.ACTIVE,
            started_at=datetime.utcnow(),
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30)
            if new_plan.period == "monthly"
            else datetime.utcnow() + timedelta(days=365),
        )
        db.add(subscription)
    else:
        # Update existing subscription
        subscription.plan_id = new_plan.id
        subscription.updated_at = datetime.utcnow()
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.cancellation_requested = False

        # Adjust billing dates based on plan period
        if new_plan.period == "monthly":
            subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        elif new_plan.period == "annual":
            subscription.current_period_end = datetime.utcnow() + timedelta(days=365)

    # Create payment record
    payment = Payment(
        subscription_id=subscription.id,
        amount=new_plan.price,
        currency="KES",
        status=PaymentStatus.PENDING,
        payment_method=getattr(current_user, "payment_method", None),
    )
    db.add(payment)

    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully upgraded to {new_plan.name}",
        "subscription": subscription,
    }


@router.post("/downgrade")
async def downgrade_plan(
    request: UpgradePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Downgrade subscription plan (changes take effect at end of current billing period)."""
    # Get new plan
    result = await db.execute(select(Plan).where(Plan.plan_type == request.plan_id))
    new_plan = result.scalar_one_or_none()

    if not new_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    # Get current subscription
    result = await db.execute(
        select(Subscription).where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
        )
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    # Downgrade takes effect at end of billing period
    subscription.plan_id = new_plan.id
    subscription.updated_at = datetime.utcnow()

    await db.commit()

    return {
        "status": "success",
        "message": f"Plan downgrade scheduled. Changes take effect on {subscription.current_period_end.strftime('%Y-%m-%d')}",
        "subscription": subscription,
    }


@router.post("/cancel")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel subscription (immediately or at end of billing period)."""
    result = await db.execute(
        select(Subscription).where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
        )
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    if request.immediate:
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.utcnow()
    else:
        subscription.cancellation_requested = True
        subscription.cancelled_at = subscription.current_period_end

    subscription.updated_at = datetime.utcnow()
    await db.commit()

    return {
        "status": "success",
        "message": "Subscription cancelled successfully",
        "subscription": subscription,
    }


@router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Get payment history for user's subscriptions."""
    # Get all subscriptions for user
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscriptions = result.scalars().all()
    subscription_ids = [s.id for s in subscriptions]

    if not subscription_ids:
        return []

    # Get payments for these subscriptions
    result = await db.execute(
        select(Payment)
        .where(Payment.subscription_id.in_(subscription_ids))
        .order_by(Payment.created_at.desc())
        .limit(limit)
    )
    payments = result.scalars().all()

    return payments


@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Get invoice history for user's subscriptions."""
    # Get all subscriptions for user
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscriptions = result.scalars().all()
    subscription_ids = [s.id for s in subscriptions]

    if not subscription_ids:
        return []

    # Get invoices for these subscriptions
    result = await db.execute(
        select(Invoice)
        .where(Invoice.subscription_id.in_(subscription_ids))
        .order_by(Invoice.issued_at.desc())
        .limit(limit)
    )
    invoices = result.scalars().all()

    return invoices


@router.post("/payments/confirm")
async def confirm_payment(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm payment from payment provider (M-Pesa, Stripe, etc)."""
    result = await db.execute(
        select(Payment).where(Payment.transaction_id == transaction_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    # Update payment status
    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.utcnow()

    # Update subscription total_paid
    subscription = payment.subscription
    subscription.total_paid += payment.amount
    subscription.updated_at = datetime.utcnow()

    # Create invoice
    invoice = Invoice(
        subscription_id=subscription.id,
        payment_id=payment.id,
        invoice_number=f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{payment.id}",
        amount=payment.amount,
        issued_at=datetime.utcnow(),
        paid_at=datetime.utcnow(),
    )
    db.add(invoice)

    await db.commit()

    return {
        "status": "success",
        "message": "Payment confirmed",
        "invoice_id": invoice.id,
    }
