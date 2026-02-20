# Quotas & Caching Quick Reference

## Quick Start

### 1. Initialize System Caches (Startup)

```python
# In backend/main.py lifespan
async with SessionLocal() as db:
    orchestrator = AIOrchestrator(db=db)
    
    # Cache system prompts (permanent, never expire)
    await orchestrator.cache_system_prompt(
        "cv_drafting_system",
        get_cv_tailoring_prompts().get("system", ""),
    )
```

### 2. Check Quota Before Generation

```python
from app.services.quota_manager import QuotaManager, QuotaError

quota_mgr = QuotaManager(db=db)

try:
    await quota_mgr.check_quota(user_id, task_type="extraction")
except QuotaError as e:
    raise HTTPException(status_code=429, detail=str(e))
```

### 3. Generate with Caching

```python
response = await orchestrator.generate_cached(
    user_id=user_id,
    task="extraction",
    prompt="Extract job from...",
    cache_key="extraction_abc123",  # Optional
)

print(response)  # {response, cached, cost_saved_usd, cache_created_at}
```

### 4. Get Quota Status

```python
quota_status = await quota_mgr.get_quota_status(user_id)

print(quota_status["daily"])
# {used, limit, remaining, percentage, warning_level}
```

---

## API Endpoints to Add

### Quota Endpoints

```
GET /api/v1/quota/status
    Returns user's current quota usage and reset times
    Response: {daily, monthly, hourly_calls, plan, resets_at}

GET /api/v1/quota/limits
    Returns user's quota limits by plan
    Response: {daily_tokens, monthly_tokens, hourly_calls, plan}

POST /api/v1/admin/quota/reset/{user_id}
    (Admin only) Manually reset user's quota
```

### Cache Endpoints

```
GET /api/v1/cache/stats
    Returns cache statistics and cost savings
    Response: {total_entries, total_hits, cost_saved_usd, storage_mb}

DELETE /api/v1/cache/{cache_key}
    Delete specific cache entry
    
POST /api/v1/admin/cache/warmup
    (Admin only) Pre-load system caches

DELETE /api/v1/admin/cache/cleanup
    (Admin only) Delete expired caches
```

---

## File Reference

| File | Purpose |
|---|---|
| `backend/app/services/quota_manager.py` | Quota enforcement |
| `backend/app/services/cache_manager.py` | Intelligent caching |
| `backend/app/services/ai_orchestrator.py` | Updated with quota + caching |
| `backend/app/db/models.py` | AICache model added |
| `backend/migrations/add_ai_cache.py` | DB migration for cache table |
| `docs/QUOTAS_AND_CACHING_IMPLEMENTATION.md` | Full documentation |

---

## Common Patterns

### Pattern 1: Extract Job with Auto-Caching

```python
async def extract_job_api(url: str, user_id: int, db: AsyncSession):
    cache_mgr = CacheManager(db=db)
    
    # Hash URL for key
    url_hash = await cache_mgr.get_hash(url)
    cache_key = f"job_{url_hash}"
    
    # Try cache
    cached = await cache_mgr.get_cache(cache_key, user_id=user_id)
    if cached:
        return cached["data"]
    
    # Extract and cache
    orchestrator = AIOrchestrator(db=db)
    result = await orchestrator.generate_cached(
        user_id=user_id,
        task="extraction",
        prompt=f"Extract from: {url}",
        cache_key=cache_key,
    )
    
    return result
```

### Pattern 2: Draft CV with Quota Check

```python
async def draft_cv_api(job_data: dict, user_id: int, db: AsyncSession):
    # Check quota first
    quota_mgr = QuotaManager(db=db)
    try:
        await quota_mgr.check_quota(user_id, task_type="cv_draft")
    except QuotaError as e:
        status = await quota_mgr.get_quota_status(user_id)
        raise HTTPException(
            status_code=429,
            detail=str(e),
            headers={"X-Quota-Status": json.dumps(status)}
        )
    
    # Generate
    orchestrator = AIOrchestrator(db=db)
    response = await orchestrator.generate_cached(
        user_id=user_id,
        task="cv_draft",
        prompt=f"Draft CV for: {json.dumps(job_data)}",
        cache_key=f"cv_{user_id}_{job_data['id']}",
    )
    
    return response
```

### Pattern 3: Cleanup Caches on Logout

```python
async def logout_api(user_id: int, db: AsyncSession):
    cache_mgr = CacheManager(db=db)
    
    # Clean user's session/content caches
    await cache_mgr.cleanup_user_caches(user_id)
    
    # Invalidate token, etc...
    return {"message": "Logged out"}
```

---

## Environment Setup

### 1. Run Migration

```bash
cd backend
python migrations/add_ai_cache.py
```

### 2. Update services/__init__.py

```python
from app.services.quota_manager import QuotaManager, QuotaError
from app.services.cache_manager import CacheManager, CacheType
from app.services.ai_orchestrator import AIOrchestrator

__all__ = [
    "QuotaManager",
    "QuotaError",
    "CacheManager", 
    "CacheType",
    "AIOrchestrator",
]
```

### 3. Update main.py

```python
from app.services import AIOrchestrator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Warming caches...")
    async with SessionLocal() as db:
        orchestrator = AIOrchestrator(db=db)
        
        await orchestrator.cache_system_prompt(
            "cv_drafting_system",
            get_cv_tailoring_prompts().get("system", ""),
        )
        
        logger.info("✓ System caches initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
```

---

## Testing

### Test Quota Enforcement

```python
@pytest.mark.asyncio
async def test_quota_exceeded(db: AsyncSession):
    quota_mgr = QuotaManager(db=db)
    
    # Create user with freemium plan (10K daily limit)
    user = await create_test_user(db, plan=PlanType.FREEMIUM)
    
    # Add usage log exceeding limit
    await add_usage_logs(db, user_id=user.id, tokens=15_000)
    
    # Should raise QuotaError
    with pytest.raises(QuotaError):
        await quota_mgr.check_quota(user.id, task_type="extraction")
```

### Test Cache Hit

```python
@pytest.mark.asyncio
async def test_cache_hit(db: AsyncSession):
    cache_mgr = CacheManager(db=db)
    
    # Set cache
    await cache_mgr.set_session_cache(
        user_id=1,
        key="test_key",
        content={"data": "test"},
    )
    
    # Retrieve
    cached = await cache_mgr.get_cache("test_key", user_id=1)
    assert cached is not None
    assert cached["data"]["data"] == "test"
```

---

## Dashboard Widgets

### Quota Warning Widget

```tsx
function QuotaWarning({ quota }: { quota: QuotaStatus }) {
    const dailyPct = quota.daily.percentage;
    
    return (
        <Alert variant={dailyPct > 80 ? "destructive" : "warning"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
                {dailyPct}% of daily quota used
            </AlertTitle>
            <AlertDescription>
                {quota.daily.remaining.toLocaleString()} tokens remaining
            </AlertDescription>
        </Alert>
    );
}
```

### Cache Stats Widget

```tsx
function CacheStats({ stats }: { stats: CacheStats }) {
    const hitRate = (stats.total_hits / stats.total_entries * 100).toFixed(1);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <p>Hit Rate: {hitRate}%</p>
                    <p>Cost Saved: ${stats.cost_saved_usd.toFixed(2)}</p>
                    <p>Storage: {stats.storage_mb.toFixed(2)}MB</p>
                </div>
            </CardContent>
        </Card>
    );
}
```

---

## Troubleshooting

### Issue: "QuotaError: Daily quota exceeded"

**Solution:**
1. Check user's plan: `quota_mgr.get_quota_limits(user_id)`
2. View usage: `quota_mgr.get_quota_status(user_id)`
3. For admin: Reset quota with `quota_mgr.reset_daily_quota(user_id)`
4. Upgrade user plan or implement grace period

### Issue: "Cache table doesn't exist"

**Solution:**
```bash
# Run migration
python backend/migrations/add_ai_cache.py

# Verify
psql postgresql://postgres:postgres@localhost:5432/aditus
> SELECT COUNT(*) FROM ai_cache;
```

### Issue: "Cache not being used"

**Solution:**
1. Check user's plan tier (Free tier gets no caching)
2. Verify cache key consistency
3. Check TTL hasn't expired: `SELECT expires_at FROM ai_cache WHERE cache_key='...';`
4. Monitor with: `await cache_mgr.get_cache_stats()`

---

## Performance Tips

1. **Batch cache warming** on startup (load all system prompts at once)
2. **Use URL hashing** for consistent cache keys: `await cache_mgr.get_hash(url)`
3. **Cleanup expired caches** hourly via background task
4. **Index frequently accessed** cache keys
5. **Monitor hit rate** - target: 60%+ for production

---

## Security Considerations

1. **System caches** (permanent) - safe to share across users
2. **Session caches** - user_id enforced in model (cannot access others' data)
3. **Quota enforcement** - checked before every generation
4. **Cache cleanup** - delete sensitive data on user logout
5. **Admin operations** - require authentication and logging
