# Dynamic AI Provider System - Implementation Complete

## Overview

Successfully implemented full dynamic AI provider selection using AIOrchestrator. The system now fetches active provider configurations from the database at request time, enabling immediate adoption of new provider keys added via the admin UI.

---

## What Changed

### 1. AIOrchestrator Service (`backend/app/services/ai_orchestrator.py`)

**Fixed API Key Decryption:**
```python
async def _init_provider(self, config: AIProviderConfig):
    """Initialize provider with decrypted credentials from config."""
    from app.services.encryption_service import decrypt_token
    
    # Decrypt the API key from storage
    try:
        api_key = decrypt_token(config.api_key_encrypted)
    except Exception as e:
        logger.error(f"Failed to decrypt API key for {config.provider_type}: {e}")
        raise ValueError(f"Invalid provider credentials for {config.provider_type}")
    
    provider = self.provider_factory.create_provider(
        provider_type=config.provider_type,
        api_key=api_key,
        model_name=config.model_name,
    )
    
    if not provider.validate_credentials():
        raise ValueError(f"Provider credentials invalid for {config.provider_type}")
    
    return provider
```

**What it does:**
- Decrypts API keys stored in the database using Fernet encryption (AES-256)
- Creates provider instances dynamically at request time
- Validates credentials before using them
- Falls back to environment variables if no DB config exists

---

### 2. Job Extractor (`backend/app/api/job_extractor.py`)

**Fixed AIOrchestrator Usage (3 locations):**

**Location 1 - Image extraction:**
```python
# Before:
orchestrator = AIOrchestrator()
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="extraction",
    prompt=EXTRACTION_PROMPT,
    image_data=image_bytes,
    db=db  # ❌ Wrong placement
)

# After:
orchestrator = AIOrchestrator(db=db)  # ✅ Correct
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="extraction",
    prompt=EXTRACTION_PROMPT,
    image_data=image_bytes,
)
```

**Location 2 - URL/text extraction:**
```python
# Before:
orchestrator = AIOrchestrator()
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="extraction",
    prompt=content_to_analyze,
    db=db  # ❌ Wrong placement
)

# After:
orchestrator = AIOrchestrator(db=db)  # ✅ Correct
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="extraction",
    prompt=content_to_analyze,
)
```

**Location 3 - Image validation:**
```python
# Before:
orchestrator = AIOrchestrator()
response = await orchestrator.generate(
    user_id=user_id,
    task="extraction_validation",
    prompt=prompt,
    image_data=image_bytes,
    db=db  # ❌ Wrong placement
)

# After:
orchestrator = AIOrchestrator(db=db)  # ✅ Correct
response = await orchestrator.generate(
    user_id=user_id,
    task="extraction_validation",
    prompt=prompt,
    image_data=image_bytes,
)
```

---

### 3. CV Drafter (`backend/app/api/cv_drafter.py`)

**Fixed AIOrchestrator Usage:**
```python
# Before:
orchestrator = AIOrchestrator()
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="cv_draft",
    prompt=prompt,
    db=db  # ❌ Wrong placement
)

# After:
orchestrator = AIOrchestrator(db=db)  # ✅ Correct
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="cv_draft",
    prompt=prompt,
)
```

---

### 4. Cover Letter Generator (`backend/app/api/cover_letter.py`)

**Fixed AIOrchestrator Usage:**
```python
# Before:
orchestrator = AIOrchestrator()
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="cover_letter",
    prompt=prompt,
    db=db  # ❌ Wrong placement
)

# After:
orchestrator = AIOrchestrator(db=db)  # ✅ Correct
response_text = await orchestrator.generate(
    user_id=current_user.id,
    task="cover_letter",
    prompt=prompt,
)
```

---

## How It Works Now

### Request Flow (Dynamic Provider Selection)

```
1. User makes API request (e.g., job extraction)
   ↓
2. Route handler creates AIOrchestrator with db session
   orchestrator = AIOrchestrator(db=db)
   ↓
3. Orchestrator.generate() is called with user_id and task type
   ↓
4. Orchestrator queries database for active provider config:
   - SELECT * FROM ai_provider_configs WHERE is_active = true LIMIT 1
   ↓
5. If provider config found:
   - Decrypt API key using Fernet (AES-256)
   - Create provider instance (Gemini/OpenAI/Claude)
   - Validate credentials
   ↓
6. If no provider config found:
   - Fall back to GEMINI_API_KEY from environment variables
   - Create ephemeral Gemini provider config
   ↓
7. Execute AI request with selected provider
   ↓
8. Log usage metrics to ai_provider_usage_logs table:
   - tokens used
   - latency
   - cost estimate
   - status (success/error)
   ↓
9. Return response to user
```

### Key Benefits

✅ **Immediate Adoption:** New provider keys added via admin UI are used immediately (no restart needed)

✅ **Multi-Provider Support:** Can switch between Gemini, OpenAI, and Claude without code changes

✅ **Security:** API keys encrypted in database (Fernet AES-256)

✅ **Observability:** All usage logged with metrics (tokens, cost, latency)

✅ **Graceful Fallback:** Falls back to environment variables if no DB config exists

✅ **Plan-Aware Routing:** ModelRouter selects appropriate models based on user subscription

---

## Database Schema

### AIProviderConfig Model
```python
class AIProviderConfig(Base):
    __tablename__ = "ai_provider_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_type = Column(String, nullable=False)  # "gemini", "openai", "claude"
    api_key_encrypted = Column(String, nullable=False)  # Fernet encrypted
    model_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    max_tokens_per_day = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### AIProviderUsageLog Model
```python
class AIProviderUsageLog(Base):
    __tablename__ = "ai_provider_usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    provider_config_id = Column(Integer, ForeignKey("ai_provider_configs.id"))
    task_type = Column(String)  # "extraction", "cv_draft", "cover_letter"
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    estimated_cost_usd = Column(Integer, default=0)  # Stored in cents
    status = Column(String)  # "success", "error"
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## Admin UI Integration

### Provider Management Page
- **Path:** `/admin/providers`
- **Features:**
  - Add new provider configurations
  - Edit existing providers (change API keys, models)
  - Test provider connectivity
  - View usage statistics
  - Pagination (6 providers per page)
  - Auto-clearing success/error messages (5 sec timeout)

### API Keys Page
- **Path:** `/admin/api-keys`
- **Features:**
  - View all configured providers
  - See usage stats per provider
  - Compact card layout
  - Responsive design

---

## Testing the Implementation

### 1. Start the Backend
```bash
cd backend
source venv/bin/activate  # or activate your virtual env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Test Provider Switching

**Option A - Via Admin UI:**
1. Navigate to `http://localhost:3000/admin/providers`
2. Add a new provider (e.g., OpenAI or another Gemini key)
3. Click "Test" to validate credentials
4. Make the new provider active
5. Immediately test job extraction - new provider will be used

**Option B - Via API (curl):**
```bash
# Create new provider config
curl -X POST http://localhost:8000/api/v1/admin/providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "gemini",
    "api_key": "YOUR_NEW_GEMINI_KEY",
    "model_name": "models/gemini-2.5-flash",
    "is_active": true,
    "is_default": true
  }'

# Immediately test extraction - new key will be used
curl -X POST http://localhost:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "url=https://fuzu.com/job/12345"
```

### 3. Verify Dynamic Selection

**Check usage logs:**
```bash
# Query the database to see which provider was used
psql postgresql://postgres:postgres@localhost:5432/aditus

SELECT 
    u.email,
    p.provider_type,
    p.model_name,
    l.task_type,
    l.total_tokens,
    l.estimated_cost_usd,
    l.created_at
FROM ai_provider_usage_logs l
JOIN users u ON l.user_id = u.id
JOIN ai_provider_configs p ON l.provider_config_id = p.id
ORDER BY l.created_at DESC
LIMIT 10;
```

---

## Error Handling

### Provider Selection Failures

**No active provider found:**
```python
# Falls back to environment variables
logger.warning(f"No active provider config found. Using env defaults.")
return self._create_default_provider_config()
```

**Decryption failure:**
```python
# Raises ValueError with clear message
raise ValueError(f"Invalid provider credentials for {config.provider_type}")
```

**Credential validation failure:**
```python
# Raises ValueError before attempting generation
if not provider.validate_credentials():
    raise ValueError(f"Provider credentials invalid for {config.provider_type}")
```

### Usage Logging Failures
```python
# Logs error but doesn't break the request
except Exception as e:
    logger.error(f"Failed to log AI usage: {e}")
    # Don't raise - logging failure shouldn't break the request
```

---

## Migration Path

### For Existing Deployments

**Step 1:** Add initial provider config via migration:
```python
# migrations/add_initial_gemini_provider.py
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import get_settings
from app.db.models import AIProviderConfig
from app.services.encryption_service import encrypt_token

async def run_migration():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with AsyncSession(engine) as session:
        # Encrypt existing Gemini key from env
        encrypted_key = encrypt_token(settings.GEMINI_API_KEY)
        
        # Create provider config
        provider = AIProviderConfig(
            provider_type="gemini",
            api_key_encrypted=encrypted_key,
            model_name="models/gemini-2.5-flash",
            is_active=True,
            is_default=True,
        )
        
        session.add(provider)
        await session.commit()
        print("✅ Initial Gemini provider configured")

asyncio.run(run_migration())
```

**Step 2:** Run the migration:
```bash
cd backend
python migrations/add_initial_gemini_provider.py
```

**Step 3:** Restart the backend (if running)

**Step 4:** Test via admin UI or API

---

## Advanced Features (Future Enhancements)

### 1. Provider Failover
```python
async def _get_provider_config_with_failover(self, user_id: int):
    """Try multiple providers in order of priority."""
    providers = await self.db.execute(
        select(AIProviderConfig)
        .where(AIProviderConfig.is_active == True)
        .order_by(AIProviderConfig.priority.desc())
    )
    
    for provider in providers.scalars():
        try:
            return await self._init_provider(provider)
        except Exception as e:
            logger.warning(f"Provider {provider.provider_type} failed: {e}")
            continue
    
    # Fall back to environment
    return self._create_default_provider_config()
```

### 2. Load Balancing
```python
async def _get_provider_config_load_balanced(self, user_id: int):
    """Distribute requests across multiple active providers."""
    import random
    
    providers = await self.db.execute(
        select(AIProviderConfig)
        .where(AIProviderConfig.is_active == True)
    )
    
    active_providers = providers.scalars().all()
    
    if not active_providers:
        return self._create_default_provider_config()
    
    # Random selection (can be improved with weighted distribution)
    return random.choice(active_providers)
```

### 3. Quota Enforcement
```python
async def _check_quotas(self, user_id: int, provider_config_id: int, task: str):
    """Check if user/provider has exceeded daily quotas."""
    from datetime import datetime, timedelta
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Check provider quota
    usage = await self.db.execute(
        select(func.sum(AIProviderUsageLog.total_tokens))
        .where(
            AIProviderUsageLog.provider_config_id == provider_config_id,
            AIProviderUsageLog.created_at >= today_start
        )
    )
    
    total_tokens_today = usage.scalar() or 0
    
    provider_config = await self.db.get(AIProviderConfig, provider_config_id)
    
    if provider_config.max_tokens_per_day:
        if total_tokens_today >= provider_config.max_tokens_per_day:
            raise ValueError(f"Provider daily quota exceeded: {total_tokens_today}/{provider_config.max_tokens_per_day}")
```

---

## Summary

### Files Modified
1. `/backend/app/services/ai_orchestrator.py` - Fixed API key decryption
2. `/backend/app/api/job_extractor.py` - Fixed orchestrator instantiation (3 locations)
3. `/backend/app/api/cv_drafter.py` - Fixed orchestrator instantiation
4. `/backend/app/api/cover_letter.py` - Fixed orchestrator instantiation

### Impact
- ✅ All AI operations now use database-driven provider selection
- ✅ New provider keys are adopted immediately (no restart)
- ✅ Multi-provider support (Gemini, OpenAI, Claude)
- ✅ Usage tracking and cost estimation
- ✅ Graceful fallback to environment variables

### Next Steps
1. Test all routes with different provider configurations
2. Verify usage logging is working correctly
3. Test provider switching in production
4. Implement advanced features (failover, load balancing, quota enforcement)
5. Monitor metrics and optimize model selection

---

**Status:** ✅ Implementation Complete - Ready for Testing
**Date:** 2025-01-30
**Author:** GitHub Copilot
