"""
Referral system API endpoints for Aditus.
Handles referral code sharing, tracking, and reward processing.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.database import get_db
from app.api.users import get_current_user
from app.db.models import User
from app.schemas import ApiResponse
from app.services.referral_service import ReferralService


# ============================================================================
# SCHEMAS
# ============================================================================

class ReferralStatsResponse(BaseModel):
    """User's referral statistics."""
    code: str
    referral_credits: int
    has_earned_reward: bool
    total_referrals: int
    successful_referrals: int
    pending_referrals: int
    reward_earned_at: str | None


class ReferralLinkResponse(BaseModel):
    """Shareable referral link."""
    code: str
    referral_link: str
    referral_credits: int


# ============================================================================
# ROUTER
# ============================================================================

router = APIRouter(prefix="/referral", tags=["referral"])


@router.get("/stats", response_model=ApiResponse[ReferralStatsResponse])
async def get_referral_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's referral statistics.
    
    Returns:
    - Unique referral code
    - Number of referral credits earned
    - Referral status (whether reward has been earned)
    - Count of total, successful, and pending referrals
    """
    stats = await ReferralService.get_referral_stats(db, current_user.id)
    
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return ApiResponse(
        success=True,
        data=ReferralStatsResponse(**stats)
    )


@router.get("/link", response_model=ApiResponse[ReferralLinkResponse])
async def get_referral_link(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get shareable referral link for current user.
    
    Returns the full referral URL that can be shared on social media.
    """
    stats = await ReferralService.get_referral_stats(db, current_user.id)
    
    # In production, replace with actual domain
    base_url = "https://leai.co.ke"
    referral_link = f"{base_url}/signup?ref={stats['code']}"
    
    return ApiResponse(
        success=True,
        data=ReferralLinkResponse(
            code=stats["code"],
            referral_link=referral_link,
            referral_credits=stats["referral_credits"],
        )
    )
