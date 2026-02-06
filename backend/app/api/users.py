"""
User endpoints for profile management and account information.
"""

from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import User
from app.schemas import UserResponse, ApiResponse, UserUpdate


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


def get_current_user_id(token: str) -> int:
    """Extract user ID from JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        return int(user_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to get current authenticated user."""
    token = get_token_from_header(request)
    user_id = get_current_user_id(token)
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
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
