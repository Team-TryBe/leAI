# AI Provider Management System

## Overview

The AI Provider Management System allows super_admins to configure and manage multiple AI providers (Gemini, OpenAI, Claude) at runtime without code changes. This enables:

1. **Cost Optimization** - Use cheaper models for simple tasks (extraction), quality models for complex tasks (CV drafting)
2. **Redundancy** - Switch providers if one fails or rate-limits
3. **Experimentation** - A/B test different models
4. **Task-Specific Routing** - Different providers for different use cases

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Admin UI                           │
│  (/admin/providers/page.tsx)                                    │
│  - List all provider configs                                    │
│  - Create/Edit configurations                                   │
│  - Test credentials                                             │
│  - View usage statistics                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Provider Admin API                                 │
│  (/api/v1/super-admin/providers/*)                              │
│  - CRUD operations on AIProviderConfig                          │
│  - Credential validation                                        │
│  - Usage statistics endpoint                                    │
│  - Audit logging                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│           Universal Provider Abstraction                        │
│  (universal_provider.py)                                        │
│  - AIProvider abstract base class                               │
│  - GeminiProvider implementation                                │
│  - OpenAIProvider implementation                                │
│  - ClaudeProvider implementation                                │
│  - ProviderFactory for instantiation                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴──────────┐
                    ↓                   ↓
        ┌──────────────────┐   ┌──────────────────┐
        │ APIProviderConfig│   │ Credentials      │
        │ (Database)       │   │ Validation       │
        │ - Encrypted Keys │   │ & Encryption     │
        │ - Task Routing   │   │                  │
        │ - Rate Limits    │   │ (encrypt_token/) │
        │ - Usage Logs     │   │ (decrypt_token)  │
        └──────────────────┘   └──────────────────┘
```

## Database Schema

### AIProviderConfig Table

Stores provider configurations with encryption:

```python
class AIProviderConfig(Base):
    __tablename__ = "ai_provider_configs"
    
    id: int                                    # Primary key
    provider_type: AIProviderType             # GEMINI, OPENAI, CLAUDE
    api_key_encrypted: str                    # Encrypted API key (Fernet)
    model_name: str                           # e.g., "gpt-4o-mini"
    display_name: Optional[str]               # User-friendly name
    description: Optional[str]                # Internal notes
    is_active: bool                           # Enable/disable without deletion
    is_default: bool                          # Default provider
    
    # Task-specific routing
    default_for_extraction: bool              # Use for job extraction
    default_for_cv_draft: bool                # Use for CV generation
    default_for_cover_letter: bool            # Use for cover letter
    default_for_validation: bool              # Use for image validation
    
    # Rate limiting
    daily_token_limit: Optional[int]          # Tokens per day
    monthly_token_limit: Optional[int]        # Tokens per month
    
    # Status tracking
    last_tested_at: Optional[datetime]        # Last credential test
    last_test_success: Optional[bool]         # Test result
    
    # Metadata
    created_by_id: int                        # Super admin who created
    created_at: datetime
    updated_at: datetime
```

### AIProviderUsageLog Table

Tracks API usage for cost analysis:

```python
class AIProviderUsageLog(Base):
    __tablename__ = "ai_provider_usage_logs"
    
    id: int
    provider_config_id: int                   # Foreign key to config
    user_id: int                              # User who triggered the call
    task_type: str                            # extraction, cv_draft, cover_letter, validation
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    status: str                               # success, error, timeout
    latency_ms: int
    created_at: datetime
```

## API Endpoints

### List Configurations

```
GET /api/v1/super-admin/providers/configs
Authorization: Bearer <jwt_token>
Response: ApiResponse[List[AIProviderConfigResponse]]

Example:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "provider_type": "gemini",
      "model_name": "gemini-2.5-flash",
      "display_name": "Gemini Fast (Budget)",
      "is_active": true,
      "is_default": true,
      "default_for_extraction": true,
      "default_for_cv_draft": false,
      "last_test_success": true,
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "provider_type": "openai",
      "model_name": "gpt-4o-mini",
      "display_name": "OpenAI 4 (Quality)",
      "is_active": true,
      "is_default": false,
      "default_for_cv_draft": true,
      "default_for_cover_letter": true,
      "last_test_success": true,
      "created_at": "2024-01-16T14:20:00Z"
    }
  ]
}
```

### Get Configuration Details

```
GET /api/v1/super-admin/providers/configs/{config_id}
Authorization: Bearer <jwt_token>

Returns full config (excluding API key)
```

### Create Configuration

```
POST /api/v1/super-admin/providers/configs
Authorization: Bearer <jwt_token>
Content-Type: application/json

Request:
{
  "provider_type": "openai",
  "api_key": "sk-...",
  "model_name": "gpt-4o-mini",
  "display_name": "OpenAI GPT-4 Mini",
  "description": "Cheaper model for CV drafting",
  "is_active": true,
  "is_default": false,
  "default_for_cv_draft": true,
  "default_for_cover_letter": true,
  "daily_token_limit": 1000000,
  "monthly_token_limit": 30000000
}

Response:
{
  "success": true,
  "data": {
    "id": 2,
    "provider_type": "openai",
    "model_name": "gpt-4o-mini",
    "is_active": true,
    "last_test_success": true,
    "created_at": "2024-01-16T14:20:00Z"
  }
}
```

**Note:** API key is validated before storage and encrypted using Fernet (AES-256).

### Update Configuration

```
PUT /api/v1/super-admin/providers/configs/{config_id}
Authorization: Bearer <jwt_token>

Request:
{
  "api_key": "",  # Leave empty to keep current key
  "model_name": "gpt-4o",  # Can upgrade model
  "is_active": false,  # Disable provider
  "default_for_cv_draft": false,
  "daily_token_limit": 500000
}

Response: Updated AIProviderConfigResponse
```

### Test Credentials

```
POST /api/v1/super-admin/providers/configs/{config_id}/test
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": {
    "is_valid": true,
    "message": "Provider credentials are valid",
    "tested_at": "2024-01-16T14:21:00Z"
  }
}
```

### Delete Configuration

```
DELETE /api/v1/super-admin/providers/configs/{config_id}
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": { "deleted_id": 2 }
}
```

### Usage Statistics

```
GET /api/v1/super-admin/providers/usage/stats?days=30
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": [
    {
      "provider_type": "gemini",
      "model_name": "gemini-2.5-flash",
      "total_calls": 1024,
      "total_tokens": 450000,
      "total_cost_usd": 2.25,
      "success_rate": 99.8,
      "avg_latency_ms": 850,
      "last_7_days_calls": 256,
      "last_30_days_calls": 1024
    },
    {
      "provider_type": "openai",
      "model_name": "gpt-4o-mini",
      "total_calls": 512,
      "total_tokens": 280000,
      "total_cost_usd": 8.40,
      "success_rate": 99.2,
      "avg_latency_ms": 1200,
      "last_7_days_calls": 128,
      "last_30_days_calls": 512
    }
  ]
}
```

## Frontend Admin Dashboard

Located at `/admin/providers/page.tsx`

### Features

1. **Provider List View**
   - Display all configured providers with status badges
   - Show provider type, model name, activity status
   - Quick actions: Edit, Delete, Test, View Stats
   - Color-coded by provider (Gemini=Blue, OpenAI=Green, Claude=Purple)

2. **Create/Edit Form**
   - Provider type selector (disabled for edit to prevent confusion)
   - API key input with secure handling
   - Model name field
   - Display name and description
   - Task routing checkboxes (Extraction, CV Drafting, Cover Letters, Validation)
   - Rate limit configuration
   - Test button to validate credentials before saving

3. **Usage Statistics Dashboard**
   - Cost tracking per provider
   - Success rates and error monitoring
   - Token usage trends
   - Average latency metrics
   - Last 7 days vs. last 30 days comparison

4. **Error Handling**
   - Toast notifications for success/error
   - Form validation with helpful error messages
   - Credential validation before database save

## Integration with API Routes

### Job Extractor
```python
# Before: Hardcoded Gemini
model_name = settings.GEMINI_MODEL_FAST

# After: Provider-aware routing
provider_config = await get_default_provider_config(db, TaskType.EXTRACTION)
provider = ProviderFactory.create_provider(
    provider_config.provider_type,
    decrypt_token(provider_config.api_key_encrypted),
    provider_config.model_name
)

# Log usage
await log_usage(db, provider_config.id, user.id, TaskType.EXTRACTION, tokens, cost)
```

### CV Drafter
```python
# Use provider for quality tasks
provider_config = await get_default_provider_config(db, TaskType.CV_DRAFT)
provider = ProviderFactory.create_provider(...)
```

### Cover Letter Generator
```python
# Use provider for cover letter generation
provider_config = await get_default_provider_config(db, TaskType.COVER_LETTER)
provider = ProviderFactory.create_provider(...)
```

## Security Considerations

### API Key Encryption

API keys are encrypted using Fernet (symmetric encryption):

```python
# Encryption
from app.services.encryption_service import encrypt_token
encrypted_key = encrypt_token(api_key)
provider_config.api_key_encrypted = encrypted_key

# Decryption (only at request time)
from app.services.encryption_service import decrypt_token
api_key = decrypt_token(provider_config.api_key_encrypted)
```

**Keys are NEVER returned to frontend or logged.**

### Access Control

- Only SUPER_ADMIN role can access provider management
- MFA required for sensitive operations
- Audit logging via `log_sensitive_action()`
- IP address tracking for compliance

### Best Practices

1. **Rotate Keys Regularly** - Update API keys periodically in production
2. **Monitor Usage** - Check usage statistics for anomalies
3. **Test Credentials** - Use the test endpoint before production deployment
4. **Set Rate Limits** - Prevent runaway costs with token limits
5. **Audit Trail** - Review `AdminActionLog` for all provider changes

## Configuration Examples

### Production Setup (Gemini + OpenAI Fallback)

1. Create primary provider: **Gemini 2.5 Flash** (extraction, validation)
2. Create secondary provider: **GPT-4o Mini** (CV drafting, cover letters)
3. Set daily token limits to prevent surprises
4. Monitor usage stats weekly

### Development Setup (All Models)

1. Create config for each provider with dev API keys
2. Set `is_active: false` for providers you're not testing
3. Use test endpoint to verify credentials
4. Switch `is_default` between providers to test switching

### Budget-Conscious Setup (Gemini Only)

1. Single Gemini config for all tasks
2. Use fast model (`gemini-2.5-flash`) for everything
3. Monitor cost metrics in usage stats
4. No fallback needed for simple use case

## Cost Tracking

### Understanding Costs

```
estimated_cost_usd = (input_tokens * input_price) + (output_tokens * output_price)

Example (GPT-4o Mini):
- Input: 1000 tokens × $0.00015 = $0.15
- Output: 500 tokens × $0.0006 = $0.30
- Total: $0.45
```

### Usage Reports

```python
# Get monthly cost by provider
stats = await get_usage_stats(db, days=30)
for stat in stats:
    print(f"{stat.provider_type}: ${stat.total_cost_usd}/month")
```

## Troubleshooting

### Issue: "Invalid credentials" on test

**Solution:**
- Verify API key format (some providers require specific prefixes)
- Check API key has correct permissions for the model
- Ensure API key is for the correct provider account
- Retry test after confirming key in provider's dashboard

### Issue: Provider not being used

**Solution:**
- Verify config is marked `is_active: true`
- Check task routing: ensure `default_for_*` is set for your use case
- Verify config is set as `is_default: true` or specific task route is enabled
- Check API routes have been updated to use ProviderFactory

### Issue: Rate limit errors

**Solution:**
- Lower `daily_token_limit` in config
- Check usage stats for spikes
- Consider adding secondary provider for load distribution
- Review error logs for which provider is hitting limits

## Migration from Hardcoded Models

### Step 1: Deploy Provider System

1. Create database tables (migration)
2. Deploy backend with universal_provider.py
3. Deploy frontend admin pages
4. Deploy provider_admin.py API router

### Step 2: Seed Initial Providers

Create initial config with current GEMINI_API_KEY:

```python
# In database migration or init script
await create_provider_config(
    provider_type=AIProviderType.GEMINI,
    api_key=settings.GEMINI_API_KEY,
    model_name=settings.GEMINI_MODEL_FAST,
    display_name="Gemini 2.5 Flash (Primary)",
    is_active=True,
    is_default=True,
    default_for_extraction=True,
    default_for_cv_draft=True,
    default_for_cover_letter=True,
    default_for_validation=True
)
```

### Step 3: Update API Routes

Update job_extractor.py, cv_drafter.py, cover_letter.py to:

1. Query provider config by task type
2. Instantiate via ProviderFactory
3. Log usage metrics
4. Handle fallback to secondary provider on failure

### Step 4: Test in Staging

1. Create multiple provider configs in staging
2. Use admin dashboard to switch providers
3. Verify usage logs are populated correctly
4. Test failover behavior

### Step 5: Deploy to Production

1. Create Gemini config first (current setup)
2. Add secondary providers as backup
3. Monitor usage stats closely
4. Gradually route new traffic through new providers

## Future Enhancements

1. **Provider Fallback Chain**
   - Define fallback order when primary fails
   - Auto-retry with secondary provider

2. **Cost Optimization AI**
   - Suggest cheaper models based on usage patterns
   - Alert on anomalous costs

3. **Provider Health Dashboard**
   - Real-time provider status (up/down)
   - Error rate tracking
   - Performance metrics

4. **Advanced Rate Limiting**
   - Per-user quotas in addition to global limits
   - Burst protection
   - Auto-throttling

5. **Model Capabilities Matrix**
   - Track which models support which features
   - Auto-select best model for task
   - Graceful degradation if feature unavailable
