# Quotas & Caching Implementation Guide

## Overview

This document details the implementation of quota enforcement and intelligent caching in the AIOrchestrator. These features work together to:

1. **Control costs** through quota limits and cache reuse
2. **Improve performance** with 3-tier intelligent caching
3. **Enhance user experience** with plan-based feature differentiation
4. **Provide visibility** into usage and optimization opportunities

---

## Part 1: Quota Management

### Architecture

```
User Request
    ↓
AIOrchestrator.generate()
    ├─ Check Quotas (QuotaManager)
    │  ├─ Get user plan & limits
    │  ├─ Check daily token usage
    │  ├─ Check monthly token usage
    │  └─ Check hourly API call rate
    │
    ├─ If quota OK: Proceed to generation
    └─ If quota exceeded: Raise QuotaError → User gets 429 Too Many Requests
```

### Quota Limits by Plan

| Plan | Daily Tokens | Monthly Tokens | Hourly Calls | Cost/month |
|---|---|---|---|---|
| Freemium | 10K | 100K | 100 | Free |
| Pay-as-you-go | 50K | 500K | 500 | $0-custom |
| Pro Monthly | 1M | 30M | 5K | $29.99 |
| Pro Annual | 2M | 60M | 10K | $299/year |
| Enterprise | Unlimited | Unlimited | Unlimited | Custom |

### Implementation Details

**Location:** `backend/app/services/quota_manager.py`

**Key Classes:**
- `QuotaManager`: Main quota enforcement class
- `QuotaConfig`: Configuration for limits and estimates
- `QuotaError`: Custom exception for exceeded quotas

**Main Method:**
```python
async def check_quota(
    user_id: int,
    task_type: str,
    estimated_tokens: Optional[int] = None,
) -> Tuple[bool, str]:
    """
    Check if user can make request within quota.
    Returns (is_allowed, message).
    Raises QuotaError if exceeded.
    """
```

### Usage Examples

#### Example 1: Pre-flight Quota Check

```python
from app.services.quota_manager import QuotaManager, QuotaError

async def extract_job_endpoint(request: ExtractJobRequest, db: AsyncSession, user_id: int):
    quota_mgr = QuotaManager(db=db)
    
    try:
        # Check before expensive operation
        await quota_mgr.check_quota(
            user_id=user_id,
            task_type="extraction",
            estimated_tokens=1024,
        )
    except QuotaError as e:
        return JSONResponse(
            status_code=429,
            content={"error": str(e), "quota_status": await quota_mgr.get_quota_status(user_id)}
        )
    
    # Proceed with extraction
    ...
```

#### Example 2: Get Quota Status for Dashboard

```python
async def get_quota_status_endpoint(user_id: int, db: AsyncSession):
    quota_mgr = QuotaManager(db=db)
    status = await quota_mgr.get_quota_status(user_id)
    
    return {
        "plan": "pro_monthly",
        "daily": {
            "used": 234_567,
            "limit": 1_000_000,
            "remaining": 765_433,
            "percentage": 23,
            "warning_level": "ok"  # ok, warning, critical, exceeded
        },
        "monthly": {
            "used": 5_234_567,
            "limit": 30_000_000,
            "remaining": 24_765_433,
            "percentage": 17,
            "warning_level": "ok"
        },
        "resets_at": {
            "daily": "2024-02-20T00:00:00Z",
            "monthly": "2024-03-01T00:00:00Z"
        }
    }
```

### Warning Levels

| Level | Condition | Action |
|---|---|---|
| `ok` | < 50% used | No restrictions |
| `warning` | 50-80% used | Show warning badge in UI |
| `critical` | 80-95% used | Show red warning, suggest upgrade |
| `exceeded` | > 95% used | Block generation, force upgrade/wait |

### Database Query: Monitor Quota Usage

```sql
-- Total tokens used by each user (this month)
SELECT 
    u.email,
    s.plan_type,
    DATE_TRUNC('month', aul.created_at) as month,
    COUNT(*) as api_calls,
    SUM(aul.total_tokens) as total_tokens,
    SUM(aul.estimated_cost_usd) / 100.0 as cost_usd
FROM ai_provider_usage_logs aul
JOIN users u ON u.id = aul.user_id
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
WHERE DATE_TRUNC('month', aul.created_at) = DATE_TRUNC('month', NOW())
GROUP BY u.email, s.plan_type, DATE_TRUNC('month', aul.created_at)
ORDER BY total_tokens DESC;
```

---

## Part 2: Intelligent Caching

### Architecture: 3-Tier Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│ TIER 1: System Cache (Permanent, Shared)               │
│ ├─ CV drafting rules & formatting                      │
│ ├─ ATS keywords lists                                  │
│ ├─ Cover letter templates                              │
│ └─ Shared across all users, never expires              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 2: Session Cache (30min-2hr TTL, Per-User)        │
│ ├─ Extracted job descriptions (30-90 min)             │
│ ├─ User profile data (30-120 min)                      │
│ ├─ Job search results (30-120 min)                     │
│ └─ Reused within same session for consistency          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 3: Content Cache (1-4hr TTL, Per-User)            │
│ ├─ Generated CVs (1-4 hours)                           │
│ ├─ Generated cover letters (1-4 hours)                 │
│ ├─ Interview preparation notes (1-4 hours)            │
│ └─ Task-specific optimized for quality                 │
└─────────────────────────────────────────────────────────┘
```

### Plan-Based Cache Tiers

| Cache Type | Free | Pro Monthly | Pro Annual | Enterprise |
|---|---|---|---|---|
| System | ✓ (shared) | ✓ (shared) | ✓ (shared) | ✓ (shared) |
| Session | ✗ | 30 min | 60 min | 120 min |
| Content | ✗ | 60 min | 120 min | 240 min |
| Extraction | ✗ | 45 min | 90 min | 180 min |

### Implementation Details

**Location:** `backend/app/services/cache_manager.py`

**Key Classes:**
- `CacheManager`: Main caching interface
- `CacheType`: Enum for cache types (system, session, content, extraction)
- `CacheTier`: Plan-based tier classification

**Cost Savings (per cache hit):**
- System cache: $0.0002 (lightweight reuse)
- Session cache: $0.0015 (shared job descriptions)
- Content cache: $0.0050 (full generation avoided)
- Extraction cache: $0.0008 (extraction overhead avoided)

### Usage Examples

#### Example 1: Cache a System Prompt

```python
from app.services.ai_orchestrator import AIOrchestrator

async def initialize_system_cache(db: AsyncSession):
    """Called on app startup to pre-cache system prompts."""
    orchestrator = AIOrchestrator(db=db)
    
    # Cache CV drafting rules (permanent, never expires)
    await orchestrator.cache_system_prompt(
        prompt_key="cv_drafting_system",
        content="""You are an expert ATS-optimized CV writer...
            
Rules:
1. Single column layout for ATS compatibility
2. Include quantified achievements
3. Keywords must match job description
...""",
        description="CV drafting system prompt for Kenyan job market"
    )
    
    # Cache cover letter template
    await orchestrator.cache_system_prompt(
        prompt_key="cover_letter_template",
        content="Dear Hiring Manager,\n\n[Opening paragraph]...",
        description="Professional cover letter template"
    )
```

#### Example 2: Generate with Session Caching

```python
from app.services.cache_manager import CacheManager

async def extract_job_with_cache(
    db: AsyncSession,
    user_id: int,
    job_url: str,
) -> Dict:
    """Extract job description with automatic caching."""
    
    cache_mgr = CacheManager(db=db)
    orchestrator = AIOrchestrator(db=db)
    
    # Hash URL for cache key
    url_hash = await cache_mgr.get_hash(job_url)
    cache_key = f"job_extraction_{url_hash}"
    
    # Try session cache first (30-120 min TTL based on plan)
    cached = await cache_mgr.get_cache(
        key=cache_key,
        user_id=user_id,
        cache_type=CacheType.EXTRACTION,
    )
    
    if cached:
        logger.info(f"Cache hit! Saved ~$0.0008 by reusing extraction")
        return {
            **cached["data"],
            "cached": True,
            "cost_saved_usd": cached["saved_cost_usd"],
        }
    
    # Cache miss - extract and cache
    response = await orchestrator.generate_cached(
        user_id=user_id,
        task="extraction",
        prompt=f"Extract key details from job: {job_url}",
        cache_key=cache_key,
    )
    
    return {
        **response,
        "cached": False,
    }
```

#### Example 3: Retrieve Cached System Prompt

```python
async def draft_cv_with_cached_system(
    db: AsyncSession,
    user_id: int,
    master_profile: Dict,
    job_data: Dict,
) -> str:
    """Draft CV using cached system prompt."""
    
    orchestrator = AIOrchestrator(db=db)
    
    # Get cached system prompt (fast, no API call)
    system_prompt = await orchestrator.get_system_prompt_from_cache(
        "cv_drafting_system"
    )
    
    if not system_prompt:
        # Fallback if not cached yet
        from app.core.prompts import get_cv_tailoring_prompts
        system_prompt = get_cv_tailoring_prompts().get("system", "")
    
    # Generate CV (will use cached system prompt)
    response = await orchestrator.generate_cached(
        user_id=user_id,
        task="cv_draft",
        prompt=f"Profile: {json.dumps(master_profile)}\n\nJob: {json.dumps(job_data)}",
        system_prompt=system_prompt,
        cache_key=f"cv_draft_{user_id}_{job_id}",
    )
    
    return response["response"]
```

#### Example 4: Cleanup Expired Caches

```python
from app.services.cache_manager import CacheManager

async def cleanup_task():
    """Background task to clean expired caches."""
    async with SessionLocal() as db:
        cache_mgr = CacheManager(db=db)
        
        # Delete all expired entries
        deleted = await cache_mgr.cleanup_expired_caches()
        logger.info(f"Cleaned up {deleted} expired cache entries")
        
        # Delete user's session cache on logout
        # await cache_mgr.cleanup_user_caches(user_id=user_id)
```

#### Example 5: Monitor Cache Performance

```python
async def get_cache_analytics_endpoint(user_id: Optional[int] = None, db: AsyncSession):
    """Get cache statistics for admin dashboard."""
    cache_mgr = CacheManager(db=db)
    
    stats = await cache_mgr.get_cache_stats(user_id=user_id)
    
    return {
        "total_entries": stats["total_entries"],
        "total_hits": stats["total_hits"],  # How many times cache was reused
        "estimated_cost_saved_usd": stats["estimated_cost_saved_usd"],
        "storage_mb": stats["storage_mb"],
        "average_ttl_minutes": stats["average_ttl_minutes"],
        "by_type": stats["by_type"],  # Breakdown by cache type
    }
```

### Database Schema

```sql
CREATE TABLE ai_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL,           -- Unique key
    cache_type VARCHAR(50) NOT NULL,           -- system, session, content, extraction
    cache_data TEXT NOT NULL,                  -- JSON-serialized data
    user_id INTEGER REFERENCES "user"(id),    -- NULL for system caches
    expires_at TIMESTAMP,                      -- NULL = never expires
    metadata JSONB,                            -- Custom metadata
    access_count INTEGER DEFAULT 0,            -- Track hits for analytics
    created_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(cache_key, cache_type, user_id)    -- Prevent duplicates
);

-- Performance indexes
CREATE INDEX idx_ai_cache_key_type ON ai_cache(cache_key, cache_type);
CREATE INDEX idx_ai_cache_user_expires ON ai_cache(user_id, expires_at);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at) WHERE expires_at IS NOT NULL;
```

---

## Part 3: Integration Guide

### Step 1: Run Migrations

```bash
cd backend

# Create AICache table
python migrations/add_ai_cache.py

# Verify
psql postgresql://postgres:postgres@localhost:5432/aditus
> SELECT * FROM ai_cache LIMIT 0;
> SELECT * FROM information_schema.tables WHERE table_name = 'ai_cache';
```

### Step 2: Initialize System Caches

```python
# backend/main.py - Add to lifespan startup

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan with initialization."""
    # Startup
    logger.info("Initializing system caches...")
    
    async with SessionLocal() as db:
        orchestrator = AIOrchestrator(db=db)
        
        # Cache system prompts
        await orchestrator.cache_system_prompt(
            "cv_drafting_system",
            get_cv_tailoring_prompts().get("system", ""),
            "CV drafting rules and formatting"
        )
        
        await orchestrator.cache_system_prompt(
            "cover_letter_template",
            get_cover_letter_prompts().get("system", ""),
            "Cover letter template"
        )
    
    logger.info("System caches initialized")
    yield
    
    # Shutdown
    logger.info("Shutting down...")
```

### Step 3: Add Quota Checks to Routes

```python
# backend/app/api/job_extractor.py

from app.services.quota_manager import QuotaManager, QuotaError

@router.post("/extract")
async def extract_job(
    request: ExtractJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Extract job data with quota enforcement."""
    
    quota_mgr = QuotaManager(db=db)
    
    try:
        # Check quota before expensive operation
        await quota_mgr.check_quota(
            user_id=current_user.id,
            task_type="extraction",
        )
    except QuotaError as e:
        quota_status = await quota_mgr.get_quota_status(current_user.id)
        raise HTTPException(
            status_code=429,
            detail=str(e),
            headers={"X-Quota-Status": json.dumps(quota_status)}
        )
    
    # Proceed with extraction
    orchestrator = AIOrchestrator(db=db)
    response = await orchestrator.generate_cached(
        user_id=current_user.id,
        task="extraction",
        prompt=f"Extract from: {request.url}",
        cache_key=f"extraction_{await cache_mgr.get_hash(request.url)}",
    )
    
    return response
```

### Step 4: Add Cache Cleanup Background Task

```python
# backend/app/services/background_tasks.py

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

async def setup_background_tasks():
    """Setup periodic background tasks."""
    scheduler = AsyncIOScheduler()
    
    # Clean expired caches every hour
    scheduler.add_job(
        cleanup_expired_caches,
        "interval",
        minutes=60,
        id="cleanup_caches"
    )
    
    scheduler.start()

async def cleanup_expired_caches():
    """Cleanup expired cache entries."""
    async with SessionLocal() as db:
        cache_mgr = CacheManager(db=db)
        deleted = await cache_mgr.cleanup_expired_caches()
        logger.info(f"Cleaned {deleted} expired caches")
```

### Step 5: Frontend Integration

```typescript
// frontend/src/lib/api.ts

// Add quota status to response headers
export const fetchWithQuota = async (endpoint: string) => {
    const response = await api.get(endpoint);
    
    const quotaStatus = response.headers["x-quota-status"];
    if (quotaStatus) {
        store.dispatch(setQuotaStatus(JSON.parse(quotaStatus)));
    }
    
    return response;
};

// Display quota warning
export function QuotaIndicator({ user }: { user: User }) {
    const quota = useAppSelector(state => state.quota);
    
    if (quota.warning_level === "critical") {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Quota Warning</AlertTitle>
                <AlertDescription>
                    {quota.daily.percentage}% of daily quota used.
                    Consider upgrading to Pro.
                </AlertDescription>
            </Alert>
        );
    }
    
    return null;
}
```

---

## Part 4: Best Practices & Recommendations

### Quota Best Practices

#### 1. **Grace Periods for Free Users**
```python
# Allow 10% overage for better UX
QUOTA_GRACE_PERIOD = 0.10  # 10%

if daily_used + tokens > limit * (1 + QUOTA_GRACE_PERIOD):
    # Only then fail
    raise QuotaError()
```

#### 2. **Soft Limits with Notifications**
```python
# Warn at 80%, hard block at 100%
if daily_pct >= 80:
    send_email(user, "Approaching daily quota limit")

if daily_pct >= 95:
    raise QuotaError("Quota exceeded")
```

#### 3. **Per-Task Quotas (Future Enhancement)**
```python
# Different quotas for different tasks
TASK_QUOTAS = {
    "extraction": 0.2,      # 20% of daily quota
    "cv_draft": 0.5,        # 50% of daily quota
    "cover_letter": 0.3,    # 30% of daily quota
}

task_limit = daily_quota * TASK_QUOTAS[task]
```

### Caching Best Practices

#### 1. **Cache Key Naming Convention**
```python
# Clear, hierarchical cache keys
"system_prompt_cv"
"session_job_{url_hash}"
"content_cv_draft_{user_id}_{job_id}"
"extraction_{url_hash}"
```

#### 2. **Metadata for Tracking**
```python
# Always include metadata for analytics
await cache_mgr.set_session_cache(
    key=cache_key,
    content=data,
    metadata={
        "source": "api/extraction",
        "model": "gemini-2.5-flash",
        "task": "extraction",
        "input_tokens": 1024,
        "user_plan": "pro_monthly",
    }
)
```

#### 3. **Cache Invalidation Strategy**
```python
# When to invalidate:

# 1. User updates profile → Clear user cache
async def update_profile(user_id, profile_data):
    await cache_mgr.cleanup_user_caches(user_id)
    # Update database...

# 2. Job description changes → Clear extraction cache
async def update_job(job_id, new_description):
    url_hash = await cache_mgr.get_hash(job_url)
    await cache_mgr.delete_cache(f"extraction_{url_hash}")

# 3. System prompt updates → Clear ALL system caches
async def update_cv_system_prompt(new_prompt):
    from app.services.cache_manager import CacheType
    await cache_mgr.delete_cache(
        key="cv_drafting_system",
        cache_type=CacheType.SYSTEM
    )
    # Re-cache the new prompt
    await orchestrator.cache_system_prompt(...)
```

#### 4. **Cache Hit Ratio Monitoring**
```python
# Dashboard endpoint to track cache effectiveness
async def get_cache_metrics():
    stats = await cache_mgr.get_cache_stats()
    
    hit_ratio = stats["total_hits"] / stats["total_entries"] if stats["total_entries"] > 0 else 0
    
    return {
        "cache_hit_ratio": f"{hit_ratio*100:.1f}%",
        "total_cost_saved": stats["estimated_cost_saved_usd"],
        "storage_used": stats["storage_mb"],
        "recommendation": (
            "Excellent" if hit_ratio > 0.7 else
            "Good" if hit_ratio > 0.5 else
            "Consider cache TTL optimization"
        )
    }
```

---

## Part 5: Advanced Enhancements

### 1. **Adaptive Caching Based on Usage Patterns**

```python
# Auto-adjust cache TTL based on user behavior
async def get_adaptive_ttl(user_id: int) -> int:
    """
    Increase cache TTL for power users who reuse
    the same job descriptions frequently.
    """
    stats = await cache_mgr.get_cache_stats(user_id=user_id)
    hit_ratio = stats["total_hits"] / max(stats["total_entries"], 1)
    
    if hit_ratio > 0.7:
        return 120  # 2 hours for high reuse
    elif hit_ratio > 0.5:
        return 90   # 1.5 hours for medium reuse
    else:
        return 30   # 30 min for low reuse
```

### 2. **Predictive Cache Warming**

```python
# Pre-cache likely next operations based on user pattern
async def warm_cache_predictively(user_id: int):
    """
    If user extracted a job, pre-cache system prompts
    for CV/cover letter they'll likely request next.
    """
    cache_mgr = CacheManager(db=db)
    orchestrator = AIOrchestrator(db=db)
    
    # Warm system caches
    system_prompts = [
        ("cv_drafting_system", "CV drafting rules"),
        ("cover_letter_template", "Cover letter template"),
    ]
    
    for key, description in system_prompts:
        cached = await cache_mgr.get_cache(key=key)
        if not cached:
            # Pre-cache it
            await orchestrator.cache_system_prompt(key, description)
```

### 3. **Cost-Aware Caching Decision**

```python
# Only cache for Pro+ users to optimize costs
async def should_cache(user_id: int, task: str) -> bool:
    """
    Only cache if cost savings exceed storage cost.
    
    Cache cost: ~$0.001 per GB/month storage
    Task cost: ~$0.0005-0.005 per request
    """
    tier = await cache_mgr.get_user_cache_tier(user_id)
    
    # Don't cache free users (storage cost not worth it)
    if tier == CacheTier.FREE:
        return False
    
    # Cache Pro+ users
    return True
```

### 4. **Quota Override for Loyal Users**

```python
# Grace period for users approaching quota
async def get_effective_quota(user_id: int, plan: PlanType):
    """
    Give 20% bonus quota for annual subscribers
    who've been loyal customers.
    """
    user = await db.get(User, user_id)
    
    if plan == PlanType.PRO_ANNUAL and user.created_at < (datetime.now() - timedelta(days=365)):
        # Loyal annual subscriber: 20% bonus
        return QuotaConfig.TOKEN_LIMITS[plan] * 1.2
    
    return QuotaConfig.TOKEN_LIMITS[plan]
```

### 5. **Batch Cache Warming on App Startup**

```python
# backend/main.py

async def warm_all_caches():
    """Pre-load all system caches on startup."""
    async with SessionLocal() as db:
        orchestrator = AIOrchestrator(db=db)
        
        # Prompts to cache
        caches = {
            "cv_drafting_system": get_cv_tailoring_prompts().get("system"),
            "cover_letter_system": get_cover_letter_prompts().get("system"),
            "extraction_system": get_extraction_prompts().get("system"),
            "ats_keywords": load_ats_keywords_for_kenyan_market(),
        }
        
        for key, content in caches.items():
            if content:
                await orchestrator.cache_system_prompt(
                    key, 
                    content,
                    f"Auto-warmed on startup"
                )
                logger.info(f"✓ Cached {key}")
```

### 6. **Cache Partitioning by Region (for Multi-Region)**

```python
# For Kenyan-specific data
REGIONAL_CACHE_PARTITIONS = {
    "KE": {
        "ats_keywords": "kenyan_ats_keywords",
        "job_titles": "kenyan_job_titles",
        "salary_bands": "kenyan_salary_2024",
    },
    "US": {
        "ats_keywords": "us_ats_keywords",
        "job_titles": "us_job_titles",
        "salary_bands": "us_salary_2024",
    },
}

async def get_regional_cache(region: str, cache_type: str):
    """Get region-specific cached data."""
    key = REGIONAL_CACHE_PARTITIONS[region][cache_type]
    return await cache_mgr.get_cache(key=key)
```

---

## Part 6: Monitoring & Observability

### Key Metrics to Track

```python
# Quota Metrics
- Daily quota usage per user
- Most expensive tasks (by tokens)
- Users approaching quota limits
- Plan distribution
- Quota reset schedule

# Cache Metrics
- Cache hit rate (target: > 60%)
- Cache miss rate
- Cost savings from caching
- Storage usage
- Average cache TTL
- Cache eviction rate
```

### Dashboard Queries

```sql
-- Top users by quota usage
SELECT 
    u.email,
    s.plan_type,
    COUNT(*) as api_calls,
    SUM(aul.total_tokens) as total_tokens,
    AVG(aul.latency_ms) as avg_latency_ms
FROM ai_provider_usage_logs aul
JOIN users u ON u.id = aul.user_id
LEFT JOIN subscriptions s ON s.user_id = u.id
GROUP BY u.email, s.plan_type
ORDER BY total_tokens DESC
LIMIT 20;

-- Cache effectiveness
SELECT 
    cache_type,
    COUNT(*) as total_entries,
    SUM(access_count) as total_hits,
    AVG(access_count) as avg_hits_per_entry,
    SUM(CAST(cache_data AS CHAR CHARACTER LENGTH)) / 1024 / 1024 as storage_mb
FROM ai_cache
GROUP BY cache_type;
```

---

## Summary

| Feature | Benefit | Implementation |
|---|---|---|
| **Quotas** | Cost control, fair usage | QuotaManager + pre-flight checks |
| **System Cache** | Reduce API calls 30-40% | Permanent cached prompts |
| **Session Cache** | Reduce API calls 20-30% | 30-120 min job data caching |
| **Content Cache** | Reduce API calls 15-25% | Task-specific result caching |
| **Plan-Based TTL** | Revenue optimization | Tier-based cache durations |
| **Monitoring** | Visibility & optimization | Cache stats, quota dashboards |

**Expected Cost Savings:** 35-50% reduction in API costs for Pro users through intelligent caching.

**Expected Performance Improvement:** 60-70% faster response times on cached queries (eliminating LLM latency).
