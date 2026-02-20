# AIOrchestrator Quick Reference Card

**Last Updated:** February 19, 2026

---

## 🚀 Quick Start

### For Developers: Using the Orchestrator

```python
from app.services.ai_orchestrator import AIOrchestrator

# Single line replaces 5+ lines of boilerplate
orchestrator = AIOrchestrator()
response = await orchestrator.generate(
    user_id=current_user.id,
    task="cv_draft",
    prompt=prompt,
    db=db
)
```

### For Admins: Managing Providers

1. Go to `/admin/providers`
2. Click "Add Provider"
3. Enter API key and model name
4. Click "Test Credentials"
5. Mark as "Active/Default"
6. Done! All routes now use it

---

## 🏗️ Architecture Quick View

```
API Routes
  ↓
AIOrchestrator
  ├─ Provider Config (DB)
  ├─ Model Router (Plan-aware)
  ├─ Provider Factory (Init)
  └─ Usage Logger (Metrics)
  ↓
Gemini/OpenAI/Claude
```

---

## 📊 Model Selection

| Your Plan | Task | Model |
|-----------|------|-------|
| Free/Paygo | Extract | `gemini-2.5-flash` |
| Free/Paygo | CV Draft | `gemini-2.5-flash` |
| Pro | Extract | `gemini-2.5-flash` |
| Pro | CV Draft | `gemini-1.5-pro` ⭐ |

---

## 💰 Cost Estimation

```
Job Extraction:   ~1-2¢ per job
CV Drafting:      ~6-10¢ per CV (Pro users)
Cover Letter:     ~5-8¢ per letter
```

---

## 📈 Usage Tracking

Every API call logs:
- Tokens used (input + output)
- Estimated cost
- Latency
- Provider used
- User ID
- Task type
- Status (success/error)

View in: `ai_provider_usage_logs` table

---

## 🔌 Convenience Functions

```python
# Instead of orchestrator.generate(), use these:

# Job Extraction
await orchestrator.extract_job_data(
    user_id=123,
    prompt="...",
    image_data=None,
    db=db
)

# CV Drafting
await orchestrator.draft_cv(
    user_id=123,
    master_profile=profile_dict,
    job_data=job_dict,
    db=db
)

# Cover Letter
await orchestrator.draft_cover_letter(
    user_id=123,
    master_profile=profile_dict,
    job_data=job_dict,
    db=db
)
```

---

## 🛠️ Provider Configuration

### In Database (Preferred)
```
Table: ai_provider_configs
├─ provider_type: "gemini" | "openai" | "claude"
├─ api_key_encrypted: (Fernet encrypted)
├─ model_name: "models/gemini-1.5-pro"
├─ is_active: true
└─ is_default: true
```

### In Environment (Fallback)
```bash
GEMINI_API_KEY=sk-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
```

---

## 🧪 Testing the Routes

### Extract Job
```bash
curl -X POST http://localhost:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "url=https://jobs.example.com/123"
```

### Draft CV
```bash
curl -X POST http://localhost:8000/api/v1/cv-drafter/draft \
  -H "Authorization: Bearer $TOKEN" \
  -J '{"job_id": 123}'
```

### Generate Cover Letter
```bash
curl -X POST http://localhost:8000/api/v1/cover-letter/generate \
  -H "Authorization: Bearer $TOKEN" \
  -J '{"job_id": 123, "tone": "professional"}'
```

---

## 📋 Monitoring Queries

### Top AI Tasks
```sql
SELECT task_type, COUNT(*), AVG(total_tokens), SUM(estimated_cost_usd)
FROM ai_provider_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY task_type;
```

### Cost by Plan
```sql
SELECT 
  u.id,
  s.plan_type,
  COUNT(*) as calls,
  SUM(l.estimated_cost_usd) / 100.0 as cost_usd
FROM ai_provider_usage_logs l
JOIN users u ON l.user_id = u.id
LEFT JOIN subscriptions s ON u.id = s.user_id
GROUP BY u.id, s.plan_type
ORDER BY cost_usd DESC;
```

### Error Rate by Provider
```sql
SELECT 
  provider_config_id,
  COUNT(*) as total,
  SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as errors,
  (SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as error_pct
FROM ai_provider_usage_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider_config_id;
```

---

## ⚙️ Configuration Quick Links

| Component | Location | Purpose |
|-----------|----------|---------|
| Orchestrator | `/backend/app/services/ai_orchestrator.py` | Core service |
| Providers | `/backend/app/services/universal_provider.py` | Abstraction layer |
| Model Router | `/backend/app/services/model_router.py` | Plan-aware routing |
| Admin API | `/backend/app/api/provider_admin.py` | CRUD endpoints |
| Admin Dashboard | `/admin/providers` | UI for management |

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "No active provider" | No provider config | Add via `/admin/providers` |
| "Invalid API key" | Wrong credentials | Check `AIProviderConfig` table |
| "Quota exceeded" | Daily limit reached | Wait for reset or upgrade plan |
| "Provider error" | External API failure | Check provider status, try again |
| "Model not found" | Invalid model name | Use correct model name (e.g., `models/gemini-1.5-pro`) |

---

## 🔐 Security

- ✅ API keys encrypted at rest (Fernet/AES-256)
- ✅ Decrypted only in memory
- ✅ Admin access requires SUPER_ADMIN role
- ✅ All operations logged to `ai_provider_usage_logs`
- ✅ No credentials in logs or errors

---

## 📱 API Response Format

All AI routes return:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Route-specific data here
  }
}
```

On error:
```json
{
  "success": false,
  "message": "Error description",
  "error_code": "PROVIDER_ERROR" | "INVALID_INPUT" | etc
}
```

---

## 🎯 Implementation Status

| Component | Status | Files |
|-----------|--------|-------|
| Core Orchestrator | ✅ Complete | `ai_orchestrator.py` |
| Job Extractor | ✅ Migrated | `job_extractor.py` |
| CV Drafter | ✅ Migrated | `cv_drafter.py` |
| Cover Letter | ✅ Migrated | `cover_letter.py` |
| Admin Dashboard | ✅ Complete | `admin/providers` |
| Documentation | ✅ Complete | 5 docs, 1,500+ lines |

---

## 📚 Full Documentation

| Guide | Purpose | Link |
|-------|---------|------|
| Implementation | Technical details | [AIORCHESTRATOR_IMPLEMENTATION.md](AIORCHESTRATOR_IMPLEMENTATION.md) |
| Migration | How to migrate routes | [AIORCHESTRATOR_MIGRATION_GUIDE.md](AIORCHESTRATOR_MIGRATION_GUIDE.md) |
| Architecture | System design | [AIORCHESTRATOR_ARCHITECTURE.md](AIORCHESTRATOR_ARCHITECTURE.md) |
| Phase 1 Summary | Step 1 completion | [STEP1_AIORCHESTRATOR_COMPLETE.md](STEP1_AIORCHESTRATOR_COMPLETE.md) |
| Phase 2 Summary | Step 2 completion | [STEP2_ROUTE_MIGRATION_COMPLETE.md](STEP2_ROUTE_MIGRATION_COMPLETE.md) |
| Full Index | Complete journey | [AIORCHESTRATOR_INDEX.md](AIORCHESTRATOR_INDEX.md) |

---

## 🎓 Next Steps

- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Monitor usage metrics
- [ ] Gather feedback from admins
- [ ] Deploy to production
- [ ] Implement quota enforcement (Phase 3)
- [ ] Add caching layer (Phase 3)

---

**Questions?** Check the relevant documentation file above or review the implementation code.

