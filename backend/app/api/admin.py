"""
Admin endpoints for user management, analytics, and system administration.
Only accessible to users with admin privileges.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from datetime import datetime, timedelta

from app.core.admin import get_current_admin_user
from app.db.database import get_db
from app.db.models import User, JobApplication, JobApplicationStatus
from app.schemas import ApiResponse, UserResponse


router = APIRouter(prefix="/admin", tags=["admin"])


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
        stmt = stmt.where(User.is_admin == admin_only)
    
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
    
    return ApiResponse(
        success=True,
        data={
            "users": [UserResponse.model_validate(user).model_dump() for user in users],
            "total": total,
            "skip": skip,
            "limit": limit,
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
    
    user.is_admin = make_admin
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
    )


@router.patch("/users/{user_id}/active-status", response_model=ApiResponse[UserResponse])
async def toggle_active_status(
    user_id: int,
    is_active: bool,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate a user account."""
    
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
    
    user.is_active = is_active
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
    )


@router.delete("/users/{user_id}", response_model=ApiResponse[dict])
async def delete_user(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a user and all associated data."""
    
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
    
    stmt = select(JobApplication)
    
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
            "job_url": app.job_url,
            "status": app.status.value if hasattr(app.status, 'value') else app.status,
            "company_name": app.company_name,
            "job_title": app.job_title,
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
