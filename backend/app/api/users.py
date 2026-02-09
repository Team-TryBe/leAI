"""
User endpoints for profile management and account information.
"""

from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import (
    User,
    JobApplication,
    JobApplicationStatus,
    Subscription,
    SubscriptionStatus,
)
from app.schemas import UserResponse, ApiResponse, UserUpdate
from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload
from datetime import datetime


router = APIRouter(prefix="/users", tags=["users"])
settings = get_settings()


def get_token_from_header(request: Request) -> str:
    """Extract JWT token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication header",
        )
    return auth_header[7:]  # Remove "Bearer " prefix


def get_token_payload(token: str) -> dict:
    """Decode JWT token and return payload."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


def get_current_user_id(token: str) -> int:
    """Extract user ID from JWT token."""
    payload = get_token_payload(token)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return int(user_id)


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to get current authenticated user."""
    token = get_token_from_header(request)
    payload = get_token_payload(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    stmt = select(User).where(User.id == int(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Enforce read-only impersonation tokens for non-GET requests
    if payload.get("readonly") and request.method not in {"GET", "HEAD", "OPTIONS"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impersonation tokens are read-only. Action blocked.",
        )

    # Attach impersonation metadata for downstream use
    user.is_impersonating = bool(payload.get("impersonate"))
    user.impersonated_by = payload.get("admin_id")
    user.readonly_session = bool(payload.get("readonly"))
    return user


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's profile information."""
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
    )


@router.put("/me", response_model=ApiResponse[UserResponse])
async def update_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile information."""
    update_dict = update_data.model_dump(exclude_unset=True)

    for key, value in update_dict.items():
        if hasattr(current_user, key):
            setattr(current_user, key, value)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
    )


@router.get("/dashboard/stats", response_model=ApiResponse[dict])
async def get_user_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive dashboard statistics for the logged-in user."""

    # Total applications
    total_apps_stmt = select(func.count(JobApplication.id)).where(
        JobApplication.user_id == current_user.id
    )
    total_apps_result = await db.execute(total_apps_stmt)
    total_applications = total_apps_result.scalar()

    # Applications by status
    apps_by_status = {}
    for status_enum in JobApplicationStatus:
        status_stmt = select(func.count(JobApplication.id)).where(
            JobApplication.user_id == current_user.id,
            JobApplication.status == status_enum.value,
        )
        status_result = await db.execute(status_stmt)
        apps_by_status[status_enum.value] = status_result.scalar()

    # Recent applications (last 5)
    recent_stmt = (
        select(JobApplication)
        .where(JobApplication.user_id == current_user.id)
        .options(selectinload(JobApplication.extracted_data))
        .order_by(desc(JobApplication.created_at))
        .limit(5)
    )
    recent_result = await db.execute(recent_stmt)
    recent_applications = recent_result.scalars().all()

    recent_apps_data = []
    for app in recent_applications:
        recent_apps_data.append({
            "id": app.id,
            "company_name": app.extracted_data.company_name if app.extracted_data else None,
            "job_title": app.extracted_data.job_title if app.extracted_data else None,
            "location": app.extracted_data.location if app.extracted_data else None,
            "status": app.status.value if hasattr(app.status, "value") else app.status,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
            "job_description": app.extracted_data.job_description if app.extracted_data else None,
        })

    # Get current subscription
    subscription_stmt = (
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .options(selectinload(Subscription.plan))
    )
    subscription_result = await db.execute(subscription_stmt)
    subscription = subscription_result.scalar_one_or_none()

    subscription_data = None
    if subscription and subscription.plan:
        subscription_data = {
            "plan_id": subscription.plan_id,
            "plan_type": subscription.plan.plan_type.value
            if hasattr(subscription.plan.plan_type, "value")
            else subscription.plan.plan_type,
            "plan_name": subscription.plan.name,
            "status": subscription.status.value
            if hasattr(subscription.status, "value")
            else subscription.status,
            "current_period_end": subscription.current_period_end.isoformat()
            if subscription.current_period_end
            else None,
            "auto_renew": subscription.auto_renew,
            "max_applications": subscription.plan.max_applications,
        }

    # Applications this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_apps_stmt = select(func.count(JobApplication.id)).where(
        JobApplication.user_id == current_user.id,
        JobApplication.created_at >= start_of_month,
    )
    month_apps_result = await db.execute(month_apps_stmt)
    applications_this_month = month_apps_result.scalar()

    # Success rate (sent / total)
    sent_apps_stmt = select(func.count(JobApplication.id)).where(
        JobApplication.user_id == current_user.id,
        JobApplication.status == JobApplicationStatus.SENT.value,
    )
    sent_apps_result = await db.execute(sent_apps_stmt)
    sent_applications = sent_apps_result.scalar()
    success_rate = round((sent_applications / max(total_applications, 1)) * 100, 1)

    return ApiResponse(
        success=True,
        data={
            "user": {
                "id": current_user.id,
                "full_name": current_user.full_name,
                "email": current_user.email,
            },
            "applications": {
                "total": total_applications,
                "by_status": apps_by_status,
                "this_month": applications_this_month,
                "success_rate": success_rate,
                "recent": recent_apps_data,
            },
            "subscription": subscription_data,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
