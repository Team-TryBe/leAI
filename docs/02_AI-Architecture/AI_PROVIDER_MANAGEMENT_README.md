# 🤖 AI Provider Management System

## Overview

**Universal AI Provider System** allows super_admins to dynamically switch between different AI models (Gemini, OpenAI, Claude) without code changes. Configure providers once, route tasks intelligently, monitor costs in real-time.

```
┌─────────────────────────────────────────────────────────────┐
│              Admin Dashboard                                │
│  /admin/providers                                            │
│  ├─ List provider configs                                   │
│  ├─ Create/Edit configs (Gemini, OpenAI, Claude)           │
│  ├─ Test API credentials                                    │
│  └─ View usage statistics & costs                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              API Routes                                      │
│  /api/v1/job-extractor/extract         → Provider 1         │
│  /api/v1/cv-drafter/draft              → Provider 2         │
│  /api/v1/cover-letter/generate         → Provider 3         │
│  /api/v1/job-extractor/validate-image  → Provider 1         │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
    [Gemini]   [OpenAI]   [Claude]
    Fast/Cheap  GPT-4o   Quality/Expensive
```

## ✨ Features

### 🎛️ Configuration Management
- **Create/Edit Providers** - Add Gemini, OpenAI, or Claude with encrypted API keys
- **Task-Based Routing** - Assign different providers for extraction, CV drafting, cover letters, validation
- **Rate Limiting** - Set daily/monthly token limits per provider
- **Provider Testing** - Validate credentials before deployment

### 📊 Monitoring & Analytics
- **Usage Dashboard** - View API calls, tokens, and costs by provider
- **Cost Tracking** - Monitor spend per provider, task type, and user
- **Performance Metrics** - Track latency, success rates, error trends
- **Historical Data** - Query usage patterns over time

### 🔒 Security
- **API Key Encryption** - Keys encrypted with Fernet (AES-256) at rest
- **Access Control** - Only super_admins can manage providers (MFA required)
- **Audit Logging** - All provider changes tracked in AdminActionLog
- **Credential Validation** - Test endpoints before saving to database

### 💰 Cost Optimization
- **Model Selection** - Use cheap models (Gemini) for simple tasks, quality models (GPT-4) for complex tasks
- **Intelligent Routing** - Task-aware provider selection reduces costs
- **Budget Alerts** - Get notified when approaching token limits
- **Cost Estimation** - Real-time cost calculation per API call

## 🚀 Quick Start (5 minutes)

### 1. Access Admin Panel

```
http://localhost:3000/admin/providers
(Must be logged in as super_admin)
```

### 2. Create First Provider

Click **"Add Provider"** and fill:

```
Provider Type:       Gemini
API Key:            [paste your key]
Model Name:         gemini-2.5-flash
Display Name:       Gemini Fast (Budget)
Use For:            ✓ Job Extraction
                    ✓ Image Validation
Daily Limit:        1000000
```

Click **"Create Provider"** → **"Test"** → Done! ✓

### 3. View Statistics

Navigate to **"Usage Statistics (Last 30 Days)"** section to see:
- API calls made
- Tokens consumed
- Cost (USD)
- Success rate
- Average latency

## 📋 Configuration Examples

### Setup 1: Budget-Conscious (Gemini Only)
```
✓ Provider: Gemini 2.5 Flash
  ├─ Model: gemini-2.5-flash
  ├─ Use For: All tasks (extraction, CV, cover letter, validation)
  ├─ Daily Limit: 1000000 tokens (~$75/day)
  └─ Cost: ~$0.075/1000 tokens
```

### Setup 2: Quality-First (Dual Provider)
```
✓ Provider 1: Gemini 2.5 Flash (Primary)
  ├─ Use For: Extraction, Validation
  └─ Cost: ~$0.075/1000 tokens

✓ Provider 2: GPT-4o Mini (Premium)
  ├─ Use For: CV drafting, Cover letters
  └─ Cost: ~$0.15/1000 tokens (input)
```

### Setup 3: Multi-Provider (A/B Testing)
```
✓ Provider 1: Gemini
  ├─ Model: gemini-2.5-flash
  └─ Use For: Extraction, Validation

✓ Provider 2: OpenAI
  ├─ Model: gpt-4o-mini
  └─ Use For: CV drafting

✓ Provider 3: Claude
  ├─ Model: claude-3-5-sonnet-20241022
  └─ Use For: Cover letters
```

## 🎯 Common Tasks

### Add New Provider

```
1. Admin Dashboard → Add Provider
2. Select provider type (Gemini/OpenAI/Claude)
3. Enter API key
4. Configure model name and display name
5. Select which tasks use this provider
6. Click "Test Credentials"
7. If test passes → Click "Create Provider"
```

### Switch Providers Between Tasks

```
1. Edit existing provider config
2. Uncheck current task types
3. Check new task types
4. Save changes
   → New extractions automatically use new provider
```

### Monitor Costs

```
1. Dashboard → Usage Statistics
2. View "Total Cost" by provider
3. Check "Success Rate" and "Avg Latency"
4. Set alerts in monitoring system (Prometheus/CloudWatch)
```

### Rotate API Keys

```
1. Edit provider config
2. Enter new API key
3. Leave old key field empty to replace
4. Click "Test Credentials"
5. If valid → Save
   → Next API call uses new key
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [PROVIDER_MANAGEMENT_SYSTEM.md](./PROVIDER_MANAGEMENT_SYSTEM.md) | Complete system documentation with architecture, APIs, security |
| [PROVIDER_MANAGEMENT_QUICK_SETUP.md](./PROVIDER_MANAGEMENT_QUICK_SETUP.md) | 5-minute quick start guide with troubleshooting |
| [PROVIDER_INTEGRATION_GUIDE.md](./PROVIDER_INTEGRATION_GUIDE.md) | How to integrate provider system into API routes |
| [PROVIDER_SYSTEM_IMPLEMENTATION_STATUS.md](./PROVIDER_SYSTEM_IMPLEMENTATION_STATUS.md) | Implementation checklist and deployment guide |

## 🔌 API Endpoints

### Admin Management

```
GET    /api/v1/super-admin/providers/configs           # List all
POST   /api/v1/super-admin/providers/configs           # Create
GET    /api/v1/super-admin/providers/configs/{id}      # Get one
PUT    /api/v1/super-admin/providers/configs/{id}      # Update
DELETE /api/v1/super-admin/providers/configs/{id}      # Delete
POST   /api/v1/super-admin/providers/configs/{id}/test # Test credentials
GET    /api/v1/super-admin/providers/usage/stats       # Usage stats
```

### Usage Example

```bash
# Create Gemini provider
curl -X POST http://localhost:8000/api/v1/super-admin/providers/configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "gemini",
    "api_key": "AIzaSy...",
    "model_name": "gemini-2.5-flash",
    "display_name": "Gemini Fast",
    "is_active": true,
    "default_for_extraction": true
  }'

# Get usage stats
curl http://localhost:8000/api/v1/super-admin/providers/usage/stats?days=30 \
  -H "Authorization: Bearer $TOKEN"
```

## 🔐 Security

### What's Protected
✓ API keys encrypted at rest (Fernet/AES-256)
✓ All admin actions audited (AdminActionLog)
✓ MFA required for sensitive operations
✓ Keys only decrypted in memory for single use

### Best Practices
- ✅ Test credentials before deployment
- ✅ Rotate API keys every 3-6 months
- ✅ Monitor usage stats weekly
- ✅ Set reasonable token limits
- ✅ Enable email alerts for cost anomalies
- ❌ Never share super_admin credentials
- ❌ Never hardcode API keys
- ❌ Never use production keys in development

## 📊 Monitoring

### Key Metrics
- `ai_provider_requests_total` - API calls by provider
- `ai_provider_tokens_used` - Token consumption
- `ai_provider_cost_usd` - Running cost total
- `ai_provider_latency_ms` - Response time
- `ai_provider_error_rate` - Failure percentage

### Example Dashboard Query

```sql
-- Daily cost by provider (last 30 days)
SELECT 
    DATE(created_at) as date,
    provider_type,
    SUM(estimated_cost_usd)/100.0 as cost_usd,
    COUNT(*) as calls,
    AVG(latency_ms) as avg_latency_ms
FROM ai_provider_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), provider_type
ORDER BY date DESC, cost_usd DESC;
```

## 🆘 Troubleshooting

### Q: "Invalid credentials" when testing
**A:** Verify API key format and permissions in provider's console

### Q: Provider not being used by routes
**A:** Ensure config is marked `is_active: true` and check route code

### Q: High costs suddenly
**A:** Check usage logs for spikes, lower daily limit, add secondary provider

### Q: Need to switch providers
**A:** Edit config, change task routing checkboxes, save - takes effect immediately

See [PROVIDER_MANAGEMENT_QUICK_SETUP.md](./PROVIDER_MANAGEMENT_QUICK_SETUP.md) for full troubleshooting guide.

## 📁 File Structure

```
Backend:
├── app/services/universal_provider.py      # Provider abstraction
├── app/api/provider_admin.py               # Admin API endpoints
├── app/db/models.py                        # AIProviderConfig, AIProviderUsageLog
├── app/core/config.py                      # GEMINI_MODEL_FAST, GEMINI_MODEL_QUALITY
├── migrations/add_ai_provider_tables.py    # Database migration
└── main.py                                 # Router registration

Frontend:
└── app/admin/providers/page.tsx            # Admin dashboard UI

Documentation:
├── PROVIDER_MANAGEMENT_SYSTEM.md           # Complete docs
├── PROVIDER_MANAGEMENT_QUICK_SETUP.md      # Quick start
├── PROVIDER_INTEGRATION_GUIDE.md           # Integration guide
└── PROVIDER_SYSTEM_IMPLEMENTATION_STATUS.md # Deployment checklist
```

## 🎓 Learning Path

1. **Start Here** → [PROVIDER_MANAGEMENT_QUICK_SETUP.md](./PROVIDER_MANAGEMENT_QUICK_SETUP.md) (5 min read)
2. **Admin Dashboard** → Create first provider and test
3. **Monitoring** → Check usage stats after first API calls
4. **Deep Dive** → [PROVIDER_MANAGEMENT_SYSTEM.md](./PROVIDER_MANAGEMENT_SYSTEM.md) for architecture
5. **Integration** → [PROVIDER_INTEGRATION_GUIDE.md](./PROVIDER_INTEGRATION_GUIDE.md) if updating routes

## 🚀 Deployment

### Pre-Deployment Checklist
- [ ] Backend service deployed with provider_admin router
- [ ] Frontend admin pages accessible
- [ ] Database tables created (run migration)
- [ ] Initial provider config seeded

### Staging Testing
- [ ] Create test provider in admin dashboard
- [ ] Verify credentials test passes
- [ ] Monitor usage logs populate
- [ ] Test provider switching

### Production Rollout
- [ ] Seed Gemini config with prod API key
- [ ] Monitor error rates for 24 hours
- [ ] Gradually enable routing to 100%
- [ ] Keep hardcoded fallback initially

## 📞 Support

For questions:
1. Check troubleshooting section above
2. Review [PROVIDER_MANAGEMENT_QUICK_SETUP.md](./PROVIDER_MANAGEMENT_QUICK_SETUP.md)
3. See [PROVIDER_MANAGEMENT_SYSTEM.md](./PROVIDER_MANAGEMENT_SYSTEM.md) for detailed docs
4. Check backend logs: `docker logs aditus-backend`

## 🎯 Next Steps

- [ ] Access admin dashboard at `/admin/providers`
- [ ] Create first provider (Gemini recommended)
- [ ] Test credentials
- [ ] View usage stats after first API call
- [ ] Add secondary provider for resilience
- [ ] Review cost dashboard weekly

---

**Status:** ✅ Backend Complete | ✅ Frontend Complete | ⏳ Integration Pending  
**Last Updated:** January 2024  
**Next Phase:** Integration with API routes (job_extractor.py, cv_drafter.py, cover_letter.py)
