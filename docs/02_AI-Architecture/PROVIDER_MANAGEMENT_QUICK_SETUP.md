# Provider Management Quick Setup

## TL;DR

The AI Provider Management System lets super_admins swap between Gemini, OpenAI, and Claude at runtime without code changes.

## Quick Start (5 minutes)

### 1. Access Admin Dashboard

1. Login as a super_admin user
2. Navigate to `http://localhost:3000/admin/providers`

### 2. Create Your First Provider Config

Click **"Add Provider"** and fill:

```
Provider Type: gemini
API Key: <your-gemini-api-key>
Model Name: gemini-2.5-flash
Display Name: Gemini Fast (Budget)
Use For: ✓ Job Extraction ✓ Image Validation
Daily Limit: 1000000 (tokens)
```

Click **"Create Provider"** → Test credentials → Done!

### 3. Verify Integration

The system automatically routes:
- **Extraction** → Your Gemini provider
- **Image validation** → Your Gemini provider
- Other tasks → Default provider

Check usage stats under **"Usage Statistics (Last 30 Days)"**

---

## Common Configurations

### Setup 1: Budget-Conscious (Gemini Only)

Use the cheap, fast Gemini model for everything:

```
Config 1: Gemini 2.5 Flash
├─ Model: gemini-2.5-flash
├─ Default: YES
├─ Use For: Extraction, CV Draft, Cover Letter, Validation
└─ Daily Limit: 1000000
```

**Cost:** ~$0.075/1000 input tokens

### Setup 2: Quality-First (GPT-4 + Gemini Fallback)

Premium model for prose, cheap model for structure:

```
Config 1: Gemini 2.5 Flash (Primary)
├─ Model: gemini-2.5-flash
├─ Use For: Extraction, Validation
└─ Daily Limit: 500000

Config 2: GPT-4o Mini (Secondary)
├─ Model: gpt-4o-mini
├─ Use For: CV Draft, Cover Letter
└─ Daily Limit: 500000
```

**Cost:** ~$1.50/1000 input tokens (averaged)

### Setup 3: Multi-Provider (Maximum Flexibility)

Test all three providers:

```
Config 1: Gemini 2.5 Flash
├─ Model: gemini-2.5-flash
├─ Use For: Extraction, Validation

Config 2: GPT-4o Mini
├─ Model: gpt-4o-mini
├─ Use For: CV Draft

Config 3: Claude 3.5 Sonnet
├─ Model: claude-3-5-sonnet-20241022
├─ Use For: Cover Letter
```

---

## Admin Dashboard Walkthrough

### Provider List View

Shows all configured providers in a card layout:

```
╔════════════════════════════════════════╗
║ GEMINI gemini-2.5-flash               ║
║ Gemini Fast (Budget)                   ║
║ [ACTIVE] [DEFAULT]                     ║
║ ──────────────────────────────────────║
║ Model: gemini-2.5-flash                ║
║ Status: ✓ Valid (tested Jan 16)        ║
║ Daily Limit: 1000000 tokens            ║
║ Usage: 📊 📝 ✉️ (extraction, CV, cover)║
║ ──────────────────────────────────────║
║ [Test] [Edit] [Delete]                 ║
╚════════════════════════════════════════╝
```

**Color coding:**
- 🔵 Gemini: Blue gradient
- 🟢 OpenAI: Green gradient
- 🟣 Claude: Purple gradient

### Create/Edit Form

Form fields:

| Field | Required | Notes |
|-------|----------|-------|
| Provider Type | Yes | Can't change after creation |
| Model Name | Yes | e.g., `gpt-4o-mini` |
| API Key | Yes* | Leave blank on edit to keep current |
| Display Name | No | e.g., "GPT-4 Mini (CV Draft)" |
| Description | No | Internal notes |
| Active | - | Disable without deleting |
| Default | - | Mark as fallback provider |
| Use For (checkboxes) | - | Which tasks use this provider |
| Daily Token Limit | No | Optional rate limiting |
| Monthly Token Limit | No | Optional rate limiting |

### Test Credentials Button

Before saving, click **"Test"** to validate:

```
✓ Provider test successful
  Credentials: Valid
  Tested: Jan 16 @ 2:45 PM
  Ready to use!
```

Or error:

```
✗ Provider test failed
  Error: Invalid API key format
  Suggestion: Check key starts with sk- for OpenAI
```

### Usage Statistics

Last 30 days breakdown:

```
┌─────────────────────────────────────┐
│ GEMINI                              │
├─────────────────────────────────────┤
│ Calls: 1024                         │
│ Tokens: 450,000                     │
│ Cost: $2.25                         │
│ Success Rate: 99.8%                 │
│ Avg Latency: 850ms                  │
└─────────────────────────────────────┘
```

---

## API Key Formats

### Gemini

Get from: [Google AI Studio](https://aistudio.google.com/app/apikey)

```
Format: AIzaSy... (long string)
Prefix: AIzaSy
Length: ~40 characters
```

### OpenAI

Get from: [OpenAI Platform](https://platform.openai.com/account/api-keys)

```
Format: sk-... (starts with sk-)
Prefix: sk-
Length: ~48 characters
```

### Claude (Anthropic)

Get from: [Anthropic Console](https://console.anthropic.com/account/keys)

```
Format: sk-ant-... 
Prefix: sk-ant-
Length: ~200+ characters
```

---

## Encryption & Security

### How It Works

1. **Admin uploads API key** → Encrypted with Fernet (AES-256)
2. **Key stored in database** → As encrypted blob
3. **At request time** → Only decrypted in memory for single use
4. **Never logged or displayed** → Even to super_admin after creation

### What's Protected

✓ API keys encrypted at rest
✓ Keys only decrypted when needed
✓ All admin changes audited in `AdminActionLog`
✓ MFA required for provider management

### What's NOT Protected

✗ This is a backend system - frontend should use strong auth
✗ Don't share super_admin credentials
✗ Rotate API keys regularly in provider dashboards

---

## Monitoring & Cost Control

### Daily Token Limits

Prevent accidental overspend:

```
// Example: Gemini at $0.000075/token
Daily limit: 1,000,000 tokens = $75/day max
```

When limit hit:
1. API calls return 429 Too Many Requests
2. Usage log records as "error"
3. Error notification sent to super_admin
4. Switch to fallback provider (if configured)

### Monthly Token Limits

Higher-level budget control:

```
// Example: GPT-4 at $0.001/token
Monthly limit: 30,000,000 tokens = $30k/month max
```

### Cost Tracking Query

```python
# Get cost per provider this month
SELECT 
    provider_type, 
    SUM(estimated_cost_usd) as total_cost,
    COUNT(*) as api_calls,
    AVG(latency_ms) as avg_latency
FROM ai_provider_usage_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY provider_type
ORDER BY total_cost DESC;
```

---

## Troubleshooting

### Q: "Provider test successful" but API calls fail

**A:** Test validates credentials format, not actual API function. Check:
1. API key has correct permissions (e.g., "Gemini API" enabled in Google Cloud)
2. API account is active and not suspended
3. No rate limiting on API key
4. Model name exactly matches provider's offering

### Q: Want to switch providers mid-week

**A:** No problem! You can:
1. Create new provider config with new API key
2. Update task routing checkboxes
3. Set as default if needed
4. Old provider stays active (usage keeps logging)
5. Delete old provider when confident

### Q: How to add provider to just ONE task type

**A:** Create separate configs:

```
Config A: OpenAI (gpt-4o-mini)
└─ Only checked: CV Drafting

Config B: Gemini (fast)
└─ Only checked: Extraction + Validation + Cover Letter
```

Then both configs are "active" but serve different tasks.

### Q: Monitor cost in real-time

**A:** Check usage stats dashboard - updates every request.
For detailed analysis, use SQL:

```sql
-- Today's cost by provider
SELECT provider_type, SUM(estimated_cost_usd) as cost
FROM ai_provider_usage_logs
WHERE DATE(created_at) = CURDATE()
GROUP BY provider_type;

-- Hourly trends
SELECT 
    DATE_TRUNC(created_at, HOUR) as hour,
    provider_type,
    COUNT(*) as calls,
    SUM(estimated_cost_usd) as cost
FROM ai_provider_usage_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour, provider_type
ORDER BY hour DESC;
```

---

## Best Practices

### ✅ DO

- Test credentials before deploying to production
- Set reasonable daily limits to prevent surprises
- Review usage stats weekly
- Rotate API keys every 3-6 months
- Monitor error rates and latency
- Use cheaper models for simple tasks
- Keep fallback provider configured

### ❌ DON'T

- Hardcode API keys in environment variables (use admin panel)
- Share super_admin credentials
- Deploy provider configs without testing
- Ignore usage alerts (costs can spike fast)
- Use production API keys in development
- Keep expired API keys active (delete them)

---

## Integration Checklist

- [ ] Backend: universal_provider.py deployed
- [ ] Backend: provider_admin.py API endpoints registered in main.py
- [ ] Database: AIProviderConfig table migrated
- [ ] Database: AIProviderUsageLog table migrated
- [ ] Frontend: Admin pages at /admin/providers deployed
- [ ] Frontend: Authentication token properly configured
- [ ] API Routes: job_extractor.py uses ProviderFactory (if updated)
- [ ] API Routes: cv_drafter.py uses ProviderFactory (if updated)
- [ ] API Routes: cover_letter.py uses ProviderFactory (if updated)
- [ ] Seeding: Initial Gemini provider config created
- [ ] Testing: Created test config, verified test endpoint
- [ ] Monitoring: Checked usage stats in admin dashboard
- [ ] Documentation: Team trained on provider management
- [ ] Backup: Initial API keys backed up securely

---

## Next Steps

1. **Now:** Create first provider config in admin panel
2. **Next:** Test credentials with test endpoint
3. **After:** Monitor usage stats over first week
4. **Later:** Add secondary provider for redundancy
5. **Finally:** Update API routes if custom routing needed

For detailed documentation, see [PROVIDER_MANAGEMENT_SYSTEM.md](./PROVIDER_MANAGEMENT_SYSTEM.md)
