# Integration Guide: Wiring Provider System into API Routes

This guide shows how to integrate the universal provider system into existing API routes (job extraction, CV generation, etc.)

## Architecture Pattern

```
API Route Request
    ↓
[1] Get user's subscription tier (for model selection)
    ↓
[2] Query default provider for task type
    ↓
[3] Instantiate provider via ProviderFactory
    ↓
[4] Call provider.generate_content() or provider.generate_content_with_image()
    ↓
[5] Log usage metrics to AIProviderUsageLog
    ↓
[6] Return response to client
```

## Step-by-Step Implementation

### Step 1: Import Required Modules

```python
# In your API route file (e.g., backend/app/api/job_extractor.py)

from app.services.universal_provider import ProviderFactory, TaskType
from app.services.encryption_service import decrypt_token
from app.db.models import AIProviderConfig, AIProviderUsageLog
from sqlalchemy import select
from typing import Optional

# Optional: If using model routing for plan-based selection
# from app.services.model_router import ModelRouter, TASK_EXTRACTION
```

### Step 2: Create Helper Function to Get Provider Config

```python
async def get_default_provider_config(
    db: AsyncSession, 
    task_type: str
) -> Optional[AIProviderConfig]:
    """
    Get the default provider configuration for a given task type.
    
    Args:
        db: Database session
        task_type: One of EXTRACTION, CV_DRAFT, COVER_LETTER, VALIDATION
        
    Returns:
        AIProviderConfig if found, None otherwise (falls back to hardcoded)
    """
    try:
        # Query for provider marked as default for this task type
        result = await db.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.is_active == True)
            .order_by(AIProviderConfig.is_default.desc())  # Default first
        )
        
        config = result.scalars().first()
        
        if config:
            logger.info(f"Using provider: {config.provider_type} for {task_type}")
            return config
        
        logger.warning(f"No provider config found for {task_type}, using fallback")
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
    
    Args:
        db: Database session
        provider_config_id: ID of the provider config used
        user_id: ID of the user who triggered the call
        task_type: Type of task (extraction, cv_draft, cover_letter, validation)
        input_tokens: Number of input tokens used
        output_tokens: Number of output tokens used
        total_tokens: Total tokens (input + output)
        estimated_cost_usd: Estimated cost in USD
        status: success, error, timeout, etc.
        latency_ms: Response time in milliseconds
        error_message: Error details if status != success
    """
    try:
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
            f"Logged usage: {task_type} - {total_tokens} tokens, "
            f"${estimated_cost_usd:.4f}, {latency_ms}ms"
        )
        
    except Exception as e:
        logger.error(f"Error logging usage: {str(e)}")
        # Don't raise - usage logging failure shouldn't break the main request
```

### Step 3: Update Job Extraction Endpoint

**Before (hardcoded model):**

```python
@router.post("/extract")
async def extract_job(
    request: JobExtractionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Extract job data from URL."""
    
    # HARDCODED MODEL
    model = genai.GenerativeModel(settings.GEMINI_MODEL_FAST)
    
    response = model.generate_content([...])
    
    return {"extracted_data": response.text}
```

**After (provider-routed):**

```python
import time

@router.post("/extract")
async def extract_job(
    request: JobExtractionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Extract job data from URL with provider routing."""
    
    start_time = time.time()
    provider_config = None
    
    try:
        # Step 1: Get provider configuration
        provider_config = await get_default_provider_config(
            db, 
            TaskType.EXTRACTION
        )
        
        if not provider_config:
            # Fallback: Use hardcoded model (for backward compatibility)
            logger.warning("Using fallback hardcoded model for extraction")
            model = genai.GenerativeModel(settings.GEMINI_MODEL_FAST)
            response = model.generate_content([...])
            extracted_data = response.text
        else:
            # Step 2: Instantiate provider
            decrypted_key = decrypt_token(provider_config.api_key_encrypted)
            provider = ProviderFactory.create_provider(
                provider_type=provider_config.provider_type.value,
                api_key=decrypted_key,
                model_name=provider_config.model_name
            )
            
            # Step 3: Call provider
            extracted_data = await provider.generate_content(
                prompt=extraction_prompt,
                system_prompt=extraction_system_prompt
            )
        
        # Step 4: Calculate metrics
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Estimate tokens (rough approximation if not provided by provider)
        estimated_tokens = len(extracted_data.split()) / 0.75  # ~0.75 words per token
        
        # Step 5: Log usage
        if provider_config:
            await log_provider_usage(
                db=db,
                provider_config_id=provider_config.id,
                user_id=current_user.id,
                task_type="extraction",
                total_tokens=int(estimated_tokens),
                estimated_cost_usd=estimate_cost(  # See cost estimation section
                    provider_config.provider_type.value,
                    int(estimated_tokens)
                ),
                status="success",
                latency_ms=latency_ms
            )
        
        return {
            "success": True,
            "data": {
                "extracted_data": extracted_data,
                "provider_used": provider_config.provider_type.value if provider_config else "fallback",
                "latency_ms": latency_ms
            }
        }
        
    except Exception as e:
        logger.error(f"Job extraction error: {str(e)}")
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Log error
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
        
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 4: Apply Same Pattern to CV Drafter

```python
@router.post("/draft-cv")
async def draft_cv(
    request: CVDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate personalized CV using provider system."""
    
    start_time = time.time()
    provider_config = None
    
    try:
        # Get provider for CV drafting (likely higher quality model)
        provider_config = await get_default_provider_config(
            db, 
            TaskType.CV_DRAFT
        )
        
        if provider_config:
            decrypted_key = decrypt_token(provider_config.api_key_encrypted)
            provider = ProviderFactory.create_provider(
                provider_type=provider_config.provider_type.value,
                api_key=decrypted_key,
                model_name=provider_config.model_name
            )
            
            cv_content = await provider.generate_content(
                prompt=cv_prompt,
                system_prompt=cv_system_prompt
            )
        else:
            # Fallback
            model = genai.GenerativeModel(settings.GEMINI_MODEL_QUALITY)
            response = model.generate_content([...])
            cv_content = response.text
        
        # Calculate metrics and log
        latency_ms = int((time.time() - start_time) * 1000)
        estimated_tokens = len(cv_content.split()) / 0.75
        
        if provider_config:
            await log_provider_usage(
                db=db,
                provider_config_id=provider_config.id,
                user_id=current_user.id,
                task_type="cv_draft",
                total_tokens=int(estimated_tokens),
                estimated_cost_usd=estimate_cost(
                    provider_config.provider_type.value,
                    int(estimated_tokens)
                ),
                status="success",
                latency_ms=latency_ms
            )
        
        return {
            "success": True,
            "data": {
                "cv_content": cv_content,
                "provider_used": provider_config.provider_type.value if provider_config else "fallback"
            }
        }
        
    except Exception as e:
        logger.error(f"CV draft error: {str(e)}")
        # Similar error handling as extraction
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 5: Add Cost Estimation Helper

```python
def estimate_cost(
    provider_type: str, 
    total_tokens: int
) -> float:
    """
    Estimate API cost based on provider type and token count.
    
    Args:
        provider_type: "gemini", "openai", or "claude"
        total_tokens: Total tokens used
        
    Returns:
        Estimated cost in USD
    """
    # Pricing as of Jan 2024 (update as needed)
    PRICING = {
        "gemini": {
            "input_price_per_million": 75,      # $0.000075/token
            "output_price_per_million": 300,    # $0.0003/token (assumed 1:4 ratio)
        },
        "openai": {
            "input_price_per_million": 150,     # $0.00015/token (GPT-4o mini)
            "output_price_per_million": 600,    # $0.0006/token
        },
        "claude": {
            "input_price_per_million": 300,     # $0.0003/token (Claude 3.5 Sonnet)
            "output_price_per_million": 1500,   # $0.0015/token
        }
    }
    
    if provider_type not in PRICING:
        logger.warning(f"Unknown provider type: {provider_type}, using Gemini pricing")
        provider_type = "gemini"
    
    pricing = PRICING[provider_type]
    
    # Rough estimate: 75% input, 25% output
    input_tokens = int(total_tokens * 0.75)
    output_tokens = int(total_tokens * 0.25)
    
    input_cost = (input_tokens / 1_000_000) * pricing["input_price_per_million"]
    output_cost = (output_tokens / 1_000_000) * pricing["output_price_per_million"]
    
    return input_cost + output_cost
```

## Integration Checklist

- [ ] Import required modules (ProviderFactory, TaskType, encrypt/decrypt)
- [ ] Create `get_default_provider_config()` helper function
- [ ] Create `log_provider_usage()` logging function
- [ ] Create `estimate_cost()` pricing helper
- [ ] Update job extraction endpoint with provider routing
- [ ] Update CV drafter endpoint with provider routing
- [ ] Update cover letter endpoint with provider routing
- [ ] Add error handling for provider failures
- [ ] Test with multiple provider configs
- [ ] Verify usage logs are populated
- [ ] Monitor costs in admin dashboard

## Testing Integration

### Unit Test Example

```python
@pytest.mark.asyncio
async def test_extract_with_provider():
    """Test job extraction uses provider system."""
    
    # Create mock provider config
    provider_config = AIProviderConfig(
        id=1,
        provider_type=AIProviderType.GEMINI,
        api_key_encrypted="encrypted_key",
        model_name="gemini-2.5-flash",
        is_active=True,
        created_by_id=1
    )
    
    # Mock database
    mock_db = AsyncMock()
    mock_db.execute.return_value.scalars.return_value.first.return_value = provider_config
    
    # Mock user
    mock_user = Mock(id=1)
    
    # Call endpoint
    response = await extract_job(
        request=JobExtractionRequest(url="http://..."),
        current_user=mock_user,
        db=mock_db
    )
    
    # Verify
    assert response["success"] == True
    assert response["data"]["provider_used"] == "gemini"
    
    # Verify usage was logged
    usage_logs = mock_db.add.call_args_list
    assert len(usage_logs) > 0
```

### Integration Test

```python
async def test_provider_system_end_to_end():
    """Test full provider system integration."""
    
    # 1. Create provider config in database
    config = await create_test_provider_config()
    
    # 2. Make API call
    response = await client.post(
        "/api/v1/job-extractor/extract",
        json={"url": "https://brightermonday.co.ke/jobs/123"},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    # 3. Verify response
    assert response.status_code == 200
    assert response.json()["data"]["provider_used"] == "gemini"
    
    # 4. Verify usage was logged
    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(AIProviderUsageLog)
            .where(AIProviderUsageLog.task_type == "extraction")
        )
        logs = result.scalars().all()
        
        assert len(logs) > 0
        assert logs[0].status == "success"
        assert logs[0].total_tokens > 0
        assert logs[0].estimated_cost_usd > 0
```

## Monitoring Integration

### Key Metrics to Track

```python
# In your logging/metrics system

metrics = {
    "provider_requests_total": {
        "labels": ["provider_type", "task_type", "status"],
        "value": counter
    },
    "provider_tokens_used": {
        "labels": ["provider_type"],
        "value": counter
    },
    "provider_cost_usd": {
        "labels": ["provider_type"],
        "value": gauge
    },
    "provider_latency_ms": {
        "labels": ["provider_type", "task_type"],
        "value": histogram
    }
}

# Example push to Prometheus
prometheus_counter(
    "ai_provider_requests_total",
    1,
    labels={
        "provider_type": config.provider_type.value,
        "task_type": task_type,
        "status": "success"
    }
)
```

## Troubleshooting Integration

### Issue: "No provider config found, using fallback"

**Cause:** No active provider configuration exists in database

**Solution:**
1. Access admin dashboard at `/admin/providers`
2. Click "Add Provider"
3. Create initial Gemini config
4. Test credentials
5. Retry API call

### Issue: "Error: decryption failed"

**Cause:** Corrupted encrypted token or changed SECRET_KEY

**Solution:**
1. Verify `SECRET_KEY` environment variable is consistent
2. Re-test provider credentials in admin dashboard
3. If credential test fails, delete and recreate config

### Issue: Requests are using fallback instead of provider

**Cause:** `get_default_provider_config()` returning None

**Solution:**
1. Check database: `SELECT * FROM ai_provider_configs WHERE is_active=true;`
2. Verify at least one config with `is_default=true`
3. Check server logs for query errors
4. Verify database connection

---

## Complete Example: Job Extraction with Provider

See [full working example here](./examples/job_extraction_with_provider.py)

---

**Next:** After integration is complete, update all routes and deploy to production.
