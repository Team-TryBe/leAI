"""
Admin authentication and authorization middleware.
Provides role-based access control for admin endpoints.
"""

from fastapi import HTTPException, status, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User, UserRole
from app.api.users import get_current_user


def _ensure_active(user: User) -> None:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact support.",
        )


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to verify current user has internal staff privileges.
    Uses RBAC roles (not legacy is_admin).
    """
    allowed_roles = {
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
        UserRole.FINANCE_ADMIN,
        UserRole.CONTENT_MANAGER,
        UserRole.COMPLIANCE_OFFICER,
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Staff access required.",
        )

    _ensure_active(current_user)
    return current_user


async def get_current_support_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Support tools: SUPER_ADMIN or SUPPORT_AGENT only."""
    allowed_roles = {UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support Agent access required.",
        )

    _ensure_active(current_user)
    return current_user


async def get_current_finance_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Finance tools: SUPER_ADMIN or FINANCE_ADMIN only."""
    allowed_roles = {UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance Admin access required.",
        )

    _ensure_active(current_user)
    return current_user


async def verify_admin_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Alternative admin verification for direct token-based access.
    """
    user = await get_current_user(request, db)
    
    allowed_roles = {
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
        UserRole.FINANCE_ADMIN,
        UserRole.CONTENT_MANAGER,
        UserRole.COMPLIANCE_OFFICER,
    }

    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    _ensure_active(user)
    return user
