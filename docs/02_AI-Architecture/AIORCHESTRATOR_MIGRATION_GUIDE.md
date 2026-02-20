# Quick Migration Guide: Routing AI Calls Through AIOrchestrator

## TL;DR

Replace direct Gemini/OpenAI/Claude calls with `AIOrchestrator` for unified provider management, usage tracking, and plan-aware routing.

## Step-by-Step Migration

### Step 1: Import Orchestrator

```python
# BEFORE
from google import genai
client = genai.Client(api_key=GEMINI_API_KEY)

# AFTER
from app.services import AIOrchestrator, extract_job_data, draft_cv
# Or use convenience functions directly
```

### Step 2: Replace Direct Calls

#### Job Extraction

**BEFORE:**
```python
# backend/app/api/job_extractor.py (Old)
@router.post("/extract")
async def extract_job(request: JobExtractRequest, db: AsyncSession = Depends(get_db)):
    prompt = construct_extraction_prompt(request.job_url)
    
    # Direct Gemini call
    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)
    
    extracted_data = json.loads(response.text)
    # ... save to DB
    return extracted_data
```

**AFTER:**
```python
# backend/app/api/job_extractor.py (New)
@router.post("/extract")
async def extract_job(
    request: JobExtractRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prompt = construct_extraction_prompt(request.job_url)
    
    # Via Orchestrator (plan-aware, tracked, logged)
    response_text = await extract_job_data(
        db=db,
        user_id=current_user.id,
        prompt=prompt,
        image_data=None,
    )
    
    extracted_data = json.loads(response_text)
    # ... save to DB
    return extracted_data
```

**Key Changes:**
- ✅ Pass `user_id` (for plan-aware routing)
- ✅ Pass `db` (for config lookup)
- ✅ Use convenience function `extract_job_data()`
- ✅ Automatic usage logging
- ✅ Plan-aware model selection

#### CV Drafting

**BEFORE:**
```python
# backend/app/api/cv_drafter.py (Old)
@router.post("/draft")
async def draft_cv(request: CVDraftRequest, db: AsyncSession = Depends(get_db)):
    user = await get_current_user(db)
    master_profile = user.master_profile
    job_data = await fetch_job_data(db, request.job_id)
    
    prompt = construct_cv_prompt(master_profile, job_data)
    
    # Direct Gemini call
    model = genai.GenerativeModel("models/gemini-1.5-pro")
    response = model.generate_content(prompt)
    
    cv_json = json.loads(response.text)
    return cv_json
```

**AFTER:**
```python
# backend/app/api/cv_drafter.py (New)
@router.post("/draft")
async def draft_cv(
    request: CVDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    master_profile = current_user.master_profile
    job_data = await fetch_job_data(db, request.job_id)
    
    # Via Orchestrator (automatically selects pro model for Pro plans)
    response_text = await draft_cv(
        db=db,
        user_id=current_user.id,
        master_profile=master_profile,
        job_data=job_data,
    )
    
    cv_json = json.loads(response_text)
    return cv_json
```

**Key Changes:**
- ✅ No need to manually select model (orchestrator does it based on plan)
- ✅ Pass `master_profile` and `job_data` as dicts
- ✅ Automatic usage logging
- ✅ Consistent error handling

#### Cover Letter

**BEFORE:**
```python
# backend/app/api/cover_letter.py (Old)
@router.post("/draft")
async def draft_letter(request: LetterDraftRequest, db: AsyncSession = Depends(get_db)):
    user = await get_current_user(db)
    master_profile = user.master_profile
    job_data = await fetch_job_data(db, request.job_id)
    
    prompt = construct_letter_prompt(master_profile, job_data)
    
    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)
    
    letter_json = json.loads(response.text)
    return letter_json
```

**AFTER:**
```python
# backend/app/api/cover_letter.py (New)
@router.post("/draft")
async def draft_letter(
    request: LetterDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    master_profile = current_user.master_profile
    job_data = await fetch_job_data(db, request.job_id)
    
    # Via Orchestrator
    response_text = await draft_cover_letter(
        db=db,
        user_id=current_user.id,
        master_profile=master_profile,
        job_data=job_data,
    )
    
    letter_json = json.loads(response_text)
    return letter_json
```

### Step 3: For Custom/Advanced Use Cases

If you need direct orchestrator control:

```python
from app.services import AIOrchestrator

@router.post("/custom-ai")
async def custom_ai_call(
    request: CustomAIRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    orchestrator = AIOrchestrator(db=db)
    
    response = await orchestrator.generate(
        user_id=current_user.id,
        task="custom_task",  # Your task name
        prompt=request.prompt,
        system_prompt="You are a helpful assistant",
        temperature=0.5,
        max_tokens=2048,
        provider_type=None,  # Auto-select based on user plan
    )
    
    return {"response": response}
```

## Provider Selection Behavior

### Auto-Selection (No Override)
```python
response = await extract_job_data(db=db, user_id=user_id, prompt=prompt)
# Orchestrator automatically:
# 1. Gets user's plan (free, pro_monthly, pro_annual, etc.)
# 2. Selects model based on plan + task type
# 3. Initializes provider from AIProviderConfig DB
# 4. Falls back to env if no DB config
```

### Manual Override
```python
orchestrator = AIOrchestrator(db=db)

response = await orchestrator.generate(
    user_id=user_id,
    task="extraction",
    prompt=prompt,
    provider_type="openai",  # Force OpenAI even if Gemini is default
)
```

## Model Selection Matrix

| Plan | Extraction | CV Draft | Cover Letter |
|---|---|---|---|
| Freemium | gemini-2.5-flash | gemini-2.5-flash | gemini-2.5-flash |
| Pay-as-you-go | gemini-2.5-flash | gemini-2.5-flash | gemini-2.5-flash |
| Pro Monthly | gemini-2.5-flash | **gemini-1.5-pro** | **gemini-1.5-pro** |
| Pro Annual | gemini-2.5-flash | **gemini-1.5-pro** | **gemini-1.5-pro** |

**Benefit:** Pro users get higher quality CV/cover letters automatically!

## Error Handling

### Before
```python
try:
    response = model.generate_content(prompt)
except Exception as e:
    logger.error(f"Gemini error: {e}")
    raise HTTPException(status_code=500, detail="AI generation failed")
```

### After
```python
try:
    response = await extract_job_data(db=db, user_id=user_id, prompt=prompt)
except ValueError as e:
    # Provider config not found
    raise HTTPException(status_code=500, detail=str(e))
except Exception as e:
    # Other errors (API down, quota exceeded, etc.)
    # Already logged by orchestrator
    raise HTTPException(status_code=500, detail="AI generation failed")
```

**Benefits:**
- ✅ Consistent error messages
- ✅ Automatic error logging
- ✅ No manual error tracking needed

## Usage Tracking

### Automatic Logging
Every call through the orchestrator logs:
- User ID
- Provider used
- Model selected
- Task type
- Tokens used
- Cost estimate (in cents)
- Success/failure status
- Latency

**Query Usage:**
```python
# In admin routes or monitoring endpoints
from sqlalchemy import select, func
from app.db.models import AIProviderUsageLog

# Cost per user (this month)
stmt = select(
    AIProviderUsageLog.user_id,
    func.sum(AIProviderUsageLog.estimated_cost_usd).label("total_cost_cents"),
).where(
    AIProviderUsageLog.created_at >= func.current_date()
).group_by(
    AIProviderUsageLog.user_id
)
result = await db.execute(stmt)
```

## Migration Checklist

- [ ] Update `backend/app/api/job_extractor.py` to use orchestrator
- [ ] Update `backend/app/api/cv_drafter.py` to use orchestrator
- [ ] Update `backend/app/api/cover_letter.py` to use orchestrator
- [ ] Update any other routes with direct AI calls
- [ ] Test with multiple user plans to verify model selection
- [ ] Verify usage logs are being recorded
- [ ] Update error handling in affected routes
- [ ] Document in API docs the new behavior

## Testing

### Test 1: Verify Plan-Aware Routing
```python
# Create free user
free_user = User(plan=FREEMIUM)
db.add(free_user)

# Create pro user
pro_user = User(plan=PRO_MONTHLY)
db.add(pro_user)

# Both extract job
free_response = await extract_job_data(db, free_user.id, prompt)
pro_response = await extract_job_data(db, pro_user.id, prompt)

# Check logs - free should use gemini-2.5-flash, pro should use gemini-1.5-pro for CV
```

### Test 2: Verify Usage Logging
```python
# Generate content
response = await extract_job_data(db, user_id, prompt)

# Check usage log was created
log_entry = await db.execute(
    select(AIProviderUsageLog)
    .where(AIProviderUsageLog.user_id == user_id)
    .order_by(AIProviderUsageLog.created_at.desc())
    .limit(1)
)
entry = log_entry.scalar_one()
assert entry.status == "success"
assert entry.task_type == "extraction"
assert entry.estimated_cost_usd > 0
```

### Test 3: Multimodal (Image) Support
```python
# Test with image upload
image_bytes = open("test_job_posting.png", "rb").read()
response = await extract_job_data(
    db=db,
    user_id=user_id,
    prompt="Extract job details from this image",
    image_data=image_bytes,
)
```

## Common Issues & Solutions

| Issue | Solution |
|---|---|
| "No active provider config" | Add config via `/admin/providers` or set `GEMINI_API_KEY` env var |
| "Provider credentials invalid" | Test via `/admin/providers/test` or refresh API key |
| "User plan not found" | Ensure user has active subscription in `subscriptions` table |
| "Response parsing failed" | Check prompt format, may need to adjust Gemini response schema |
| Slow responses | Check latency in `AIProviderUsageLog`, may be provider API lag |

## Support & Questions

See [AIORCHESTRATOR_IMPLEMENTATION.md](AIORCHESTRATOR_IMPLEMENTATION.md) for detailed documentation.
