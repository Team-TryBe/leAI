"""
Admin authentication and authorization middleware.
Provides role-based access control for admin endpoints.
"""

from fastapi import HTTPException, status, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User
from app.api.users import get_current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to verify current user has admin privileges.
    Raises 403 Forbidden if user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin access required.",
        )
    
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact support.",
        )
    
    return current_user


async def verify_admin_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Alternative admin verification for direct token-based access.
    """
    user = await get_current_user(request, db)
    
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    
    return user
