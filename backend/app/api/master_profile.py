"""
Master profile endpoints for structured CV data.
"""

import os
import json
from uuid import uuid4
from pydantic import HttpUrl
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import MasterProfile, User
from app.schemas import ApiResponse, MasterProfileResponse, MasterProfileUpdate
from app.api.users import get_current_user


router = APIRouter(prefix="/master-profile", tags=["master-profile"])
settings = get_settings()


def serialize_profile_data(data: dict) -> dict:
    """Convert HttpUrl objects and other non-serializable types to strings for JSON storage."""
    if not isinstance(data, dict):
        return data
    
    serialized = {}
    for key, value in data.items():
        if isinstance(value, HttpUrl):
            # Convert HttpUrl to string
            serialized[key] = str(value)
        elif isinstance(value, list):
            # Process list items
            serialized[key] = []
            for item in value:
                if isinstance(item, dict):
                    # Recursively serialize nested dicts (for projects, certifications, etc.)
                    serialized_item = {}
                    for k, v in item.items():
                        if isinstance(v, HttpUrl):
                            serialized_item[k] = str(v)
                        else:
                            serialized_item[k] = v
                    serialized[key].append(serialized_item)
                else:
                    serialized[key].append(item)
        else:
            serialized[key] = value
    
    return serialized


@router.get("", response_model=ApiResponse[MasterProfileResponse])
async def get_master_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the current user's master profile."""
    stmt = select(MasterProfile).where(MasterProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    def normalize_phone_digits(phone: str | None) -> str | None:
        if not phone:
            return None
        digits = "".join(ch for ch in phone if ch.isdigit())
        if 9 <= len(digits) <= 15:
            return digits
        return None

    if profile is None:
        # Create new profile with user's existing details pre-filled
        profile = MasterProfile(
            user_id=current_user.id,
            full_name=current_user.full_name,
            email=current_user.email,
            phone_number=normalize_phone_digits(current_user.phone),
            location=current_user.location,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    else:
        # Backfill missing fields from user profile (one-time enrichment)
        updated = False
        if not profile.full_name and current_user.full_name:
            profile.full_name = current_user.full_name
            updated = True
        if not profile.email and current_user.email:
            profile.email = current_user.email
            updated = True
        if not profile.location and current_user.location:
            profile.location = current_user.location
            updated = True
        if not profile.phone_number and current_user.phone:
            normalized = normalize_phone_digits(current_user.phone)
            if normalized:
                profile.phone_number = normalized
                updated = True

        if updated:
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

    return ApiResponse(success=True, data=MasterProfileResponse.model_validate(profile))


@router.put("", response_model=ApiResponse[MasterProfileResponse])
async def upsert_master_profile(
    payload: MasterProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update the current user's master profile."""
    stmt = select(MasterProfile).where(MasterProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = MasterProfile(user_id=current_user.id)

    # Serialize the data to handle HttpUrl objects and other non-JSON-serializable types
    update_data = payload.model_dump(exclude_unset=True)
    update_data = serialize_profile_data(update_data)
    
    for key, value in update_data.items():
        if hasattr(profile, key):
            setattr(profile, key, value)

    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    
    # Validate that at least one social link is present (COMPULSORY for CVs)
    has_social_link = any([
        profile.linkedin_url,
        profile.github_url,
        profile.portfolio_url,
        profile.twitter_url,
        profile.medium_url
    ])
    
    warning_message = None
    if not has_social_link:
        warning_message = "⚠️ Warning: No social links added. At least one social link (LinkedIn, GitHub, Portfolio, etc.) is required for CV generation."

    return ApiResponse(
        success=True, 
        message=warning_message or "Profile updated successfully",
        data=MasterProfileResponse.model_validate(profile)
    )


@router.post("/certifications/upload", response_model=ApiResponse[dict])
async def upload_certification(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a certification file for the current user."""
    allowed_extensions = {"pdf", "png", "jpg", "jpeg"}
    filename = file.filename or "certificate"
    ext = filename.split(".")[-1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Use PDF, PNG, JPG, or JPEG.",
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Max size is 10MB.",
        )

    user_dir = os.path.join(settings.UPLOAD_DIR, "certifications", str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    safe_name = f"{uuid4().hex}.{ext}"
    file_path = os.path.join(user_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    return ApiResponse(success=True, data={"file_path": file_path, "filename": filename})
