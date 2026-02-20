# Dynamic Provider System - Testing Guide

## Quick Start Testing

### Prerequisites
- Backend running on `http://127.0.0.1:8000`
- Frontend running on `http://localhost:3000`
- PostgreSQL database accessible
- At least one AI provider API key (Gemini, OpenAI, or Claude)

---

## Test Scenario 1: Initial Setup with Gemini

### Step 1: Run the migration to create initial provider
```bash
cd /home/caleb/kiptoo/trybe/leAI/backend
python migrations/add_initial_gemini_provider.py
```

**Expected output:**
```
🔧 Starting migration: add_initial_gemini_provider
🔐 Encrypting API key...
📝 Creating default Gemini provider configuration...

✅ Migration completed successfully!
   Provider ID: 1
   Provider Type: gemini
   Model: models/gemini-2.5-flash
   Active: True
   Default: True

🎉 Your app will now use database-driven provider selection!
   You can add more providers via the admin UI at /admin/providers
```

### Step 2: Verify in admin UI
1. Navigate to `http://localhost:3000/admin/providers`
2. You should see 1 provider card:
   - Provider: Gemini
   - Model: gemini-2.5-flash
   - Status: Active (green badge)
   - Actions: Test, Edit, Delete buttons

### Step 3: Test provider connectivity
1. Click the "Test" button on the Gemini provider card
2. Wait for the test to complete (~2-5 seconds)
3. You should see a green success message:
   ```
   ✅ Provider test successful! Gemini is working correctly.
   ```
4. Message auto-disappears after 5 seconds

---

## Test Scenario 2: Add a Second Provider

### Option A - Via Admin UI (Recommended)

1. Navigate to `http://localhost:3000/admin/providers`
2. Scroll to the "Add New Provider" form
3. Fill in the form:
   - **Provider Type:** Select "OpenAI" (or "Gemini" for a second key)
   - **API Key:** Paste your OpenAI API key
   - **Model Name:** `gpt-4o-mini`
   - **Active:** Check the box ✅
   - **Default:** Check the box ✅ (will deactivate previous default)
   - **Max Daily Tokens:** Leave blank (no quota)
4. Click "Add Provider"
5. Wait for success message:
   ```
   ✅ Provider added successfully
   ```

### Option B - Via API

```bash
# Get your JWT token first (login)
JWT_TOKEN="your_jwt_token_here"

# Add OpenAI provider
curl -X POST http://127.0.0.1:8000/api/v1/admin/providers \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "openai",
    "api_key": "sk-proj-...",
    "model_name": "gpt-4o-mini",
    "is_active": true,
    "is_default": true,
    "max_tokens_per_day": null
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Provider added successfully",
  "data": {
    "id": 2,
    "provider_type": "openai",
    "model_name": "gpt-4o-mini",
    "is_active": true,
    "is_default": true,
    "created_at": "2025-01-30T10:30:00Z"
  }
}
```

---

## Test Scenario 3: Immediate Provider Switching

### Test that new provider is used WITHOUT restarting backend

**Before adding new provider:**
```bash
# Extract a job using current provider (Gemini #1)
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "url=https://fuzu.com/job/some-job-id"
```

**Check usage logs to see which provider was used:**
```sql
SELECT 
    p.provider_type,
    p.model_name,
    l.task_type,
    l.total_tokens,
    l.created_at
FROM ai_provider_usage_logs l
JOIN ai_provider_configs p ON l.provider_config_id = p.id
ORDER BY l.created_at DESC
LIMIT 5;
```

**Result should show:**
```
 provider_type |       model_name        | task_type  | total_tokens |     created_at
---------------+-------------------------+------------+--------------+---------------------
 gemini        | models/gemini-2.5-flash | extraction |          450 | 2025-01-30 10:25:00
```

**Now add the second provider (OpenAI) via admin UI**

**Immediately test extraction again (NO backend restart):**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "url=https://brightermonday.co.ke/job/another-job"
```

**Check usage logs again:**
```sql
SELECT 
    p.provider_type,
    p.model_name,
    l.task_type,
    l.total_tokens,
    l.created_at
FROM ai_provider_usage_logs l
JOIN ai_provider_configs p ON l.provider_config_id = p.id
ORDER BY l.created_at DESC
LIMIT 5;
```

**Result should show NEW provider was used:**
```
 provider_type |  model_name   | task_type  | total_tokens |     created_at
---------------+---------------+------------+--------------+---------------------
 openai        | gpt-4o-mini   | extraction |          520 | 2025-01-30 10:35:00  ✅ NEW!
 gemini        | models/...    | extraction |          450 | 2025-01-30 10:25:00
```

**✅ SUCCESS:** New provider adopted immediately without restart!

---

## Test Scenario 4: Test All AI Routes

### 4.1 Job Extraction (job_extractor.py)

**URL-based extraction:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "url=https://fuzu.com/job/12345"
```

**Image-based extraction:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "image=@job_screenshot.jpg"
```

**Manual text extraction:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "raw_text=Job Title: Software Engineer\nCompany: TechCorp..."
```

### 4.2 CV Drafting (cv_drafter.py)

```bash
# Get job ID from previous extraction
JOB_ID=123

curl -X POST http://127.0.0.1:8000/api/v1/cv-drafter/draft \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": '$JOB_ID'
  }'
```

### 4.3 Cover Letter Generation (cover_letter.py)

```bash
curl -X POST http://127.0.0.1:8000/api/v1/cover-letter/generate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": '$JOB_ID',
    "tone": "professional"
  }'
```

### 4.4 Image Validation (job_extractor.py validation endpoint)

```bash
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/validate-image \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "image=@screenshot.jpg"
```

**After each test, check usage logs to confirm provider was used:**
```sql
SELECT 
    u.email,
    p.provider_type,
    l.task_type,
    l.status,
    l.total_tokens,
    l.estimated_cost_usd,
    l.latency_ms,
    l.created_at
FROM ai_provider_usage_logs l
JOIN users u ON l.user_id = u.id
JOIN ai_provider_configs p ON l.provider_config_id = p.id
ORDER BY l.created_at DESC
LIMIT 10;
```

---

## Test Scenario 5: Provider Failover to Environment Fallback

### Simulate no active provider in database

1. Deactivate all providers via admin UI:
   - Go to each provider card
   - Click "Edit"
   - Uncheck "Active"
   - Click "Save"

2. Test extraction:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "url=https://fuzu.com/job/12345"
```

3. Check backend logs:
```
WARNING: No active provider config found. Using env defaults.
```

4. Verify extraction still works (using GEMINI_API_KEY from .env)

5. Check usage logs:
```sql
SELECT 
    p.provider_type,
    l.provider_config_id,
    l.task_type
FROM ai_provider_usage_logs l
LEFT JOIN ai_provider_configs p ON l.provider_config_id = p.id
ORDER BY l.created_at DESC
LIMIT 5;
```

**Expected:**
```
 provider_type | provider_config_id | task_type
---------------+--------------------+------------
 NULL          |               NULL | extraction  ✅ Fallback used
```

---

## Test Scenario 6: Provider Switching Between Tasks

Test that each task can use a different provider if desired (future feature)

### Setup: Multiple providers for different tasks
1. Gemini for extraction (fast, cheap)
2. OpenAI for CV drafting (higher quality)
3. Claude for cover letters (better writing)

Currently, all tasks use the same active provider, but the architecture supports task-specific routing via `provider_type_override`:

```python
# In AIOrchestrator.generate()
response = await orchestrator.generate(
    user_id=user_id,
    task="cv_draft",
    prompt=prompt,
    provider_type="openai"  # Force OpenAI for CV drafting
)
```

---

## Test Scenario 7: Error Handling

### 7.1 Invalid API Key

1. Add a provider with an invalid API key
2. Try to use it:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "url=https://fuzu.com/job/12345"
```

**Expected response:**
```json
{
  "detail": "Provider credentials invalid for gemini"
}
```

### 7.2 Decryption Failure

This shouldn't happen in normal operation, but to simulate:
1. Manually corrupt the encrypted API key in the database
2. Try to use the provider

**Expected response:**
```json
{
  "detail": "Invalid provider credentials for gemini"
}
```

### 7.3 Provider Test Failure

1. Add a provider with invalid API key
2. Click "Test" button in admin UI

**Expected:**
```
❌ Provider test failed: Invalid API key
```

---

## Test Scenario 8: Usage Metrics Verification

### Generate some usage
1. Extract 3 jobs
2. Draft 2 CVs
3. Generate 1 cover letter

### Check aggregated metrics
```sql
-- Total tokens used per provider
SELECT 
    p.provider_type,
    p.model_name,
    COUNT(*) as requests,
    SUM(l.total_tokens) as total_tokens,
    SUM(l.estimated_cost_usd) as total_cost_cents,
    AVG(l.latency_ms) as avg_latency_ms
FROM ai_provider_usage_logs l
JOIN ai_provider_configs p ON l.provider_config_id = p.id
GROUP BY p.id, p.provider_type, p.model_name;
```

**Expected output:**
```
 provider_type |     model_name          | requests | total_tokens | total_cost_cents | avg_latency_ms
---------------+-------------------------+----------+--------------+------------------+----------------
 gemini        | models/gemini-2.5-flash |        3 |         1500 |               45 |           2300
 openai        | gpt-4o-mini             |        3 |         1800 |              120 |           1800
```

### Check per-user usage
```sql
SELECT 
    u.email,
    COUNT(*) as requests,
    SUM(l.total_tokens) as total_tokens,
    SUM(l.estimated_cost_usd) as total_cost_cents
FROM ai_provider_usage_logs l
JOIN users u ON l.user_id = u.id
GROUP BY u.id, u.email
ORDER BY total_tokens DESC;
```

---

## Test Scenario 9: Admin UI Pagination

1. Add 10+ providers (mix of Gemini, OpenAI, Claude)
2. Navigate to `/admin/providers`
3. Verify pagination:
   - Page 1 shows 6 providers
   - "Next" button appears
   - Click "Next" to see remaining providers
   - "Previous" button appears
   - Page counter shows "Page X of Y"

---

## Test Scenario 10: Success Message Auto-Clear

1. Navigate to `/admin/providers`
2. Add a new provider
3. Observe success message appears (green background)
4. Wait 5 seconds
5. Message should auto-disappear

Same test for:
- Provider test success
- Provider edit success
- Provider delete success

---

## Troubleshooting

### Issue: "No active provider configured"

**Cause:** No provider in database and no GEMINI_API_KEY in environment

**Solution:**
```bash
cd backend
python migrations/add_initial_gemini_provider.py
```

### Issue: "Provider credentials invalid"

**Cause:** API key is incorrect or expired

**Solution:**
1. Go to `/admin/providers`
2. Click "Edit" on the failing provider
3. Update the API key
4. Click "Test" to verify
5. Click "Save"

### Issue: Usage logs show `provider_config_id = NULL`

**Cause:** Fallback to environment variables was used

**Solution:**
1. Ensure at least one provider is active in the database
2. Check `ai_provider_configs` table:
```sql
SELECT * FROM ai_provider_configs WHERE is_active = true;
```

### Issue: Backend not using new provider after adding via UI

**Cause:** Database session might not be refreshing

**Solution:**
1. Check that provider `is_active = true` in database
2. Restart backend (shouldn't be needed, but try it)
3. Check backend logs for errors

---

## Performance Benchmarks

### Expected Latencies (with Gemini 2.5-flash)

- Job extraction: 2-5 seconds
- CV drafting: 3-7 seconds
- Cover letter: 2-4 seconds
- Image validation: 1-3 seconds

### Token Usage Estimates

- Job extraction: 300-800 tokens
- CV drafting: 1000-2500 tokens
- Cover letter: 400-800 tokens
- Image validation: 50-100 tokens

### Cost Estimates (Gemini 2.5-flash pricing)

- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

Example:
- Job extraction: ~$0.0003 (0.03 cents)
- CV drafting: ~$0.0012 (0.12 cents)
- Cover letter: ~$0.0005 (0.05 cents)

**Daily costs for 100 users (10 extractions each):**
- 1000 extractions × $0.0003 = $0.30/day
- 1000 CV drafts × $0.0012 = $1.20/day
- Total: ~$1.50/day for AI operations

---

## Success Criteria

✅ **Core Functionality:**
- [ ] Migration creates initial provider from environment
- [ ] Admin UI shows provider list with pagination
- [ ] Can add new provider via UI
- [ ] Test button validates provider credentials
- [ ] Success messages auto-clear after 5 seconds

✅ **Dynamic Provider Selection:**
- [ ] New provider is used immediately without restart
- [ ] Usage logs show correct provider_config_id
- [ ] Fallback to environment works when no active provider
- [ ] All 4 AI routes use AIOrchestrator correctly

✅ **Security:**
- [ ] API keys are encrypted in database
- [ ] Decryption works correctly
- [ ] Invalid keys are rejected with clear error messages

✅ **Observability:**
- [ ] Usage logs capture all requests
- [ ] Metrics include tokens, cost, latency
- [ ] Error messages are logged for failed requests

---

**Status:** Ready for comprehensive testing
**Estimated test time:** 30-45 minutes for full suite
