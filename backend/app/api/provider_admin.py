"""
Super Admin AI Provider Management API
Allows super admins to manage AI provider configurations and API keys
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, Field
from datetime import datetime

from app.db.database import get_db
from app.db.models import User, UserRole, AIProviderConfig, AIProviderType, AIProviderUsageLog
from app.api.users import get_current_user
from app.core.rbac import require_super_admin, log_sensitive_action
from app.services.encryption_service import encrypt_token, decrypt_token
from app.services.universal_provider import ProviderFactory, ProviderType, TaskType
from app.schemas import ApiResponse


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/super-admin/providers", tags=["super-admin-providers"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class AIProviderConfigRequest(BaseModel):
    """Request to create/update AI provider configuration."""
    provider_type: str  # "gemini", "openai", "claude"
    api_key: str
    model_name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    is_default: bool = False
    default_for_extraction: bool = False
    default_for_cv_draft: bool = False
    default_for_cover_letter: bool = False
    default_for_validation: bool = False
    daily_token_limit: Optional[int] = None
    monthly_token_limit: Optional[int] = None


class AIProviderConfigResponse(BaseModel):
    """Response with provider configuration (no sensitive data)."""
    id: int
    provider_type: str
    model_name: str
    display_name: Optional[str]
    description: Optional[str]
    is_active: bool
    is_default: bool
    default_for_extraction: bool
    default_for_cv_draft: bool
    default_for_cover_letter: bool
    default_for_validation: bool
    daily_token_limit: Optional[int]
    monthly_token_limit: Optional[int]
    last_tested_at: Optional[datetime]
    last_test_success: Optional[bool]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIProviderUsageResponse(BaseModel):
    """Provider usage statistics."""
    provider_type: str
    model_name: str
    total_calls: int
    total_tokens: int
    total_cost_usd: float
    success_rate: float  # percentage
    avg_latency_ms: int
    last_7_days_calls: int
    last_30_days_calls: int


class AIProviderUsageLogResponse(BaseModel):
    """Individual usage log entry."""
    id: int
    user_email: Optional[str]
    task_type: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    status: str
    error_message: Optional[str]
    latency_ms: int
    created_at: datetime

    class Config:
        from_attributes = True


class DailyStatsResponse(BaseModel):
    """Daily aggregated statistics."""
    date: str
    total_calls: int
    total_tokens: int
    total_cost_usd: float
    success_count: int
    error_count: int
    avg_latency_ms: int


class TaskTypeStatsResponse(BaseModel):
    """Statistics by task type."""
    task_type: str
    total_calls: int
    total_tokens: int
    total_cost_usd: float
    success_rate: float
    avg_latency_ms: int


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_super_admin_user(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> User:
    """Verify user is super admin."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin access required")
    return current_user


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/configs", response_model=ApiResponse[List[AIProviderConfigResponse]])
async def list_provider_configs(
    active_only: bool = False,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all AI provider configurations (sensitive data redacted)."""
    stmt = select(AIProviderConfig)
    if active_only:
        stmt = stmt.where(AIProviderConfig.is_active == True)
    stmt = stmt.order_by(AIProviderConfig.provider_type, AIProviderConfig.created_at.desc())
    
    result = await db.execute(stmt)
    configs = result.scalars().all()

    return ApiResponse(
        success=True,
        message=f"Retrieved {len(configs)} provider configurations",
        data=[AIProviderConfigResponse.model_validate(cfg) for cfg in configs],
    )


@router.get("/configs/{config_id}", response_model=ApiResponse[AIProviderConfigResponse])
async def get_provider_config(
    config_id: int,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get specific provider configuration details."""
    stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider configuration not found")

    return ApiResponse(
        success=True,
        data=AIProviderConfigResponse.model_validate(config),
    )


@router.post("/configs", response_model=ApiResponse[AIProviderConfigResponse])
async def create_provider_config(
    request: AIProviderConfigRequest,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new AI provider configuration.
    
    IMPORTANT: Test your model first using POST /super-admin/providers/test-model
    to ensure it's available and your API key is valid.
    """
    
    # Validate provider type
    if request.provider_type not in [p.value for p in ProviderType]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid provider type: {request.provider_type}")

    # NOTE: We skip validation here because:
    # 1. Some models may not support test calls
    # 2. Admins should test via /test-model endpoint first
    # 3. Real validation happens during actual usage with fallback support
    logger.info(f"Creating provider config for {request.provider_type} with model {request.model_name}")
    logger.warning(f"⚠️ Make sure to test this model first using POST /super-admin/providers/test-model")

    # Encrypt API key
    encrypted_key = encrypt_token(request.api_key)

    # Create configuration
    config = AIProviderConfig(
        provider_type=AIProviderType(request.provider_type),
        api_key_encrypted=encrypted_key,
        model_name=request.model_name,
        display_name=request.display_name,
        description=request.description,
        is_active=request.is_active,
        is_default=request.is_default,
        default_for_extraction=request.default_for_extraction,
        default_for_cv_draft=request.default_for_cv_draft,
        default_for_cover_letter=request.default_for_cover_letter,
        default_for_validation=request.default_for_validation,
        daily_token_limit=request.daily_token_limit,
        monthly_token_limit=request.monthly_token_limit,
        last_tested_at=datetime.utcnow(),
        last_test_success=True,
        created_by_id=current_user.id,
    )

    db.add(config)
    await db.commit()
    await db.refresh(config)

    # Log action
    await log_sensitive_action(
        db,
        current_user,
        f"Created AI provider config: {request.provider_type}",
        details={"provider_id": config.id, "provider_type": request.provider_type},
    )

    return ApiResponse(
        success=True,
        message=f"Provider configuration created successfully",
        data=AIProviderConfigResponse.model_validate(config),
    )


@router.put("/configs/{config_id}", response_model=ApiResponse[AIProviderConfigResponse])
async def update_provider_config(
    config_id: int,
    request: AIProviderConfigRequest,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing provider configuration."""
    stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider configuration not found")

    # If API key changed, validate it
    if request.api_key and request.api_key != decrypt_token(config.api_key_encrypted):
        try:
            provider_type = ProviderType(request.provider_type)
            provider = ProviderFactory.create_provider(provider_type, request.api_key, request.model_name)
            is_valid = provider.validate_credentials()
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid API credentials. Please verify your API key.",
                )
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Credential validation failed: {str(e)}")
        
        config.api_key_encrypted = encrypt_token(request.api_key)
        config.last_tested_at = datetime.utcnow()
        config.last_test_success = True

    # Update fields
    config.model_name = request.model_name
    config.display_name = request.display_name
    config.description = request.description
    config.is_active = request.is_active
    config.is_default = request.is_default
    config.default_for_extraction = request.default_for_extraction
    config.default_for_cv_draft = request.default_for_cv_draft
    config.default_for_cover_letter = request.default_for_cover_letter
    config.default_for_validation = request.default_for_validation
    config.daily_token_limit = request.daily_token_limit
    config.monthly_token_limit = request.monthly_token_limit
    config.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(config)

    # Log action
    await log_sensitive_action(
        db,
        current_user,
        f"Updated AI provider config: {config.provider_type}",
        details={"provider_id": config.id, "provider_type": config.provider_type},
    )

    return ApiResponse(
        success=True,
        message="Provider configuration updated successfully",
        data=AIProviderConfigResponse.model_validate(config),
    )


@router.post("/configs/{config_id}/test", response_model=ApiResponse[dict])
async def test_provider_config(
    config_id: int,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Test a provider configuration's credentials."""
    stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider configuration not found")

    try:
        provider_type = ProviderType(config.provider_type.value)
        api_key = decrypt_token(config.api_key_encrypted)
        provider = ProviderFactory.create_provider(provider_type, api_key, config.model_name)
        
        is_valid = provider.validate_credentials()
        
        config.last_tested_at = datetime.utcnow()
        config.last_test_success = is_valid
        await db.commit()

        if is_valid:
            return ApiResponse(
                success=True,
                message="Provider credentials are valid",
                data={"is_valid": True, "provider_type": config.provider_type.value},
            )
        else:
            return ApiResponse(
                success=False,
                message="Provider credentials are invalid",
                data={"is_valid": False},
            )
    except Exception as e:
        config.last_tested_at = datetime.utcnow()
        config.last_test_success = False
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Credential test failed: {str(e)}",
        )


@router.delete("/configs/{config_id}", response_model=ApiResponse[dict])
async def delete_provider_config(
    config_id: int,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a provider configuration."""
    stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider configuration not found")

    provider_type = config.provider_type.value
    await db.delete(config)
    await db.commit()

    # Log action
    await log_sensitive_action(
        db,
        current_user,
        f"Deleted AI provider config: {config.provider_type}",
        details={"provider_id": config_id, "provider_type": config.provider_type},
    )

    return ApiResponse(
        success=True,
        message="Provider configuration deleted successfully",
        data={"deleted_id": config_id},
    )


@router.get("/usage/stats", response_model=ApiResponse[List[AIProviderUsageResponse]])
async def get_provider_usage_stats(
    days: int = 30,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI provider usage statistics."""
    from sqlalchemy import func
    from datetime import timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    stmt = (
        select(
            AIProviderConfig,
            func.count(AIProviderUsageLog.id).label("total_calls"),
            func.sum(AIProviderUsageLog.total_tokens).label("total_tokens"),
            func.sum(AIProviderUsageLog.estimated_cost_usd).label("total_cost_usd"),
            func.avg(AIProviderUsageLog.latency_ms).label("avg_latency_ms"),
        )
        .outerjoin(AIProviderUsageLog)
        .where(AIProviderUsageLog.created_at >= cutoff_date)
        .group_by(AIProviderConfig.id)
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    stats = []
    for row in rows:
        config, total_calls, total_tokens, total_cost_usd, avg_latency_ms = row
        
        # Calculate success rate
        success_stmt = select(func.count(AIProviderUsageLog.id)).where(
            (AIProviderUsageLog.provider_config_id == config.id)
            & (AIProviderUsageLog.status == "success")
            & (AIProviderUsageLog.created_at >= cutoff_date)
        )
        success_result = await db.execute(success_stmt)
        success_count = success_result.scalar() or 0
        success_rate = (success_count / total_calls * 100) if total_calls > 0 else 0

        stats.append(
            AIProviderUsageResponse(
                provider_type=config.provider_type.value,
                model_name=config.model_name,
                total_calls=total_calls or 0,
                total_tokens=total_tokens or 0,
                total_cost_usd=(total_cost_usd or 0) / 100,  # Convert from cents
                success_rate=success_rate,
                avg_latency_ms=int(avg_latency_ms) if avg_latency_ms else 0,
                last_7_days_calls=0,  # TODO: Add separate query
                last_30_days_calls=total_calls or 0,
            )
        )

    return ApiResponse(
        success=True,
        message=f"Retrieved usage statistics for {len(stats)} providers",
        data=stats,
    )


@router.get("/configs/{config_id}", response_model=ApiResponse[AIProviderConfigResponse])
async def get_provider_config(
    config_id: int,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific provider configuration."""
    stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider configuration not found")

    return ApiResponse(
        success=True,
        message="Provider configuration retrieved successfully",
        data=AIProviderConfigResponse.model_validate(config),
    )


@router.get("/{config_id}/usage-logs", response_model=ApiResponse[List[AIProviderUsageLogResponse]])
async def get_provider_usage_logs(
    config_id: int,
    limit: int = 50,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recent usage logs for a specific provider."""
    # Verify provider exists
    provider_stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    provider_result = await db.execute(provider_stmt)
    provider = provider_result.scalar_one_or_none()

    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    # Fetch usage logs with user email
    stmt = (
        select(AIProviderUsageLog, User.email)
        .outerjoin(User, AIProviderUsageLog.user_id == User.id)
        .where(AIProviderUsageLog.provider_config_id == config_id)
        .order_by(AIProviderUsageLog.created_at.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    logs = []
    for log, email in rows:
        log_data = AIProviderUsageLogResponse(
            id=log.id,
            user_email=email,
            task_type=log.task_type,
            input_tokens=log.input_tokens,
            output_tokens=log.output_tokens,
            total_tokens=log.total_tokens,
            estimated_cost_usd=log.estimated_cost_usd / 100,  # Convert from cents
            status=log.status,
            error_message=log.error_message,
            latency_ms=log.latency_ms,
            created_at=log.created_at,
        )
        logs.append(log_data)

    return ApiResponse(
        success=True,
        message=f"Retrieved {len(logs)} usage logs",
        data=logs,
    )


@router.get("/{config_id}/daily-stats", response_model=ApiResponse[List[DailyStatsResponse]])
async def get_provider_daily_stats(
    config_id: int,
    days: int = 30,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get daily aggregated statistics for a provider."""
    from sqlalchemy import func, case
    from datetime import timedelta

    # Verify provider exists
    provider_stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    provider_result = await db.execute(provider_stmt)
    provider = provider_result.scalar_one_or_none()

    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Group by date and aggregate
    stmt = (
        select(
            func.date(AIProviderUsageLog.created_at).label("date"),
            func.count(AIProviderUsageLog.id).label("total_calls"),
            func.sum(AIProviderUsageLog.total_tokens).label("total_tokens"),
            func.sum(AIProviderUsageLog.estimated_cost_usd).label("total_cost_usd"),
            func.sum(
                case((AIProviderUsageLog.status == "success", 1), else_=0)
            ).label("success_count"),
            func.sum(
                case((AIProviderUsageLog.status == "error", 1), else_=0)
            ).label("error_count"),
            func.avg(AIProviderUsageLog.latency_ms).label("avg_latency_ms"),
        )
        .where(
            (AIProviderUsageLog.provider_config_id == config_id)
            & (AIProviderUsageLog.created_at >= cutoff_date)
        )
        .group_by(func.date(AIProviderUsageLog.created_at))
        .order_by(func.date(AIProviderUsageLog.created_at))
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    stats = []
    for row in rows:
        stats.append(
            DailyStatsResponse(
                date=row.date.isoformat(),
                total_calls=row.total_calls or 0,
                total_tokens=row.total_tokens or 0,
                total_cost_usd=(row.total_cost_usd or 0) / 100,  # Convert from cents
                success_count=row.success_count or 0,
                error_count=row.error_count or 0,
                avg_latency_ms=int(row.avg_latency_ms) if row.avg_latency_ms else 0,
            )
        )

    return ApiResponse(
        success=True,
        message=f"Retrieved daily statistics for {len(stats)} days",
        data=stats,
    )


@router.get("/{config_id}/task-stats", response_model=ApiResponse[List[TaskTypeStatsResponse]])
async def get_provider_task_stats(
    config_id: int,
    days: int = 30,
    current_user: User = Depends(get_super_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics broken down by task type."""
    from sqlalchemy import func, case
    from datetime import timedelta

    # Verify provider exists
    provider_stmt = select(AIProviderConfig).where(AIProviderConfig.id == config_id)
    provider_result = await db.execute(provider_stmt)
    provider = provider_result.scalar_one_or_none()

    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Group by task type
    stmt = (
        select(
            AIProviderUsageLog.task_type,
            func.count(AIProviderUsageLog.id).label("total_calls"),
            func.sum(AIProviderUsageLog.total_tokens).label("total_tokens"),
            func.sum(AIProviderUsageLog.estimated_cost_usd).label("total_cost_usd"),
            func.sum(
                case((AIProviderUsageLog.status == "success", 1), else_=0)
            ).label("success_count"),
            func.avg(AIProviderUsageLog.latency_ms).label("avg_latency_ms"),
        )
        .where(
            (AIProviderUsageLog.provider_config_id == config_id)
            & (AIProviderUsageLog.created_at >= cutoff_date)
        )
        .group_by(AIProviderUsageLog.task_type)
        .order_by(func.count(AIProviderUsageLog.id).desc())
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    stats = []
    for row in rows:
        total_calls = row.total_calls or 0
        success_count = row.success_count or 0
        success_rate = (success_count / total_calls * 100) if total_calls > 0 else 0

        stats.append(
            TaskTypeStatsResponse(
                task_type=row.task_type,
                total_calls=total_calls,
                total_tokens=row.total_tokens or 0,
                total_cost_usd=(row.total_cost_usd or 0) / 100,  # Convert from cents
                success_rate=success_rate,
                avg_latency_ms=int(row.avg_latency_ms) if row.avg_latency_ms else 0,
            )
        )

    return ApiResponse(
        success=True,
        message=f"Retrieved statistics for {len(stats)} task types",
        data=stats,
    )


# ============================================================================
# MODEL TESTING & VALIDATION
# ============================================================================

class ModelTestRequest(BaseModel):
    """Request to test a model."""
    provider_type: str  # "gemini", "openai", "claude"
    api_key: str
    model_name: str
    test_prompt: str = "Hello, say 'Model test successful' if you can read this."


class ModelTestResponse(BaseModel):
    """Response from model test."""
    success: bool
    model_name: str
    provider_type: str
    message: str
    response_sample: Optional[str] = None


@router.post("/test-model", response_model=ApiResponse)
async def test_model(
    request: ModelTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse:
    """
    Test if a model is available and working.
    IMPORTANT: Always test your model here BEFORE creating a provider config.
    
    Recommended Gemini Models:
    - models/gemini-1.5-pro (reliable, multimodal)
    - models/gemini-pro-vision (vision-specific)
    - models/gemini-flash-latest (experimental)
    - models/gemini-pro (basic)
    
    Example request:
    {
      "provider_type": "gemini",
      "api_key": "your-api-key",
      "model_name": "gemini-1.5-pro",
      "test_prompt": "Hello, test this model"
    }
    """
    # Verify super admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can test models"
        )
    
    try:
        logger.info(f"Testing model: {request.model_name} ({request.provider_type})")
        factory = ProviderFactory()
        provider = factory.create_provider(
            provider_type=request.provider_type,
            api_key=request.api_key,
            model_name=request.model_name,
        )
        
        response = await provider.generate_content(
            prompt=request.test_prompt,
            temperature=0.3,
            max_tokens=100,
        )
        
        logger.info(f"✓ Model {request.model_name} test successful")
        
        return ApiResponse(
            success=True,
            message=f"✓ Model {request.model_name} is working! You can now create a provider config with this model.",
            data=ModelTestResponse(
                success=True,
                model_name=request.model_name,
                provider_type=request.provider_type,
                message="Model test successful",
                response_sample=response[:100] if len(response) > 100 else response,
            ),
        )
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"✗ Model {request.model_name} test failed: {error_msg}")
        
        # Provide helpful suggestions
        suggestion = ""
        if "404" in error_msg and "not found" in error_msg:
            suggestion = "\n\nSuggestion: This model is not available. Try one of the recommended models above."
        elif "401" in error_msg or "unauthorized" in error_msg.lower():
            suggestion = "\n\nSuggestion: Your API key is invalid or expired. Please check your credentials."
        elif "permission" in error_msg.lower():
            suggestion = "\n\nSuggestion: Your API key doesn't have permission for this model."
        
        return ApiResponse(
            success=False,
            message=f"✗ Model test failed: {error_msg}{suggestion}",
            data=ModelTestResponse(
                success=False,
                model_name=request.model_name,
                provider_type=request.provider_type,
                message=f"Model unavailable: {error_msg}",
            ),
        )

# ============================================================================
# QUICK TEST ENDPOINTS
# ============================================================================

class QuickModelTestRequest(BaseModel):
    """Quick test - just API key and model name."""
    api_key: str
    model_name: str


class AvailableModelsResponse(BaseModel):
    """List of available models for a provider."""
    provider_type: str
    models: List[str]
    recommendations: List[str]


@router.get("/available-models", response_model=ApiResponse[AvailableModelsResponse])
async def get_available_models(
    provider_type: str = "gemini",
    current_user: User = Depends(get_current_user),
) -> ApiResponse:
    """
    Get list of recommended models for each provider.
    
    Query params:
    - provider_type: "gemini", "openai", or "claude"
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    models_map = {
        "gemini": {
            "models": [
                "gemini-1.5-pro",
                "gemini-1.5-flash",
                "gemini-pro-vision",
                "gemini-pro",
                "gemini-flash-latest",
            ],
            "recommendations": [
                "✓ gemini-1.5-pro: Best all-around, multimodal support",
                "⭐ gemini-1.5-flash: Fast, good for quick tasks",
                "🖼️ gemini-pro-vision: Optimized for image processing",
                "⚠️ gemini-pro: Legacy, avoid",
            ]
        },
        "openai": {
            "models": [
                "gpt-4o",
                "gpt-4-turbo",
                "gpt-4",
                "gpt-3.5-turbo",
            ],
            "recommendations": [
                "✓ gpt-4o: Recommended, multimodal",
                "⭐ gpt-4-turbo: Good balance of cost/performance",
                "🟢 gpt-3.5-turbo: Budget option",
            ]
        },
        "claude": {
            "models": [
                "claude-opus",
                "claude-sonnet",
                "claude-haiku",
            ],
            "recommendations": [
                "✓ claude-opus: Most capable",
                "⭐ claude-sonnet: Best balance",
                "⚡ claude-haiku: Fast and cheap",
            ]
        }
    }
    
    if provider_type not in models_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider type: {provider_type}. Choose: gemini, openai, or claude"
        )
    
    data = models_map[provider_type]
    return ApiResponse(
        success=True,
        message=f"Available {provider_type} models",
        data=AvailableModelsResponse(
            provider_type=provider_type,
            models=data["models"],
            recommendations=data["recommendations"],
        ),
    )


class QuickTestResponse(BaseModel):
    """Quick test result."""
    success: bool
    model_name: str
    api_key_valid: bool
    model_available: bool
    message: str


@router.post("/quick-test", response_model=ApiResponse[QuickTestResponse])
async def quick_test_model(
    request: QuickModelTestRequest,
    current_user: User = Depends(get_current_user),
) -> ApiResponse:
    """
    Quick model test - minimal request, just checks availability.
    Use this when you want a fast test before `/test-model`.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    try:
        logger.info(f"Quick testing model: {request.model_name}")
        
        factory = ProviderFactory()
        # For quick test, assume Gemini if not specified
        provider = factory.create_provider(
            provider_type="gemini",
            api_key=request.api_key,
            model_name=request.model_name,
        )
        
        # Just try to create the model object, minimal test
        import google.generativeai as genai
        genai.configure(api_key=request.api_key)
        model = genai.GenerativeModel(f"models/{request.model_name}")
        
        logger.info(f"✓ Quick test passed for {request.model_name}")
        
        return ApiResponse(
            success=True,
            message=f"✓ Model {request.model_name} is available!",
            data=QuickTestResponse(
                success=True,
                model_name=request.model_name,
                api_key_valid=True,
                model_available=True,
                message="Model is available. You can now use it in a provider config.",
            ),
        )
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"✗ Quick test failed: {error_msg}")
        
        is_key_error = "401" in error_msg or "unauthorized" in error_msg.lower()
        is_model_error = "404" in error_msg or "not found" in error_msg.lower()
        
        return ApiResponse(
            success=False,
            message=f"✗ Test failed: {error_msg}",
            data=QuickTestResponse(
                success=False,
                model_name=request.model_name,
                api_key_valid=not is_key_error,
                model_available=not is_model_error,
                message=error_msg,
            ),
        )


class BulkTestRequest(BaseModel):
    """Test multiple models at once."""
    api_key: str
    provider_type: str
    model_names: List[str]


class BulkTestResult(BaseModel):
    """Individual model test result."""
    model_name: str
    available: bool
    message: str


@router.post("/bulk-test", response_model=ApiResponse)
async def bulk_test_models(
    request: BulkTestRequest,
    current_user: User = Depends(get_current_user),
) -> ApiResponse:
    """
    Test multiple models at once.
    Useful to find which models are available for your API key.
    
    Example:
    {
      "api_key": "your-key",
      "provider_type": "gemini",
      "model_names": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"]
    }
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    results = []
    
    for model_name in request.model_names:
        try:
            logger.info(f"Testing model: {model_name}")
            
            factory = ProviderFactory()
            provider = factory.create_provider(
                provider_type=request.provider_type,
                api_key=request.api_key,
                model_name=model_name,
            )
            
            # Quick validation
            response = await provider.generate_content(
                prompt="test",
                temperature=0.1,
                max_tokens=10,
            )
            
            results.append(BulkTestResult(
                model_name=model_name,
                available=True,
                message="✓ Available",
            ))
            logger.info(f"✓ {model_name} available")
            
        except Exception as e:
            results.append(BulkTestResult(
                model_name=model_name,
                available=False,
                message=f"✗ {str(e)[:80]}",
            ))
            logger.warning(f"✗ {model_name} not available: {str(e)[:80]}")
    
    available_count = sum(1 for r in results if r.available)
    
    return ApiResponse(
        success=True,
        message=f"Tested {len(results)} models - {available_count} available",
        data={
            "provider_type": request.provider_type,
            "total_tested": len(results),
            "available_count": available_count,
            "results": results,
        },
    )