"""
Super Admin API - God Mode Dashboard
Requires SUPER_ADMIN role with MFA enabled
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

from app.db.database import get_db
from app.db.models import User, UserRole, MasterProfile, JobApplication, ExtractedJobData, AdminActionLog
from app.api.users import get_current_user
from app.core.rbac import require_super_admin, has_permission, PermissionScope, log_sensitive_action, get_user_permissions
from app.schemas import ApiResponse


router = APIRouter(prefix="/super-admin", tags=["super-admin"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class UserSummary(BaseModel):
    """Summary of user information for admin view."""
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    mfa_enabled: bool
    email_verified: bool
    gmail_connected: bool
    paygo_credits: int
    created_at: datetime
    last_login_at: Optional[datetime]
    last_login_ip: Optional[str]
    application_count: int


class SystemStats(BaseModel):
    """System-wide statistics for super admin dashboard."""
    total_users: int
    active_users: int
    total_applications: int
    total_extracted_jobs: int
    users_by_role: dict
    users_registered_today: int
    users_registered_this_week: int
    users_registered_this_month: int
    mfa_enabled_count: int
    email_verified_count: int


class UserRoleUpdate(BaseModel):
    """Request to update user role."""
    user_id: int
    new_role: UserRole
    reason: str  # Audit trail


class BanUserRequest(BaseModel):
    """Request to ban/deactivate a user."""
    user_id: int
    reason: str
    permanent: bool = True


# ============================================================================
# DASHBOARD & STATS
# ============================================================================

@router.get("/dashboard", response_model=ApiResponse[SystemStats])
async def get_super_admin_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get system-wide statistics and metrics.
    Requires: SUPER_ADMIN with MFA
    """
    # Check permissions
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA must be enabled for Super Admin access"
        )
    
    # Get total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar()
    
    # Get active users
    active_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_users = active_users_result.scalar()
    
    # Get total applications
    total_apps_result = await db.execute(select(func.count(JobApplication.id)))
    total_applications = total_apps_result.scalar()
    
    # Get total extracted jobs
    total_jobs_result = await db.execute(select(func.count(ExtractedJobData.id)))
    total_extracted_jobs = total_jobs_result.scalar()
    
    # Users by role
    users_by_role_result = await db.execute(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    )
    users_by_role = {str(row[0]): row[1] for row in users_by_role_result.fetchall()}
    
    # Time-based registration stats
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)
    
    users_today_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    users_registered_today = users_today_result.scalar()
    
    users_week_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_start)
    )
    users_registered_this_week = users_week_result.scalar()
    
    users_month_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_start)
    )
    users_registered_this_month = users_month_result.scalar()
    
    # MFA and email verification stats
    mfa_enabled_result = await db.execute(
        select(func.count(User.id)).where(User.mfa_enabled == True)
    )
    mfa_enabled_count = mfa_enabled_result.scalar()
    
    email_verified_result = await db.execute(
        select(func.count(User.id)).where(User.email_verified == True)
    )
    email_verified_count = email_verified_result.scalar()
    
    stats = SystemStats(
        total_users=total_users,
        active_users=active_users,
        total_applications=total_applications,
        total_extracted_jobs=total_extracted_jobs,
        users_by_role=users_by_role,
        users_registered_today=users_registered_today,
        users_registered_this_week=users_registered_this_week,
        users_registered_this_month=users_registered_this_month,
        mfa_enabled_count=mfa_enabled_count,
        email_verified_count=email_verified_count
    )
    
    return ApiResponse(
        success=True,
        message="Super Admin dashboard loaded successfully",
        data=stats
    )


# ============================================================================
# USER MANAGEMENT
# ============================================================================

@router.get("/users", response_model=ApiResponse[List[UserSummary]])
async def list_all_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users with filtering and pagination.
    Requires: SUPER_ADMIN with MFA
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA must be enabled for Super Admin access"
        )
    
    # Build query
    query = select(User).order_by(desc(User.created_at))
    
    # Apply filters
    if role:
        query = query.where(User.role == role)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (User.email.ilike(search_pattern)) |
            (User.full_name.ilike(search_pattern))
        )
    
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Get application counts for each user
    user_summaries = []
    for user in users:
        app_count_result = await db.execute(
            select(func.count(JobApplication.id)).where(JobApplication.user_id == user.id)
        )
        app_count = app_count_result.scalar()
        
        user_summaries.append(UserSummary(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            mfa_enabled=user.mfa_enabled,
            email_verified=user.email_verified,
            gmail_connected=user.gmail_connected,
            paygo_credits=user.paygo_credits,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            last_login_ip=user.last_login_ip,
            application_count=app_count
        ))
    
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(user_summaries)} users",
        data=user_summaries
    )


@router.put("/users/role", response_model=ApiResponse[dict])
async def update_user_role(
    request_data: UserRoleUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user's role.
    Requires: SUPER_ADMIN with MFA
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA must be enabled for Super Admin access"
        )
    
    # Get target user
    result = await db.execute(select(User).where(User.id == request_data.user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Store old role for audit log
    old_role = target_user.role
    
    # Update role
    target_user.role = request_data.new_role
    target_user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Log the action
    await log_sensitive_action(
        db=db,
        user=current_user,
        action="UPDATE_USER_ROLE",
        target_type="user",
        target_id=target_user.id,
        details={
            "old_role": old_role.value,
            "new_role": request_data.new_role.value,
            "reason": request_data.reason
        },
        ip_address=request.client.host if request.client else None
    )
    
    return ApiResponse(
        success=True,
        message=f"User role updated from {old_role.value} to {request_data.new_role.value}",
        data={
            "user_id": target_user.id,
            "old_role": old_role.value,
            "new_role": request_data.new_role.value
        }
    )


@router.post("/users/ban", response_model=ApiResponse[dict])
async def ban_user(
    request_data: BanUserRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ban/deactivate a user account.
    Requires: SUPER_ADMIN with MFA
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA must be enabled for Super Admin access"
        )
    
    # Get target user
    result = await db.execute(select(User).where(User.id == request_data.user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Cannot ban yourself
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot ban yourself"
        )
    
    # Deactivate user
    target_user.is_active = False
    target_user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Log the action
    await log_sensitive_action(
        db=db,
        user=current_user,
        action="BAN_USER",
        target_type="user",
        target_id=target_user.id,
        details={
            "reason": request_data.reason,
            "permanent": request_data.permanent
        },
        ip_address=request.client.host if request.client else None
    )
    
    return ApiResponse(
        success=True,
        message=f"User {target_user.email} has been banned",
        data={
            "user_id": target_user.id,
            "email": target_user.email,
            "banned_at": datetime.utcnow().isoformat()
        }
    )


@router.delete("/users/{user_id}", response_model=ApiResponse[dict])
async def delete_user_permanently(
    user_id: int,
    reason: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete a user and all their data.
    ⚠️ DANGEROUS OPERATION - Cannot be undone!
    Requires: SUPER_ADMIN with MFA
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA must be enabled for Super Admin access"
        )
    
    # Get target user
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Cannot delete yourself
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    # Store email for response
    user_email = target_user.email
    
    # Log before deletion
    await log_sensitive_action(
        db=db,
        user=current_user,
        action="DELETE_USER_PERMANENT",
        target_type="user",
        target_id=target_user.id,
        details={
            "email": user_email,
            "reason": reason
        },
        ip_address=request.client.host if request.client else None
    )
    
    # Delete user (cascade will handle related records)
    await db.delete(target_user)
    await db.commit()
    
    return ApiResponse(
        success=True,
        message=f"User {user_email} permanently deleted",
        data={
            "deleted_user_id": user_id,
            "deleted_email": user_email,
            "deleted_at": datetime.utcnow().isoformat()
        }
    )


# ============================================================================
# AUDIT LOGS
# ============================================================================

@router.get("/audit-logs", response_model=ApiResponse[List[dict]])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    admin_user_id: Optional[int] = None,
    action: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get audit logs of sensitive actions.
    Requires: SUPER_ADMIN with MFA
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA must be enabled for Super Admin access"
        )
    
    # Build query
    query = select(AdminActionLog).order_by(desc(AdminActionLog.timestamp))
    
    if admin_user_id:
        query = query.where(AdminActionLog.admin_user_id == admin_user_id)
    
    if action:
        query = query.where(AdminActionLog.action == action)
    
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Convert to dict for response
    log_data = []
    for log in logs:
        log_data.append({
            "id": log.id,
            "admin_user_id": log.admin_user_id,
            "action": log.action,
            "target_user_id": log.target_user_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat()
        })
    
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(log_data)} audit logs",
        data=log_data
    )
