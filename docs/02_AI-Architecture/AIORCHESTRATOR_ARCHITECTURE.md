# AIOrchestrator Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Web App)                         │
│              NextJS 14 Frontend (admin/providers)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY (FastAPI)                     │
│  /api/v1/job-extractor  /api/v1/cv-drafter  /admin/providers   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API ROUTES (Handlers)                        │
│  • job_extractor.py      → extract_job()                       │
│  • cv_drafter.py         → draft_cv()                          │
│  • cover_letter.py       → draft_letter()                      │
│  • provider_admin.py     → manage providers                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────┐
         │    AIOrchestrator (Unified Service)    │
         ├────────────────────────────────────────┤
         │ 1. Get Provider Config (from DB/env)  │
         │ 2. Init Provider (G/OAI/Claude)       │
         │ 3. Check Quotas                       │
         │ 4. Generate Content                   │
         │ 5. Log Usage Metrics                  │
         └────────────────────────────────────────┘
                     ↓              ↓
        ┌────────────────┐  ┌──────────────────┐
        │ Provider Layer │  │  Model Router    │
        ├────────────────┤  ├──────────────────┤
        │ GeminiProvider │  │ Plan-aware       │
        │ OpenAIProvider │  │ model selection  │
        │ ClaudeProvider │  │ (fast vs quality)│
        └────────────────┘  └──────────────────┘
                     ↓              ↓
        ┌────────────────┐  ┌──────────────────┐
        │ External APIs  │  │   Database       │
        ├────────────────┤  ├──────────────────┤
        │ Gemini API     │  │ AIProviderConfig │
        │ OpenAI API     │  │ AIProviderUsageLog
        │ Claude API     │  │ Subscriptions    │
        └────────────────┘  └──────────────────┘
```

## Data Flow Examples

### Example 1: Job Extraction (Free User)

```
Frontend: POST /api/v1/job-extractor/extract
  ├─ URL: https://jobs.example.com/123
  ├─ Image: (null)
  └─ User: free_user@example.com

  ↓ job_extractor.py:extract_job()

  extract_job_data(
    user_id=123,
    prompt="Extract job details from: https://...",
    image_data=None
  )

  ↓ AIOrchestrator.generate()

  1. Get Provider Config
     ├─ Query: AIProviderConfig.is_active=true
     └─ Get: Gemini config (default)

  2. Init Provider
     ├─ Decrypt API key
     ├─ Create: GeminiProvider instance
     └─ Validate credentials ✓

  3. Check Quotas
     ├─ Query user plan: FREEMIUM
     ├─ Daily limit: 10,000 tokens
     ├─ Usage today: 2,500 tokens
     ├─ Check: 2,500 + ~500 < 10,000 ✓
     └─ ALLOWED

  4. Generate Content
     ├─ Model selected: gemini-2.5-flash (fast model)
     ├─ Provider: GeminiProvider
     ├─ Call: genai.GenerativeModel.generate_content()
     └─ Response: {"job_title": "...", "company": "..."}

  5. Log Usage
     ├─ Insert into AIProviderUsageLog:
     │  ├─ user_id: 123
     │  ├─ provider_config_id: 1
     │  ├─ task_type: "extraction"
     │  ├─ input_tokens: ~500
     │  ├─ output_tokens: ~300
     │  ├─ total_tokens: 800
     │  ├─ estimated_cost_usd: 12 (cents)
     │  ├─ status: "success"
     │  └─ latency_ms: 1250
     └─ ✓ Logged

  ↓ Return to job_extractor.py

  Parse JSON → Save to DB → Return extracted_data to client
```

### Example 2: CV Drafting (Pro Monthly User)

```
Frontend: POST /api/v1/cv-drafter/draft
  ├─ Job ID: 456
  └─ User: pro_user@example.com

  ↓ cv_drafter.py:draft_cv()

  draft_cv(
    user_id=789,
    master_profile={...},
    job_data={...}
  )

  ↓ AIOrchestrator.generate()

  1. Get Provider Config
     └─ Get: Gemini config (only active provider)

  2. Init Provider
     ├─ Decrypt API key
     ├─ Create: GeminiProvider instance
     └─ Validate credentials ✓

  3. Check Quotas
     ├─ Query user plan: PRO_MONTHLY
     ├─ Daily limit: 1,000,000 tokens
     ├─ Usage today: 150,000 tokens
     ├─ Check: 150,000 + ~4,000 < 1,000,000 ✓
     └─ ALLOWED

  4. Generate Content
     ├─ Model selected: gemini-1.5-pro (quality model!)
     │  └─ Because user.plan == PRO_MONTHLY + task == cv_draft
     ├─ Provider: GeminiProvider
     ├─ Call: genai.GenerativeModel("models/gemini-1.5-pro").generate_content()
     └─ Response: {"summary": "...", "experience": [...], ...}

  5. Log Usage
     ├─ Insert into AIProviderUsageLog:
     │  ├─ user_id: 789
     │  ├─ provider_config_id: 1
     │  ├─ task_type: "cv_draft"
     │  ├─ input_tokens: ~3,500
     │  ├─ output_tokens: ~2,000
     │  ├─ total_tokens: 5,500
     │  ├─ estimated_cost_usd: 685 (cents = $6.85)
     │  ├─ status: "success"
     │  └─ latency_ms: 3500
     └─ ✓ Logged

  ↓ Return to cv_drafter.py

  Parse JSON → Save draft → Return to client
```

### Example 3: Error Case (Invalid Provider)

```
Frontend: POST /api/v1/job-extractor/extract
  └─ User: new_user@example.com

  ↓ AIOrchestrator.generate()

  1. Get Provider Config
     ├─ Query: AIProviderConfig.is_active=true
     ├─ No configs in DB
     └─ Fallback to env variables

  2. Init Provider
     ├─ GEMINI_API_KEY env var: (not set)
     ├─ Cannot initialize provider
     └─ ERROR: "No active provider configured"

  ↓ Error Handler

  Log failed usage (error status):
  ├─ Insert into AIProviderUsageLog:
  │  ├─ user_id: (new_user_id)
  │  ├─ provider_config_id: NULL
  │  ├─ task_type: "extraction"
  │  ├─ status: "error"
  │  └─ error_message: "No active provider configured"
  └─ ✓ Logged for debugging

  ↓ Return to client

  HTTP 500 with error message
  Recommend: Admin sets up provider config via /admin/providers
```

## Integration with Existing Systems

### 1. Provider Management Admin Panel
**Location:** `/admin/providers`

**Features:**
- ✅ Add/edit/delete provider configs
- ✅ Test credentials (calls orchestrator validation)
- ✅ View usage statistics by provider
- ✅ Mark as default

**Integration:**
```python
# admin panel calls provider_admin.py endpoints
GET /api/v1/super-admin/providers/configs
POST /api/v1/super-admin/providers/configs
PUT /api/v1/super-admin/providers/configs/{id}
POST /api/v1/super-admin/providers/configs/{id}/test
```

### 2. Model Router Integration
**Location:** `backend/app/services/model_router.py`

**Features:**
- ✅ Plan-aware model selection
- ✅ Task-based routing
- ✅ Database subscription lookup

**Integration:**
```python
# Inside AIOrchestrator.generate()
model_name = await model_router.get_model_for_user(
    db=db,
    user_id=user_id,
    task=TASK_CV_DRAFT,
)
# Returns: "models/gemini-1.5-pro" for Pro users
```

### 3. Provider Factory
**Location:** `backend/app/services/universal_provider.py`

**Features:**
- ✅ Provider abstraction (Gemini, OpenAI, Claude)
- ✅ Common interface for all providers
- ✅ Multimodal support

**Integration:**
```python
# Inside AIOrchestrator._init_provider()
provider = provider_factory.create_provider(
    provider_type="gemini",
    api_key=decrypted_key,
    model_name="models/gemini-1.5-pro",
)
```

### 4. Database Models
**Location:** `backend/app/db/models.py`

**Tables:**
- `ai_provider_configs` - Provider credentials and settings
- `ai_provider_usage_logs` - Usage metrics and audit trail
- `subscriptions` - User plan information (for model routing)

## Configuration Hierarchy

```
Priority 1: Database (AIProviderConfig)
  ├─ User-specific provider configs
  ├─ Encrypted API keys
  ├─ Last tested credentials
  └─ Active/inactive status

Priority 2: Environment Variables
  ├─ GEMINI_API_KEY
  ├─ GEMINI_MODEL_FAST
  ├─ GEMINI_MODEL_QUALITY
  └─ Fallback only if DB config missing

Priority 3: Hardcoded Defaults
  └─ In code (emergency fallback)
```

## Cost & Quota Tracking

### Cost Estimation
```python
# Per-token pricing (Gemini)
input_cost = input_tokens * (0.075 / 1_000_000)
output_cost = output_tokens * (0.30 / 1_000_000)
total_cost = input_cost + output_cost

# Stored in cents
estimated_cost_cents = int(total_cost * 100)
```

### Quota Enforcement (Framework)
```python
# Check before generation
daily_usage = await _get_daily_usage(user_id)
monthly_usage = await _get_monthly_usage(user_id)

limits = QUOTA_LIMITS[user_plan]

if daily_usage > limits.daily:
    raise QuotaExceededError("Daily quota exceeded")
if monthly_usage > limits.monthly:
    raise QuotaExceededError("Monthly quota exceeded")
```

## Performance Characteristics

### Latency Breakdown
```
Typical CV Drafting Request (Pro User):

1. Get provider config from DB        ~50ms
2. Initialize provider (Gemini)       ~100ms
3. Check quotas (DB query)            ~50ms
4. Generate content (API call)        ~2000-3000ms ← Dominant
5. Log usage (DB insert)              ~100ms
──────────────────────────────
Total latency:                        ~2200-3200ms
```

### Caching Opportunities (Future)
```python
# Cache provider configs (5 min TTL)
provider_config = await get_cached_provider(user_id)

# Cache subscription/plan info (10 min TTL)
user_plan = await get_cached_plan(user_id)

# Cache model selection (10 min TTL)
model = await get_cached_model(user_id, task)
```

## Monitoring & Alerting

### Key Metrics
```sql
-- Provider availability
SELECT provider_type, 
  SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) / COUNT(*) as success_rate
FROM ai_provider_usage_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider_type;

-- Cost trends
SELECT DATE_TRUNC('day', created_at), SUM(estimated_cost_usd)/100
FROM ai_provider_usage_logs 
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY 1 DESC;

-- Error tracking
SELECT task_type, error_message, COUNT(*) as count
FROM ai_provider_usage_logs 
WHERE status='error' AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY task_type, error_message
ORDER BY count DESC;
```

### Alerts to Implement
- ✅ High error rate (>10%) on any provider
- ✅ API latency threshold (>5s)
- ✅ Cost anomaly (>2x daily average)
- ✅ Quota exceeded incidents
- ✅ Provider credentials expiring soon

## Extension Points

### Add New Provider (e.g., Anthropic)
```python
# 1. Extend AIProvider base class
class AnthropicProvider(AIProvider):
    async def generate_content(self, prompt, ...):
        # Implement Anthropic API call
        pass

# 2. Register in ProviderFactory
ProviderFactory.PROVIDERS["anthropic"] = AnthropicProvider

# 3. Add config via /admin/providers UI
# That's it! AIOrchestrator automatically supports it
```

### Add New Task Type (e.g., "interview_prep")
```python
# 1. Add to TaskType enum
class TaskType(str, Enum):
    INTERVIEW_PREP = "interview_prep"

# 2. Add to ModelRouter policy
POLICY[plan]["interview_prep"] = model_name

# 3. Call orchestrator with new task type
response = await orchestrator.generate(
    user_id=user_id,
    task="interview_prep",
    prompt=...,
)
```

### Add Caching Layer
```python
# Wrap orchestrator.generate() with cache check:
cache_key = f"{user_id}:{task}:{hash(prompt)}"
cached = await redis.get(cache_key)
if cached:
    return cached

response = await orchestrator.generate(...)
await redis.set(cache_key, response, ex=3600)
return response
```

## Security Considerations

### API Key Protection
- ✅ Encrypted in database (Fernet/AES-256)
- ✅ Decrypted only in memory
- ✅ Never logged or cached in plain text
- ✅ Admin access restricted to SUPER_ADMIN role

### Rate Limiting
- ✅ Plan-based quota enforcement
- ✅ Per-user rate limits (future enhancement)
- ✅ Per-IP rate limits (future enhancement)

### Audit Logging
- ✅ Every API call logged to AIProviderUsageLog
- ✅ Error messages captured
- ✅ Timestamps and latencies tracked
- ✅ Enable debugging and forensics

## Deployment Checklist

- [ ] Deploy ai_orchestrator.py to backend
- [ ] Create migration: add AIProviderConfig and AIProviderUsageLog tables
- [ ] Add initial provider config (at least one active Gemini config)
- [ ] Test orchestrator with sample request
- [ ] Set up monitoring and alerts
- [ ] Migrate API routes (Phase 2)
- [ ] Update API documentation
- [ ] Train team on new pattern

