"""
Admin endpoints for user management, analytics, and system administration.
Only accessible to users with admin privileges.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.admin import get_current_admin_user, get_current_support_admin, get_current_finance_admin
from app.db.database import get_db
from app.db.models import (
    User,
    UserRole,
    JobApplication,
    JobApplicationStatus,
    Subscription,
    SubscriptionStatus,
    Plan,
    PlanType,
    Payment,
    PaymentStatus,
    Transaction,
    TransactionStatus,
    AdminActionLog,
)
from app.core.rbac import mask_sensitive_data
from app.schemas import ApiResponse, UserResponse
from app.api.auth import create_access_token


router = APIRouter(prefix="/admin", tags=["admin"])


class AdminUpdateSubscriptionRequest(BaseModel):
    action: Optional[str] = None  # 'cancel', 'extend', 'assign'
    plan_type: Optional[PlanType] = None
    plan_id: Optional[int] = None
    days: Optional[int] = None
    status: Optional[SubscriptionStatus] = None
    auto_renew: Optional[bool] = None


class AdminUpdateUserRoleRequest(BaseModel):
    new_role: UserRole
    reason: str


class CreditAdjustmentRequest(BaseModel):
    user_id: int
    reason: str
    amount: int = 1  # Always add 1 credit by default


class ImpersonationResponse(BaseModel):
    token: str
    user_id: int
    email: str
    full_name: str


async def log_admin_action(
    db: AsyncSession,
    admin_user: User,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None,
):
    """Persist a critical admin action for auditability."""
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None
    log = AdminActionLog(
        admin_user_id=admin_user.id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)


# ==================== Dashboard Analytics ====================

@router.get("/stats/overview", response_model=ApiResponse[dict])
async def get_admin_overview_stats(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive dashboard statistics for admin overview."""
    
    # Total users count
    total_users_stmt = select(func.count(User.id))
    total_users_result = await db.execute(total_users_stmt)
    total_users = total_users_result.scalar()
    
    # Active users (logged in last 30 days - based on updated_at)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users_stmt = select(func.count(User.id)).where(
        and_(User.updated_at >= thirty_days_ago, User.is_active == True)
    )
    active_users_result = await db.execute(active_users_stmt)
    active_users = active_users_result.scalar()
    
    # New users (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    new_users_stmt = select(func.count(User.id)).where(User.created_at >= seven_days_ago)
    new_users_result = await db.execute(new_users_stmt)
    new_users = new_users_result.scalar()
    
    # Total job applications
    total_apps_stmt = select(func.count(JobApplication.id))
    total_apps_result = await db.execute(total_apps_stmt)
    total_applications = total_apps_result.scalar()
    
    # Applications by status
    apps_by_status = {}
    for status_enum in JobApplicationStatus:
        status_stmt = select(func.count(JobApplication.id)).where(
            JobApplication.status == status_enum.value
        )
        status_result = await db.execute(status_stmt)
        apps_by_status[status_enum.value] = status_result.scalar()
    
    # Recent applications (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_apps_stmt = select(func.count(JobApplication.id)).where(
        JobApplication.created_at >= yesterday
    )
    recent_apps_result = await db.execute(recent_apps_stmt)
    recent_applications = recent_apps_result.scalar()
    
    return ApiResponse(
        success=True,
        data={
            "users": {
                "total": total_users,
                "active": active_users,
                "new_this_week": new_users,
                "growth_rate": round((new_users / max(total_users - new_users, 1)) * 100, 2),
            },
            "applications": {
                "total": total_applications,
                "recent_24h": recent_applications,
                "by_status": apps_by_status,
            },
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@router.get("/stats/growth", response_model=ApiResponse[dict])
async def get_growth_analytics(
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze"),
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user and application growth analytics over time."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Users growth by day
    users_stmt = select(
        func.date(User.created_at).label('date'),
        func.count(User.id).label('count')
    ).where(User.created_at >= start_date).group_by(func.date(User.created_at)).order_by(func.date(User.created_at))
    
    users_result = await db.execute(users_stmt)
    users_growth = [{"date": str(row.date), "count": row.count} for row in users_result]
    
    # Applications growth by day
    apps_stmt = select(
        func.date(JobApplication.created_at).label('date'),
        func.count(JobApplication.id).label('count')
    ).where(JobApplication.created_at >= start_date).group_by(func.date(JobApplication.created_at)).order_by(func.date(JobApplication.created_at))
    
    apps_result = await db.execute(apps_stmt)
    apps_growth = [{"date": str(row.date), "count": row.count} for row in apps_result]
    
    return ApiResponse(
        success=True,
        data={
            "period_days": days,
            "users_growth": users_growth,
            "applications_growth": apps_growth,
        },
    )


# ==================== User Management ====================

@router.get("/users", response_model=ApiResponse[dict])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name or email"),
    admin_only: Optional[bool] = Query(None, description="Filter admin users"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated list of all users with filters."""
    
    # Build query with filters
    stmt = select(User)
    
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
    
    if admin_only is not None:
        staff_roles = [
            UserRole.SUPER_ADMIN,
            UserRole.SUPPORT_AGENT,
            UserRole.FINANCE_ADMIN,
            UserRole.CONTENT_MANAGER,
            UserRole.COMPLIANCE_OFFICER,
        ]
        if admin_only:
            stmt = stmt.where(or_(User.is_admin == True, User.role.in_(staff_roles)))
        else:
            stmt = stmt.where(and_(User.is_admin == False, ~User.role.in_(staff_roles)))
    
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Get paginated results
    stmt = stmt.order_by(desc(User.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()

    # Fetch subscriptions for users in one query
    user_ids = [user.id for user in users]
    subscriptions_by_user_id = {}
    if user_ids:
        subs_result = await db.execute(
            select(Subscription)
            .where(Subscription.user_id.in_(user_ids))
            .options(selectinload(Subscription.plan))
        )
        subscriptions = subs_result.scalars().all()
        subscriptions_by_user_id = {sub.user_id: sub for sub in subscriptions}

    users_data = []
    for user in users:
        user_data = UserResponse.model_validate(user).model_dump()
        user_data["role"] = user.role.value if hasattr(user.role, "value") else str(user.role)
        user_data["last_login_at"] = user.last_login_at.isoformat() if user.last_login_at else None
        user_data["last_login_ip"] = user.last_login_ip
        subscription = subscriptions_by_user_id.get(user.id)
        user_data["subscription"] = None
        if subscription and subscription.plan:
            user_data["subscription"] = {
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
            }
        users_data.append(user_data)
    
    return ApiResponse(
        success=True,
        data={
            "users": users_data,
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    )


@router.get("/users/lookup", response_model=ApiResponse[dict])
async def lookup_users(
    query: str = Query(..., min_length=2, description="Search by email or phone"),
    limit: int = Query(10, ge=1, le=50),
    admin_user: User = Depends(get_current_support_admin),
    db: AsyncSession = Depends(get_db),
):
    """User lookup for support: search by email or phone."""
    search_pattern = f"%{query}%"
    stmt = (
        select(User)
        .where(
            or_(
                User.email.ilike(search_pattern),
                User.phone.ilike(search_pattern)
            )
        )
        .order_by(desc(User.updated_at))
        .limit(limit)
    )

    result = await db.execute(stmt)
    users = result.scalars().all()

    users_data = []
    for user in users:
        user_data = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
            "paygo_credits": user.paygo_credits,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
        users_data.append(mask_sensitive_data(user_data, admin_user.role))

    return ApiResponse(
        success=True,
        data={"users": users_data, "count": len(users_data)},
    )


@router.post("/users/credit", response_model=ApiResponse[dict])
async def adjust_user_credits(
    request_data: CreditAdjustmentRequest,
    http_request: Request,
    admin_user: User = Depends(get_current_support_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manually add credits to a user (support tool)."""
    if request_data.amount < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credit amount must be at least 1",
        )

    result = await db.execute(select(User).where(User.id == request_data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.paygo_credits = (user.paygo_credits or 0) + request_data.amount
    await log_admin_action(
        db=db,
        admin_user=admin_user,
        action="manual_credit",
        target_type="user",
        target_id=user.id,
        details={
            "amount": request_data.amount,
            "reason": request_data.reason,
        },
        request=http_request,
    )
    await db.commit()

    return ApiResponse(
        success=True,
        data={
            "user_id": user.id,
            "email": user.email,
            "new_credits": user.paygo_credits,
        },
        message="Credits added successfully",
    )


@router.post("/users/{user_id}/impersonate", response_model=ApiResponse[ImpersonationResponse])
async def impersonate_user(
    user_id: int,
    http_request: Request,
    admin_user: User = Depends(get_current_support_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a read-only impersonation token (Ghost Mode).
    This is strictly logged and blocks any write actions.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    token = create_access_token(
        data={
            "sub": str(target_user.id),
            "email": target_user.email,
            "role": target_user.role.value if hasattr(target_user.role, "value") else str(target_user.role),
            "impersonate": True,
            "readonly": True,
            "admin_id": admin_user.id,
        }
    )

    await log_admin_action(
        db=db,
        admin_user=admin_user,
        action="impersonate_user",
        target_type="user",
        target_id=target_user.id,
        details={"reason": "support_debug"},
        request=http_request,
    )
    await db.commit()

    return ApiResponse(
        success=True,
        data=ImpersonationResponse(
            token=token,
            user_id=target_user.id,
            email=target_user.email,
            full_name=target_user.full_name,
        ),
    )


@router.patch("/users/{user_id}/subscription", response_model=ApiResponse[dict])
async def update_user_subscription(
    user_id: int,
    request: AdminUpdateSubscriptionRequest,
    http_request: Request,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: update a user's subscription plan or status."""

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Get current subscription
    sub_result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .options(selectinload(Subscription.plan))
    )
    subscription = sub_result.scalar_one_or_none()

    now = datetime.utcnow()
    action = request.action or 'update'

    # Handle action-based requests
    if action == 'cancel':
        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription to cancel")
        
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancellation_requested = True
        subscription.auto_renew = False
        subscription.updated_at = now

        await log_admin_action(
            db=db, admin_user=admin_user, action="cancel_subscription",
            target_type="user", target_id=user_id,
            details={"plan": subscription.plan.name if subscription.plan else None},
            request=http_request,
        )

    elif action == 'extend':
        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription to extend")
        
        days = request.days or 30
        if subscription.current_period_end:
            subscription.current_period_end = subscription.current_period_end + timedelta(days=days)
        else:
            subscription.current_period_end = now + timedelta(days=days)
        
        subscription.updated_at = now

        await log_admin_action(
            db=db, admin_user=admin_user, action="extend_subscription",
            target_type="user", target_id=user_id,
            details={"days": days, "new_end": subscription.current_period_end.isoformat()},
            request=http_request,
        )

    elif action == 'assign':
        # Get plan by ID or type
        plan = None
        if request.plan_id:
            plan_result = await db.execute(select(Plan).where(Plan.id == request.plan_id))
            plan = plan_result.scalar_one_or_none()
        elif request.plan_type:
            plan_result = await db.execute(select(Plan).where(Plan.plan_type == request.plan_type))
            plan = plan_result.scalar_one_or_none()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")

        if not subscription:
            subscription = Subscription(
                user_id=user_id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                started_at=now,
                current_period_start=now,
                current_period_end=now + timedelta(days=30) if plan.period == "monthly" else (now + timedelta(days=365) if plan.period == "annual" else None),
                auto_renew=True,
            )
            db.add(subscription)
        else:
            subscription.plan_id = plan.id
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.updated_at = now

        await log_admin_action(
            db=db, admin_user=admin_user, action="assign_subscription",
            target_type="user", target_id=user_id,
            details={"plan": plan.name},
            request=http_request,
        )

    else:
        # Legacy update flow
        if not request.plan_type:
            raise HTTPException(status_code=400, detail="plan_type is required for update action")

        plan_result = await db.execute(select(Plan).where(Plan.plan_type == request.plan_type))
        plan = plan_result.scalar_one_or_none()

        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")

        previous_plan_type = (
            subscription.plan.plan_type.value if subscription and subscription.plan and hasattr(subscription.plan.plan_type, "value")
            else (subscription.plan.plan_type if subscription and subscription.plan else None)
        )

        if not subscription:
            subscription = Subscription(
                user_id=user_id,
                plan_id=plan.id,
                status=request.status or SubscriptionStatus.ACTIVE,
                started_at=now,
                current_period_start=now,
                current_period_end=now + timedelta(days=30) if plan.period == "monthly" else (now + timedelta(days=365) if plan.period == "annual" else None),
                auto_renew=True if request.auto_renew is None else request.auto_renew,
            )
            db.add(subscription)
        else:
            subscription.plan_id = plan.id
            if request.status is not None:
                subscription.status = request.status
            if request.auto_renew is not None:
                subscription.auto_renew = request.auto_renew
            subscription.updated_at = now
            subscription.cancellation_requested = False

        await log_admin_action(
            db=db, admin_user=admin_user, action="update_subscription",
            target_type="user", target_id=user_id,
            details={
                "previous_plan": previous_plan_type,
                "new_plan": plan.plan_type.value if hasattr(plan.plan_type, "value") else plan.plan_type,
            },
            request=http_request,
        )

    await db.commit()
    await db.refresh(subscription)

    return ApiResponse(
        success=True,
        data={
            "user_id": user_id,
            "subscription": {
                "plan_id": subscription.plan_id,
                "plan_type": subscription.plan.plan_type.value if hasattr(subscription.plan.plan_type, "value") else subscription.plan.plan_type,
                "plan_name": subscription.plan.name,
                "status": subscription.status.value if hasattr(subscription.status, "value") else subscription.status,
                "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
                "auto_renew": subscription.auto_renew,
            },
        },
    )


@router.get("/users/{user_id}", response_model=ApiResponse[dict])
async def get_user_details(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a specific user."""
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Get user's application statistics
    apps_stmt = select(
        func.count(JobApplication.id).label('total'),
        JobApplication.status
    ).where(JobApplication.user_id == user_id).group_by(JobApplication.status)
    
    apps_result = await db.execute(apps_stmt)
    apps_stats = {row.status: row.total for row in apps_result}
    
    # Get total applications count
    total_apps_stmt = select(func.count(JobApplication.id)).where(JobApplication.user_id == user_id)
    total_apps_result = await db.execute(total_apps_stmt)
    total_apps = total_apps_result.scalar()
    
    return ApiResponse(
        success=True,
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "statistics": {
                "total_applications": total_apps,
                "applications_by_status": apps_stats,
            },
        },
    )


@router.patch("/users/{user_id}/admin-status", response_model=ApiResponse[UserResponse])
async def toggle_admin_status(
    user_id: int,
    make_admin: bool,
    http_request: Request,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle admin status for a user. Super admin feature."""
    
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own admin status",
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    previous_is_admin = user.is_admin
    user.is_admin = make_admin
    db.add(user)
    await log_admin_action(
        db=db,
        admin_user=admin_user,
        action="toggle_admin_status",
        target_type="user",
        target_id=user.id,
        details={
            "previous_is_admin": previous_is_admin,
            "new_is_admin": make_admin,
            "user_email": user.email,
        },
        request=http_request,
    )
    await db.commit()
    await db.refresh(user)
    
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
    )


@router.patch("/users/{user_id}/role", response_model=ApiResponse[UserResponse])
async def update_user_role(
    user_id: int,
    request_data: AdminUpdateUserRoleRequest,
    http_request: Request,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's RBAC role (Super Admin only, MFA required)."""

    if admin_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )

    if not admin_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA must be enabled for Super Admin access",
        )

    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own role",
        )

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    old_role = user.role
    user.role = request_data.new_role
    user.updated_at = datetime.utcnow()

    staff_roles = {
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
        UserRole.FINANCE_ADMIN,
        UserRole.CONTENT_MANAGER,
        UserRole.COMPLIANCE_OFFICER,
    }
    user.is_admin = user.role in staff_roles

    db.add(user)
    await log_admin_action(
        db=db,
        admin_user=admin_user,
        action="update_user_role",
        target_type="user",
        target_id=user.id,
        details={
            "old_role": old_role.value if hasattr(old_role, "value") else str(old_role),
            "new_role": request_data.new_role.value if hasattr(request_data.new_role, "value") else str(request_data.new_role),
            "reason": request_data.reason,
            "user_email": user.email,
        },
        request=http_request,
    )
    await db.commit()
    await db.refresh(user)

    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
        message="User role updated successfully",
    )


@router.patch("/users/{user_id}/active-status", response_model=ApiResponse[UserResponse])
async def toggle_active_status(
    user_id: int,
    is_active: bool,
    http_request: Request,
    reason: Optional[str] = Query(None, description="Reason for status change"),
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate a user account."""

    if not reason or not reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason is required",
        )
    
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own account status",
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    previous_is_active = user.is_active
    user.is_active = is_active
    db.add(user)
    await log_admin_action(
        db=db,
        admin_user=admin_user,
        action="toggle_active_status",
        target_type="user",
        target_id=user.id,
        details={
            "previous_is_active": previous_is_active,
            "new_is_active": is_active,
            "reason": reason,
            "user_email": user.email,
        },
        request=http_request,
    )
    await db.commit()
    await db.refresh(user)
    
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
    )


@router.delete("/users/{user_id}", response_model=ApiResponse[dict])
async def delete_user(
    user_id: int,
    http_request: Request,
    reason: Optional[str] = Query(None, description="Reason for deletion"),
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a user and all associated data."""

    if not reason or not reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason is required",
        )
    
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    await db.delete(user)
    await log_admin_action(
        db=db,
        admin_user=admin_user,
        action="delete_user",
        target_type="user",
        target_id=user.id,
        details={
            "reason": reason,
            "user_email": user.email,
        },
        request=http_request,
    )
    await db.commit()
    
    return ApiResponse(
        success=True,
        data={"message": f"User {user.email} deleted successfully"},
    )


# ==================== Application Management ====================

@router.get("/applications", response_model=ApiResponse[dict])
async def get_all_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[JobApplicationStatus] = Query(None, description="Filter by status"),
    user_id: Optional[int] = Query(None, description="Filter by user"),
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated list of all job applications with filters."""
    
    stmt = select(JobApplication).options(
        selectinload(JobApplication.extracted_data),
        selectinload(JobApplication.user)
    )
    
    if status:
        stmt = stmt.where(JobApplication.status == status.value)
    
    if user_id:
        stmt = stmt.where(JobApplication.user_id == user_id)
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Get paginated results
    stmt = stmt.order_by(desc(JobApplication.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    applications = result.scalars().all()
    
    # Convert to dict (you may want to create an ApplicationResponse schema)
    apps_data = []
    for app in applications:
        apps_data.append({
            "id": app.id,
            "user_id": app.user_id,
                "user_email": app.user.email if app.user else None,
                "user_full_name": app.user.full_name if app.user else None,
            "job_url": app.job_url,
            "status": app.status.value if hasattr(app.status, 'value') else app.status,
            "company_name": app.extracted_data.company_name if app.extracted_data else None,
            "job_title": app.extracted_data.job_title if app.extracted_data else None,
                "location": app.extracted_data.location if app.extracted_data else None,
                "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
                "cv_pdf_path": app.tailored_cv_pdf_path,
                "cover_letter_pdf_path": app.cover_letter_pdf_path,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        })
    
    return ApiResponse(
        success=True,
        data={
            "applications": apps_data,
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    )


@router.delete("/applications/{application_id}", response_model=ApiResponse[dict])
async def delete_application(
    application_id: int,
    http_request: Request,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a job application (admin only)."""
    
    stmt = select(JobApplication).where(JobApplication.id == application_id)
    result = await db.execute(stmt)
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    
    await db.delete(application)
    await log_admin_action(
        db=db,
        admin_user=admin_user,
        action="delete_application",
        target_type="job_application",
        target_id=application_id,
        details={"user_id": application.user_id},
        request=http_request,
    )
    await db.commit()
    
    return ApiResponse(
        success=True,
        data={"message": f"Application {application_id} deleted successfully"},
    )


# ==================== System Settings ====================

@router.get("/settings/system", response_model=ApiResponse[dict])
async def get_system_settings(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get system-wide settings and configuration."""
    
    return ApiResponse(
        success=True,
        data={
            "system_status": "operational",
            "maintenance_mode": False,
            "api_version": "1.0.0",
            "features": {
                "ai_cv_generation": True,
                "email_notifications": True,
                "job_scraping": True,
            },
        },
    )


@router.get("/stats/system", response_model=ApiResponse[dict])
async def get_system_analytics(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """System-wide analytics (subscriptions, revenue, admin actions)."""

    # Subscriptions by status
    subscriptions_by_status = {}
    for status_enum in SubscriptionStatus:
        status_stmt = select(func.count(Subscription.id)).where(
            Subscription.status == status_enum
        )
        status_result = await db.execute(status_stmt)
        subscriptions_by_status[status_enum.value] = status_result.scalar()

    # Plan distribution
    plan_distribution = {}
    plan_stmt = (
        select(Plan.plan_type, func.count(Subscription.id))
        .join(Subscription, Subscription.plan_id == Plan.id)
        .group_by(Plan.plan_type)
    )
    plan_result = await db.execute(plan_stmt)
    for row in plan_result:
        plan_distribution[
            row.plan_type.value if hasattr(row.plan_type, "value") else row.plan_type
        ] = row.count

    # Revenue analytics
    total_revenue_stmt = select(func.coalesce(func.sum(Payment.amount), 0)).where(
        Payment.status == PaymentStatus.PAID
    )
    total_revenue_result = await db.execute(total_revenue_stmt)
    total_revenue = total_revenue_result.scalar()

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    revenue_30d_stmt = select(func.coalesce(func.sum(Payment.amount), 0)).where(
        and_(Payment.status == PaymentStatus.PAID, Payment.paid_at >= thirty_days_ago)
    )
    revenue_30d_result = await db.execute(revenue_30d_stmt)
    revenue_last_30_days = revenue_30d_result.scalar()

    # Payments by status
    payments_by_status = {}
    for status_enum in PaymentStatus:
        pay_stmt = select(func.count(Payment.id)).where(Payment.status == status_enum)
        pay_result = await db.execute(pay_stmt)
        payments_by_status[status_enum.value] = pay_result.scalar()

    # Admin actions (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    actions_recent_stmt = select(func.count(AdminActionLog.id)).where(
        AdminActionLog.created_at >= seven_days_ago
    )
    actions_recent_result = await db.execute(actions_recent_stmt)
    actions_last_7_days = actions_recent_result.scalar()

    return ApiResponse(
        success=True,
        data={
            "subscriptions": {
                "by_status": subscriptions_by_status,
                "plan_distribution": plan_distribution,
            },
            "revenue": {
                "total": total_revenue,
                "last_30_days": revenue_last_30_days,
                "currency": "KES",
            },
            "payments": {
                "by_status": payments_by_status,
            },
            "admin_actions": {
                "last_7_days": actions_last_7_days,
            },
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# ==================== Financial Oversight (M-Pesa Recon) ====================

@router.get("/transactions", response_model=ApiResponse[dict])
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[TransactionStatus] = Query(None),
    result_code: Optional[int] = Query(None),
    admin_user: User = Depends(get_current_finance_admin),
    db: AsyncSession = Depends(get_db),
):
    """Live transaction log for M-Pesa callbacks."""
    stmt = select(Transaction, User.email).join(User, User.id == Transaction.user_id)

    if status_filter:
        stmt = stmt.where(Transaction.status == status_filter)

    if result_code is not None:
        stmt = stmt.where(Transaction.result_code == result_code)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar()

    stmt = stmt.order_by(desc(Transaction.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    transactions = []
    for tx, email in rows:
        transactions.append({
            "id": tx.id,
            "receipt_code": tx.mpesa_receipt_number,
            "phone": tx.phone_number,
            "amount": tx.amount,
            "status": tx.status.value if hasattr(tx.status, "value") else str(tx.status),
            "result_code": tx.result_code,
            "result_desc": tx.result_desc,
            "account_reference": tx.account_reference,
            "user_id": tx.user_id,
            "user_email": email,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "completed_at": tx.completed_at.isoformat() if tx.completed_at else None,
        })

    return ApiResponse(
        success=True,
        data={"transactions": transactions, "total": total, "skip": skip, "limit": limit},
    )


@router.get("/transactions/orphaned", response_model=ApiResponse[dict])
async def list_orphaned_payments(
    limit: int = Query(50, ge=1, le=200),
    admin_user: User = Depends(get_current_finance_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Find orphaned payments where M-Pesa succeeded but credits didn't update.
    Rule: Successful paygo transactions > user.paygo_credits
    """
    success_stmt = (
        select(Transaction.user_id, func.count(Transaction.id))
        .where(
            and_(
                Transaction.result_code == 0,
                Transaction.account_reference == "paygo",
                Transaction.status == TransactionStatus.COMPLETED,
            )
        )
        .group_by(Transaction.user_id)
    )
    success_result = await db.execute(success_stmt)
    success_counts = {row[0]: row[1] for row in success_result.all()}

    if not success_counts:
        return ApiResponse(success=True, data={"transactions": [], "total": 0})

    users_stmt = select(User).where(User.id.in_(list(success_counts.keys())))
    users_result = await db.execute(users_stmt)
    users = users_result.scalars().all()

    mismatched_user_ids = []
    user_credit_map = {}
    for user in users:
        expected = success_counts.get(user.id, 0)
        actual = user.paygo_credits or 0
        if actual < expected:
            mismatched_user_ids.append(user.id)
        user_credit_map[user.id] = {"expected": expected, "actual": actual}

    if not mismatched_user_ids:
        return ApiResponse(success=True, data={"transactions": [], "total": 0})

    tx_stmt = (
        select(Transaction, User.email)
        .join(User, User.id == Transaction.user_id)
        .where(
            and_(
                Transaction.user_id.in_(mismatched_user_ids),
                Transaction.result_code == 0,
                Transaction.account_reference == "paygo",
                Transaction.status == TransactionStatus.COMPLETED,
            )
        )
        .order_by(desc(Transaction.created_at))
        .limit(limit)
    )
    tx_result = await db.execute(tx_stmt)
    rows = tx_result.all()

    orphaned = []
    for tx, email in rows:
        credits_info = user_credit_map.get(tx.user_id, {"expected": 0, "actual": 0})
        orphaned.append({
            "id": tx.id,
            "receipt_code": tx.mpesa_receipt_number,
            "phone": tx.phone_number,
            "amount": tx.amount,
            "status": tx.status.value if hasattr(tx.status, "value") else str(tx.status),
            "result_code": tx.result_code,
            "account_reference": tx.account_reference,
            "user_id": tx.user_id,
            "user_email": email,
            "expected_credits": credits_info["expected"],
            "actual_credits": credits_info["actual"],
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "completed_at": tx.completed_at.isoformat() if tx.completed_at else None,
        })

    return ApiResponse(
        success=True,
        data={"transactions": orphaned, "total": len(orphaned)},
    )


@router.get("/audit-logs", response_model=ApiResponse[dict])
async def get_admin_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    admin_id: Optional[int] = Query(None),
    target_type: Optional[str] = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List admin action logs for accountability."""

    stmt = select(AdminActionLog).options(selectinload(AdminActionLog.admin_user))

    if action:
        stmt = stmt.where(AdminActionLog.action == action)

    if admin_id:
        stmt = stmt.where(AdminActionLog.admin_user_id == admin_id)

    if target_type:
        stmt = stmt.where(AdminActionLog.target_type == target_type)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar()

    stmt = stmt.order_by(desc(AdminActionLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()

    logs_data = []
    for log in logs:
        logs_data.append({
            "id": log.id,
            "admin_user_id": log.admin_user_id,
            "admin_email": log.admin_user.email if log.admin_user else None,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return ApiResponse(
        success=True,
        data={
            "logs": logs_data,
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    )
