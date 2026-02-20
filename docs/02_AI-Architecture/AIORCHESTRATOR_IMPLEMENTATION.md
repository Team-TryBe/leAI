# AIOrchestrator Implementation Guide

## Overview

The **AIOrchestrator** is the unified, centralized service layer for all AI operations in Aditus. It replaces direct provider calls scattered across API routes with a single orchestration point that handles:

- **Provider Management**: Select from Gemini, OpenAI, Claude
- **Model Routing**: Plan-aware model selection (fast vs. quality)
- **Usage Tracking**: Metrics, cost estimation, and audit logging
- **Quota Enforcement**: Daily/monthly token limits per plan
- **Error Handling**: Consistent exception handling and retries
- **Observability**: Detailed logging for debugging and monitoring

## Architecture

```
User Request (Job Extract, CV Draft, etc.)
    ↓
API Route (job_extractor.py, cv_drafter.py, etc.)
    ↓
AIOrchestrator.generate()
    ├─ Get Provider Config (from DB or env defaults)
    ├─ Init Provider (Gemini/OpenAI/Claude)
    ├─ Check Quotas (daily/monthly limits)
    ├─ Generate Content (via provider)
    ├─ Log Usage Metrics
    └─ Return Response
    ↓
API Route returns to Client
```

## Key Components

### 1. AIOrchestrator Class

**Location:** `backend/app/services/ai_orchestrator.py`

**Main Method:**
```python
async def generate(
    user_id: int,
    task: str,                          # "extraction", "cv_draft", "cover_letter"
    prompt: str,
    system_prompt: Optional[str] = None,
    image_data: Optional[bytes] = None, # For multimodal (OCR, etc.)
    mime_type: str = "image/jpeg",
    temperature: float = 0.7,
    max_tokens: int = 4096,
    provider_type: Optional[str] = None, # Override: "gemini", "openai", "claude"
) -> str:
    """Generate content through unified pipeline."""
```

**Features:**
- Automatic provider selection based on config
- Plan-aware model routing (via ModelRouter)
- Credential decryption from AIProviderConfig
- Automatic usage logging with cost estimation
- Error tracking and metrics

### 2. Provider Configuration (AIProviderConfig)

**Location:** `backend/app/db/models.py`

**Fields:**
- `provider_type`: "gemini" | "openai" | "claude"
- `model_name`: "models/gemini-2.5-flash", "gpt-4-turbo", etc.
- `api_key_encrypted`: Fernet-encrypted API key
- `is_active`: Whether this provider is enabled
- `is_default`: If true, used when no user-specific config
- `daily_token_limit`: Max tokens per day for this provider
- `monthly_token_limit`: Max tokens per month
- `last_tested_at`: Last credential validation timestamp
- `last_test_success`: Boolean result of last validation

**Management:** Via `/admin/providers` dashboard

### 3. Usage Logging (AIProviderUsageLog)

**Location:** `backend/app/db/models.py`

**Tracked Metrics:**
- `user_id`: Who made the request
- `provider_config_id`: Which provider config was used
- `task_type`: "extraction" | "cv_draft" | "cover_letter" | etc.
- `input_tokens`: Tokens in prompt
- `output_tokens`: Tokens in response
- `total_tokens`: Combined
- `estimated_cost_usd`: Cost in cents (for billing)
- `status`: "success" | "error" | "timeout"
- `error_message`: If failed, the error details
- `latency_ms`: Response time in milliseconds

**Used For:**
- Cost tracking per user/plan
- Usage analytics and reporting
- Debugging and monitoring
- Billing integration

## Usage Examples

### Example 1: Direct Orchestrator Usage

```python
from app.services import AIOrchestrator
from sqlalchemy.ext.asyncio import AsyncSession

async def my_endpoint(db: AsyncSession, user_id: int):
    orchestrator = AIOrchestrator(db=db)
    
    response = await orchestrator.generate(
        user_id=user_id,
        task="extraction",
        prompt="Extract job details from this posting: ...",
        system_prompt="You are a job posting analyzer...",
        temperature=0.3,  # Low temp for structured data
    )
    
    return {"extracted": response}
```

### Example 2: Using Convenience Functions

```python
from app.services import extract_job_data, draft_cv
from sqlalchemy.ext.asyncio import AsyncSession

# Extract job data
async def extract_job(db: AsyncSession, url: str):
    job_json = await extract_job_data(
        db=db,
        user_id=current_user.id,
        prompt=f"Extract job from: {url}",
        image_data=None,
    )
    return json.loads(job_json)

# Draft CV
async def generate_cv(db: AsyncSession, master_profile: dict, job_data: dict):
    cv_json = await draft_cv(
        db=db,
        user_id=current_user.id,
        master_profile=master_profile,
        job_data=job_data,
    )
    return json.loads(cv_json)
```

### Example 3: Multimodal (Image) Generation

```python
async def extract_with_ocr(db: AsyncSession, user_id: int, image_bytes: bytes):
    orchestrator = AIOrchestrator(db=db)
    
    response = await orchestrator.generate(
        user_id=user_id,
        task="extraction",
        prompt="OCR this job posting and extract key details",
        image_data=image_bytes,
        mime_type="image/png",
        temperature=0.2,
    )
    
    return response
```

## Provider Selection Logic

### Automatic Provider Selection

1. **Check User Config:** If user has a personal provider config, use it.
2. **Check System Default:** If no user config, use the system default (marked `is_default=True`).
3. **Fallback to Env:** If no DB configs exist, use environment variables (e.g., `GEMINI_API_KEY`).
4. **Error if None:** Raise error if no provider available.

### Manual Override

```python
# Force use of OpenAI even if Gemini is default
response = await orchestrator.generate(
    user_id=user_id,
    task="cv_draft",
    prompt=...,
    provider_type="openai",  # Override
)
```

## Model Routing (Plan-Aware)

**Routing Matrix:**

| Plan | Extraction | CV Drafting | Cover Letter | Notes |
|---|---|---|---|---|
| Freemium | gemini-2.5-flash | gemini-2.5-flash | gemini-2.5-flash | Lowest cost |
| Pay-as-you-go | gemini-2.5-flash | gemini-2.5-flash | gemini-2.5-flash | Per-usage billing |
| Pro Monthly | gemini-2.5-flash | gemini-1.5-pro | gemini-1.5-pro | Better CV quality |
| Pro Annual | gemini-2.5-flash | gemini-1.5-pro | gemini-1.5-pro | Highest quality |

**Implementation:** [backend/app/services/model_router.py](backend/app/services/model_router.py)

```python
# Internally, orchestrator uses ModelRouter:
model_name = await self.model_router.get_model_for_user(
    db=db,
    user_id=user_id,
    task=TASK_CV_DRAFT,
)
# Returns: "models/gemini-1.5-pro" for Pro plans, "models/gemini-2.5-flash" for Free
```

## Cost Estimation

**Pricing (Gemini):**
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

**Calculation:**
```python
estimated_cost_usd = (input_tokens * 0.075 + output_tokens * 0.30) / 1_000_000
estimated_cost_cents = int(estimated_cost_usd * 100)  # Stored in DB as cents
```

**Usage:**
- Logged per request in `AIProviderUsageLog.estimated_cost_usd` (cents)
- Aggregated for billing: `SELECT SUM(estimated_cost_usd) FROM usage_logs WHERE user_id=X`
- Compared against plan limits

## Quota Management

**Current Status:** Placeholder (ready for implementation)

**Future Implementation:**
```python
async def _check_quotas(self, user_id: int, provider_config_id: int, task: str):
    """Check user quotas before generation."""
    
    # Get user's subscription plan
    plan = await self.model_router.get_user_plan_type(self.db, user_id)
    
    # Get token limits for plan
    limits = QUOTA_LIMITS[plan]
    
    # Check daily usage
    daily_usage = await self._get_daily_usage(user_id)
    if daily_usage + ESTIMATED_TOKENS > limits.daily:
        raise QuotaExceededError(f"Daily quota exceeded")
    
    # Check monthly usage
    monthly_usage = await self._get_monthly_usage(user_id)
    if monthly_usage + ESTIMATED_TOKENS > limits.monthly:
        raise QuotaExceededError(f"Monthly quota exceeded")
```

## Error Handling

**Common Errors:**

| Error | Cause | Solution |
|---|---|---|
| `No active provider config` | No DB config + no env vars | Add config via `/admin/providers` or set `GEMINI_API_KEY` |
| `Invalid credentials` | API key expired or wrong | Test via `/admin/providers/test` endpoint |
| `Quota exceeded` | Daily/monthly limit hit | Wait until next period or upgrade plan |
| `Provider unavailable` | API down or rate-limited | Check provider status, implement retry |
| `JSON parse error` | LLM returned invalid JSON | Improve prompt, validate response schema |

**All errors are logged:**
```python
# Failed usage still logged for debugging
await self._log_usage(
    user_id=user_id,
    task_type=task,
    status="error",
    error_message=str(e),  # Captured
)
```

## Migration Path for Existing Routes

### Before (Direct Gemini)
```python
# backend/app/api/job_extractor.py
from google import genai

client = genai.Client(api_key=GEMINI_API_KEY)
response = client.models.generate_content(...)
```

### After (Via Orchestrator)
```python
# backend/app/api/job_extractor.py
from app.services import extract_job_data

response = await extract_job_data(
    db=db,
    user_id=user_id,
    prompt=extraction_prompt,
    image_data=upload_bytes,
)
```

**Benefits:**
- ✅ Single source of truth for provider logic
- ✅ Automatic usage tracking
- ✅ Plan-aware model selection
- ✅ Consistent error handling
- ✅ Cost visibility
- ✅ Easier to add new providers later

## Configuration

### Environment Variables
```bash
# Primary provider
GEMINI_API_KEY=sk_...

# Model selection
GEMINI_MODEL_FAST=models/gemini-2.5-flash
GEMINI_MODEL_QUALITY=models/gemini-1.5-pro
```

### Database Configuration
Create provider configs via `/admin/providers` dashboard:
1. Go to `/admin/providers`
2. Click "Add Provider"
3. Select provider type (Gemini, OpenAI, Claude)
4. Enter API key
5. Test credentials
6. Mark as default if needed

### Quota Limits (Config)
```python
# backend/app/core/config.py
QUOTA_LIMITS = {
    PlanType.FREEMIUM: {
        "daily_tokens": 10_000,
        "monthly_tokens": 100_000,
    },
    PlanType.PRO_MONTHLY: {
        "daily_tokens": 1_000_000,
        "monthly_tokens": 30_000_000,
    },
    # ...
}
```

## Monitoring & Observability

### Key Metrics
```sql
-- Total API calls per user
SELECT user_id, COUNT(*) FROM ai_provider_usage_logs GROUP BY user_id;

-- Cost per user (this month)
SELECT user_id, SUM(estimated_cost_usd)/100 as cost_usd 
FROM ai_provider_usage_logs 
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY user_id;

-- Average latency by task
SELECT task_type, AVG(latency_ms) FROM ai_provider_usage_logs GROUP BY task_type;

-- Error rate by task
SELECT task_type, 
  COUNT(*) as total,
  COUNT(CASE WHEN status='error' THEN 1 END) as errors,
  (COUNT(CASE WHEN status='error' THEN 1 END)::float / COUNT(*)) as error_rate
FROM ai_provider_usage_logs GROUP BY task_type;
```

### Admin Dashboard
- View per-provider usage and costs
- See quota consumption per user
- Track provider reliability (success rates, latency)
- Monitor per-task model performance

## Future Enhancements

1. **Retry Logic:** Automatic retry with exponential backoff
2. **Provider Fallback:** If Gemini fails, try OpenAI
3. **Caching:** Cache extraction by URL hash, cache CV drafts
4. **Streaming:** Support streaming responses for long documents
5. **Fine-tuning:** Support custom fine-tuned models
6. **Rate Limiting:** Per-user, per-IP rate limits
7. **Cost Optimization:** Auto-select cheaper model if quality acceptable
8. **A/B Testing:** Compare model outputs on subset of users

## Troubleshooting

**Q: Orchestrator says "No active provider config" but I set GEMINI_API_KEY**

A: The environment fallback works, but for production you should add a config via `/admin/providers`. The DB config takes precedence.

**Q: My API calls are slow**

A: Check `AIProviderUsageLog.latency_ms` to identify bottlenecks. Could be:
- Provider API latency (check `/admin/providers/test`)
- Network issues (check logs)
- Token count too high (optimize prompt)

**Q: How do I add OpenAI as a backup?**

A: 
1. Add OpenAI config via `/admin/providers`
2. Test credentials
3. Optionally set as default or use `provider_type="openai"` override

**Q: How do I track costs per user?**

A: Query `AIProviderUsageLog` grouped by `user_id` and sum `estimated_cost_usd / 100`.

## Files Modified/Created

| File | Status | Purpose |
|---|---|---|
| [backend/app/services/ai_orchestrator.py](backend/app/services/ai_orchestrator.py) | **NEW** | Orchestrator implementation |
| [backend/app/services/__init__.py](backend/app/services/__init__.py) | Modified | Export orchestrator |
| [backend/app/services/universal_provider.py](backend/app/services/universal_provider.py) | Existing | Provider abstraction |
| [backend/app/services/model_router.py](backend/app/services/model_router.py) | Existing | Plan-aware routing |
| [backend/app/db/models.py](backend/app/db/models.py) | Existing | AIProviderConfig, AIProviderUsageLog tables |

## Next Steps

1. ✅ **Orchestrator Created** - Core service implemented
2. ⏳ **Migrate API Routes** - Update job_extractor.py, cv_drafter.py, cover_letter.py to use orchestrator
3. ✅ **Implement Quotas** - QuotaManager with daily/monthly/hourly limits
4. ✅ **Add Caching** - 3-tier intelligent caching (system, session, content)
5. ⏳ **Build Admin Dashboard** - Cost tracking, provider management, quota monitoring
6. ⏳ **Add Monitoring** - Metrics, alerts, observability

