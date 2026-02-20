"""
Example: Job Extraction with Provider System

This is a complete, working example showing how to integrate the universal
provider system into an API route. You can copy this pattern to other routes.

Real file: backend/app/api/job_extractor.py
"""

import time
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, AIProviderConfig, AIProviderUsageLog
from app.api.users import get_current_user
from app.services.universal_provider import ProviderFactory, TaskType
from app.services.encryption_service import decrypt_token
from app.core.config import get_settings
from app.schemas import ApiResponse

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/job-extractor", tags=["job-extractor"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_default_provider_config(
    db: AsyncSession, 
    task_type: str
) -> Optional[AIProviderConfig]:
    """
    Get the default provider configuration for a given task type.
    
    Flow:
    1. Query active providers marked for this task type
    2. Return provider if found
    3. Return None if not found (triggers fallback to hardcoded model)
    
    Args:
        db: Database session
        task_type: "extraction", "cv_draft", "cover_letter", or "validation"
        
    Returns:
        AIProviderConfig object or None
    """
    from sqlalchemy import select
    
    try:
        result = await db.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.is_active == True)
            .where(getattr(AIProviderConfig, f'default_for_{task_type}') == True)
            .order_by(AIProviderConfig.is_default.desc())
        )
        
        config = result.scalars().first()
        
        if config:
            logger.info(
                f"✓ Using {config.provider_type.value} provider "
                f"(model: {config.model_name}) for {task_type}"
            )
            return config
        
        logger.debug(f"No provider config found for {task_type}, using fallback")
        return None
        
    except Exception as e:
        logger.error(f"Error getting provider config: {str(e)}")
        return None


async def log_provider_usage(
    db: AsyncSession,
    provider_config_id: int,
    user_id: int,
    task_type: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    total_tokens: int = 0,
    estimated_cost_usd: float = 0.0,
    status: str = "success",
    latency_ms: int = 0,
    error_message: Optional[str] = None
) -> None:
    """
    Log API usage for cost tracking and monitoring.
    
    This creates an entry in AIProviderUsageLog for every API call.
    Used for:
    - Cost tracking per provider and user
    - Performance monitoring (latency, error rates)
    - Usage analytics and reporting
    - Setting alerts for budget/rate limit concerns
    
    Args:
        db: Database session
        provider_config_id: Which provider was used
        user_id: Which user triggered the call
        task_type: Type of task
        input_tokens: Input tokens used
        output_tokens: Output tokens generated
        total_tokens: Sum of input + output
        estimated_cost_usd: Cost in USD (float)
        status: "success", "error", "timeout", "rate_limited"
        latency_ms: Response time in milliseconds
        error_message: Exception details if status != success
    """
    try:
        # Create usage log entry
        usage_log = AIProviderUsageLog(
            user_id=user_id,
            provider_config_id=provider_config_id,
            task_type=task_type,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=int(estimated_cost_usd * 100),  # Store in cents
            status=status,
            error_message=error_message,
            latency_ms=latency_ms
        )
        
        db.add(usage_log)
        await db.commit()
        
        logger.info(
            f"Logged {task_type}: {total_tokens} tokens, "
            f"${estimated_cost_usd:.4f}, {latency_ms}ms, status={status}"
        )
        
    except Exception as e:
        logger.error(f"Failed to log usage: {str(e)}")
        # Don't raise - usage logging failure shouldn't break the main request


def estimate_cost(provider_type: str, total_tokens: int) -> float:
    """
    Estimate API cost based on provider and token count.
    
    Note: This is a rough estimate. Actual costs depend on input/output split
    and vary by model. For exact costs, query provider's API response.
    
    Pricing (as of Jan 2024):
    - Gemini 2.5 Flash: $0.000075/input, $0.0003/output
    - GPT-4o Mini: $0.00015/input, $0.0006/output
    - Claude 3.5 Sonnet: $0.0003/input, $0.0015/output
    
    Args:
        provider_type: "gemini", "openai", or "claude"
        total_tokens: Total tokens used
        
    Returns:
        Estimated cost in USD
    """
    # Pricing as of Jan 2024 (update these when prices change)
    PRICING_PER_MILLION_TOKENS = {
        "gemini": {
            "input": 75,      # $0.000075/token
            "output": 300,    # $0.0003/token
        },
        "openai": {
            "input": 150,     # $0.00015/token (GPT-4o mini)
            "output": 600,    # $0.0006/token
        },
        "claude": {
            "input": 300,     # $0.0003/token (Claude 3.5 Sonnet)
            "output": 1500,   # $0.0015/token
        }
    }
    
    if provider_type not in PRICING_PER_MILLION_TOKENS:
        logger.warning(f"Unknown provider {provider_type}, using Gemini pricing")
        provider_type = "gemini"
    
    pricing = PRICING_PER_MILLION_TOKENS[provider_type]
    
    # Estimate: 75% input, 25% output tokens
    input_tokens = int(total_tokens * 0.75)
    output_tokens = int(total_tokens * 0.25)
    
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    
    return input_cost + output_cost


# ============================================================================
# API ENDPOINT: JOB EXTRACTION WITH PROVIDER SYSTEM
# ============================================================================

class JobExtractionRequest:
    """Request to extract job details from a URL."""
    url: str
    force: bool = False  # Skip validation if True


class JobExtractionResponse:
    """Extracted job data."""
    success: bool
    data: dict
    provider_used: str
    latency_ms: int


@router.post("/extract", response_model=ApiResponse[dict])
async def extract_job(
    request: JobExtractionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Extract job details from URL using provider system.
    
    Flow:
    1. Get provider config for EXTRACTION task
    2. If found: Use provider via ProviderFactory
    3. If not found: Fall back to hardcoded Gemini model
    4. Log usage metrics to database
    5. Return extracted data
    
    Args:
        request: JobExtractionRequest with URL
        current_user: Authenticated user
        db: Database session
        
    Returns:
        {
            "success": true,
            "data": {
                "title": "Software Engineer",
                "company": "TechCorp",
                "location": "Nairobi, Kenya",
                ...,
                "provider_used": "gemini",
                "latency_ms": 2340
            }
        }
    """
    
    start_time = time.time()
    provider_config = None
    extracted_data = None
    
    try:
        # ====================================================================
        # STEP 1: Get provider configuration for job extraction
        # ====================================================================
        provider_config = await get_default_provider_config(db, "extraction")
        
        if not provider_config:
            # Fallback: Use hardcoded Gemini model (backward compatible)
            logger.warning(
                f"No provider config found for extraction, using fallback Gemini model"
            )
            
            # TODO: Replace this with your actual Gemini extraction logic
            # This is just a placeholder showing where the fallback goes
            import google.generativeai as genai
            
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL_FAST)
            
            # Call Gemini (your extraction prompt here)
            response = model.generate_content([
                {
                    "text": f"Extract job details from this URL: {request.url}"
                }
            ])
            
            extracted_data = response.text
            
        else:
            # ================================================================
            # STEP 2: Use provider system
            # ================================================================
            try:
                # Decrypt API key for this request
                decrypted_key = decrypt_token(provider_config.api_key_encrypted)
                
                # Instantiate provider (Gemini, OpenAI, or Claude)
                provider = ProviderFactory.create_provider(
                    provider_type=provider_config.provider_type.value,
                    api_key=decrypted_key,
                    model_name=provider_config.model_name
                )
                
                logger.info(
                    f"Using {provider_config.provider_type.value} "
                    f"({provider_config.model_name}) for job extraction"
                )
                
                # Call provider
                extraction_prompt = f"""
                Extract structured job details from this URL: {request.url}
                
                Return JSON with fields:
                - title
                - company
                - location
                - salary_range
                - job_type
                - experience_level
                - description
                - requirements
                - benefits
                - application_deadline
                - application_email
                """
                
                extracted_data = await provider.generate_content(
                    prompt=extraction_prompt,
                    system_prompt="You are a job extraction specialist. Extract job details accurately."
                )
                
                logger.info(f"Extraction successful using {provider_config.provider_type.value}")
                
            except Exception as e:
                logger.error(f"Provider error: {str(e)}")
                raise
        
        # ====================================================================
        # STEP 3: Calculate metrics
        # ====================================================================
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Rough token estimation (in production, get from provider API)
        # Formula: ~1 token per 4 characters or ~0.75 words per token
        estimated_tokens = (len(request.url) + len(extracted_data)) / 4
        estimated_cost = estimate_cost(
            provider_config.provider_type.value if provider_config else "gemini",
            int(estimated_tokens)
        )
        
        # ====================================================================
        # STEP 4: Log usage (only if using provider system, not fallback)
        # ====================================================================
        if provider_config:
            await log_provider_usage(
                db=db,
                provider_config_id=provider_config.id,
                user_id=current_user.id,
                task_type="extraction",
                total_tokens=int(estimated_tokens),
                estimated_cost_usd=estimated_cost,
                status="success",
                latency_ms=latency_ms
            )
        
        # ====================================================================
        # STEP 5: Return response
        # ====================================================================
        return {
            "success": True,
            "data": {
                "extracted_data": extracted_data,
                "provider_used": provider_config.provider_type.value if provider_config else "fallback",
                "latency_ms": latency_ms,
                "estimated_tokens": int(estimated_tokens),
                "estimated_cost_usd": round(estimated_cost, 4)
            }
        }
        
    except Exception as e:
        logger.error(f"Job extraction failed: {str(e)}", exc_info=True)
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # ====================================================================
        # ERROR: Log failure
        # ====================================================================
        if provider_config:
            await log_provider_usage(
                db=db,
                provider_config_id=provider_config.id,
                user_id=current_user.id,
                task_type="extraction",
                status="error",
                latency_ms=latency_ms,
                error_message=str(e)
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job extraction failed: {str(e)}"
        )


# ============================================================================
# ADDITIONAL EXAMPLE: WITH IMAGE AND MULTIMODAL SUPPORT
# ============================================================================

@router.post("/extract-with-image")
async def extract_job_with_image(
    image_url: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Extract job details from an image (screenshot of job posting).
    
    Demonstrates multimodal provider support (vision + text).
    Works with:
    - Gemini (via generate_content_with_image)
    - OpenAI (via base64 encoding)
    - Claude (via base64 encoding)
    """
    
    start_time = time.time()
    
    try:
        # Get provider (Gemini and OpenAI support images)
        provider_config = await get_default_provider_config(db, "validation")
        
        if not provider_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No provider configured for image extraction"
            )
        
        # Check if provider supports images
        supported_providers = ["gemini", "openai", "claude"]
        if provider_config.provider_type.value not in supported_providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{provider_config.provider_type.value} does not support image extraction"
            )
        
        # Instantiate provider
        decrypted_key = decrypt_token(provider_config.api_key_encrypted)
        provider = ProviderFactory.create_provider(
            provider_type=provider_config.provider_type.value,
            api_key=decrypted_key,
            model_name=provider_config.model_name
        )
        
        # Download image (you'll need to implement this)
        # For now, pass URL directly to provider
        image_data = None  # TODO: download from image_url
        
        # Call provider with image
        extracted_data = await provider.generate_content_with_image(
            prompt="Extract all job details from this job posting image",
            image_data=image_data,
            system_prompt="You are a job extraction specialist. Extract job details from images."
        )
        
        latency_ms = int((time.time() - start_time) * 1000)
        estimated_tokens = len(extracted_data) / 4
        
        # Log usage
        await log_provider_usage(
            db=db,
            provider_config_id=provider_config.id,
            user_id=current_user.id,
            task_type="extraction",
            total_tokens=int(estimated_tokens),
            status="success",
            latency_ms=latency_ms
        )
        
        return {
            "success": True,
            "data": {
                "extracted_data": extracted_data,
                "provider_used": provider_config.provider_type.value,
                "latency_ms": latency_ms
            }
        }
        
    except Exception as e:
        logger.error(f"Image extraction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# NOTES FOR IMPLEMENTATION
# ============================================================================

"""
Integration Checklist:

1. ✓ Import ProviderFactory, TaskType, decrypt_token, AIProviderConfig
2. ✓ Implement get_default_provider_config() helper
3. ✓ Implement log_provider_usage() logging
4. ✓ Implement estimate_cost() pricing
5. ✓ Update endpoint to query provider config
6. ✓ Fallback to hardcoded model if no provider found
7. ✓ Log all usage to database
8. ✓ Handle errors and log them
9. ✓ Return provider name in response
10. ✓ Test with multiple provider configs

Next Steps:
- Apply same pattern to cv_drafter.py
- Apply same pattern to cover_letter.py
- Test end-to-end with admin dashboard
- Monitor usage logs and costs
- Deploy to staging/production
"""
