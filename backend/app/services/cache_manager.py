"""
Cache Manager - Intelligent caching layer for AI operations

Implements three-tier caching strategy:
1. System Prompt Cache - Permanent, never expires (CV drafting rules, formatting, etc.)
2. Session Cache - 30-minute TTL (extracted job descriptions, user profiles)
3. Content Cache - Task-specific caching with plan-based TTLs

Features:
- Plan-aware caching (Pro users get longer caches, fast retrieval)
- Automatic cleanup of expired caches
- Cost tracking and optimization
- Cache hit/miss metrics

Usage:
    cache_mgr = CacheManager(db=db)
    
    # Cache a system prompt (permanent)
    await cache_mgr.set_system_cache(
        key="cv_drafting_system",
        content=system_prompt_text,
        ttl_days=None  # Never expires
    )
    
    # Cache extracted job data (30 min session)
    await cache_mgr.set_session_cache(
        user_id=user_id,
        key=f"job_extraction_{job_url_hash}",
        content=extracted_json,
        ttl_minutes=30
    )
    
    # Retrieve with automatic cost savings calculation
    cached = await cache_mgr.get_cache(key, user_id=user_id)
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from enum import Enum

from app.db.models import AICache, User, Subscription, PlanType
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class CacheType(str, Enum):
    """Cache type categories."""
    SYSTEM = "system"          # Permanent system prompts
    SESSION = "session"        # User session data (30min TTL)
    CONTENT = "content"        # Generated content cache
    EXTRACTION = "extraction"  # Job extraction results


class CacheTier(str, Enum):
    """Cache access tiers based on user plan."""
    FREE = "free"              # No caching
    PRO_MONTHLY = "pro_monthly"  # Standard caching (30 min)
    PRO_ANNUAL = "pro_annual"    # Extended caching (60 min)
    ENTERPRISE = "enterprise"    # Full caching (90 min)


class CacheManager:
    """
    Intelligent cache manager for AI operations.
    
    Provides:
    - Multiple cache types with different TTLs
    - Plan-aware caching strategy
    - Automatic cleanup
    - Cost tracking
    - Hit/miss metrics
    """

    # Cache TTL Configuration (in minutes)
    TTL_CONFIG = {
        CacheTier.FREE: {
            CacheType.SYSTEM: None,        # No system cache for free
            CacheType.SESSION: 0,          # No session cache
            CacheType.CONTENT: 0,          # No content cache
            CacheType.EXTRACTION: 0,       # No extraction cache
        },
        CacheTier.PRO_MONTHLY: {
            CacheType.SYSTEM: None,        # Permanent
            CacheType.SESSION: 30,         # 30 minutes
            CacheType.CONTENT: 60,         # 1 hour
            CacheType.EXTRACTION: 45,      # 45 minutes
        },
        CacheTier.PRO_ANNUAL: {
            CacheType.SYSTEM: None,        # Permanent
            CacheType.SESSION: 60,         # 1 hour
            CacheType.CONTENT: 120,        # 2 hours
            CacheType.EXTRACTION: 90,      # 1.5 hours
        },
        CacheTier.ENTERPRISE: {
            CacheType.SYSTEM: None,        # Permanent
            CacheType.SESSION: 120,        # 2 hours
            CacheType.CONTENT: 240,        # 4 hours
            CacheType.EXTRACTION: 180,     # 3 hours
        },
    }

    # Cost Savings (estimated USD per retrieval without re-processing)
    COST_SAVINGS = {
        CacheType.SYSTEM: 0.0002,      # System prompt reuse
        CacheType.SESSION: 0.0015,     # Session data reuse
        CacheType.CONTENT: 0.0050,     # Full content reuse
        CacheType.EXTRACTION: 0.0008,  # Extraction cache
    }

    def __init__(self, db: AsyncSession):
        """Initialize cache manager."""
        self.db = db
        self.settings = get_settings()

    async def get_user_cache_tier(self, user_id: int) -> CacheTier:
        """
        Determine cache tier based on user's subscription plan.
        
        Returns appropriate tier or FREE if no subscription.
        """
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            return CacheTier.FREE

        # Get active subscription
        sub_stmt = select(Subscription).where(
            (Subscription.user_id == user_id) &
            (Subscription.status == "active")
        )
        sub_result = await self.db.execute(sub_stmt)
        subscription = sub_result.scalar_one_or_none()

        if not subscription:
            return CacheTier.FREE

        # Map plan type to cache tier
        plan_map = {
            PlanType.FREEMIUM: CacheTier.FREE,
            PlanType.PAY_AS_YOU_GO: CacheTier.FREE,    # Pay-as-you-go: limited caching
            PlanType.PRO_MONTHLY: CacheTier.PRO_MONTHLY,
            PlanType.PRO_ANNUAL: CacheTier.PRO_ANNUAL,
        }

        return plan_map.get(subscription.plan_type, CacheTier.FREE)

    async def get_cache(
        self,
        key: str,
        user_id: Optional[int] = None,
        cache_type: CacheType = CacheType.SESSION,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached value if it exists and hasn't expired.
        
        Args:
            key: Cache key
            user_id: Optional user ID (for user-specific caches)
            cache_type: Type of cache
        
        Returns:
            Cached data or None if not found/expired
        """
        try:
            stmt = select(AICache).where(
                (AICache.cache_key == key) &
                (AICache.cache_type == cache_type.value)
            )

            if user_id:
                stmt = stmt.where(AICache.user_id == user_id)

            result = await self.db.execute(stmt)
            cache_entry = result.scalar_one_or_none()

            if not cache_entry:
                logger.debug(f"Cache miss: {key}")
                return None

            # Check expiration
            if cache_entry.expires_at and datetime.utcnow() > cache_entry.expires_at:
                logger.debug(f"Cache expired: {key}")
                await self.delete_cache(key, user_id, cache_type)
                return None

            logger.info(f"Cache hit: {key} (user_id={user_id})")
            
            # Update last accessed time
            cache_entry.last_accessed_at = datetime.utcnow()
            self.db.add(cache_entry)
            await self.db.flush()

            return {
                "data": json.loads(cache_entry.cache_data),
                "saved_cost_usd": self.COST_SAVINGS.get(cache_type, 0),
                "created_at": cache_entry.created_at,
                "accessed_count": cache_entry.access_count,
            }

        except Exception as e:
            logger.error(f"Cache retrieval error for key {key}: {e}")
            return None

    async def set_cache(
        self,
        key: str,
        content: Any,
        cache_type: CacheType = CacheType.SESSION,
        user_id: Optional[int] = None,
        ttl_minutes: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Set cache entry with automatic TTL based on plan.
        
        Args:
            key: Cache key (unique identifier)
            content: Data to cache (will be JSON serialized)
            cache_type: Type of cache (system, session, content, extraction)
            user_id: Optional user ID (for user-specific caches)
            ttl_minutes: Override TTL in minutes (if None, uses plan default)
            metadata: Optional metadata to store with cache
        
        Returns:
            True if cache was set, False if caching disabled
        """
        try:
            # Determine TTL from user plan if not specified
            if ttl_minutes is None and user_id:
                tier = await self.get_user_cache_tier(user_id)
                ttl_minutes = self.TTL_CONFIG[tier].get(cache_type, 0)

            # Skip if no TTL (caching disabled for this user/tier)
            if ttl_minutes == 0 or (ttl_minutes is None and cache_type != CacheType.SYSTEM):
                logger.debug(f"Caching disabled for {cache_type} (user={user_id})")
                return False

            # Calculate expiration
            expires_at = None
            if ttl_minutes and ttl_minutes > 0:
                expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)

            # Serialize content
            cache_data = json.dumps(content) if not isinstance(content, str) else content

            # Create cache entry
            cache_entry = AICache(
                cache_key=key,
                cache_type=cache_type.value,
                cache_data=cache_data,
                user_id=user_id,
                expires_at=expires_at,
                cache_metadata=metadata or {},
                access_count=0,
                created_at=datetime.utcnow(),
                last_accessed_at=datetime.utcnow(),
            )

            self.db.add(cache_entry)
            await self.db.flush()

            logger.info(
                f"Cache set: key={key}, type={cache_type}, ttl={ttl_minutes}min, user={user_id}"
            )
            return True

        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False

    async def set_system_cache(
        self,
        key: str,
        content: Any,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Set permanent system cache (e.g., CV drafting rules, formatting templates).
        
        These caches never expire and are shared across all users.
        """
        return await self.set_cache(
            key=key,
            content=content,
            cache_type=CacheType.SYSTEM,
            user_id=None,  # Not user-specific
            ttl_minutes=None,  # Never expires
            metadata=metadata,
        )

    async def set_session_cache(
        self,
        user_id: int,
        key: str,
        content: Any,
        ttl_minutes: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Set session cache (e.g., extracted job descriptions).
        
        TTL defaults to 30 minutes or plan-specific value.
        """
        return await self.set_cache(
            key=key,
            content=content,
            cache_type=CacheType.SESSION,
            user_id=user_id,
            ttl_minutes=ttl_minutes or 30,
            metadata=metadata,
        )

    async def get_hash(self, text: str) -> str:
        """
        Generate consistent hash for caching URLs, profiles, etc.
        
        Usage:
            url_hash = cache_mgr.get_hash(job_url)
            cached = await cache_mgr.get_cache(f"job_{url_hash}")
        """
        return hashlib.sha256(text.encode()).hexdigest()[:16]

    async def delete_cache(
        self,
        key: str,
        user_id: Optional[int] = None,
        cache_type: Optional[CacheType] = None,
    ) -> int:
        """
        Delete cache entry or entries.
        
        Returns number of entries deleted.
        """
        stmt = delete(AICache).where(AICache.cache_key == key)

        if user_id:
            stmt = stmt.where(AICache.user_id == user_id)

        if cache_type:
            stmt = stmt.where(AICache.cache_type == cache_type.value)

        result = await self.db.execute(stmt)
        await self.db.flush()

        logger.info(f"Cache deleted: key={key}, entries={result.rowcount}")
        return result.rowcount

    async def cleanup_expired_caches(self) -> int:
        """
        Delete all expired cache entries.
        
        Called periodically by background task.
        
        Returns: Number of entries deleted
        """
        stmt = delete(AICache).where(
            (AICache.expires_at.isnot(None)) &
            (AICache.expires_at < datetime.utcnow())
        )

        result = await self.db.execute(stmt)
        await self.db.flush()

        logger.info(f"Expired caches cleaned up: {result.rowcount} entries")
        return result.rowcount

    async def cleanup_user_caches(self, user_id: int) -> int:
        """
        Delete all caches for a specific user (on logout/session end).
        
        Returns: Number of entries deleted
        """
        stmt = delete(AICache).where(
            (AICache.user_id == user_id) &
            (AICache.cache_type != CacheType.SYSTEM.value)  # Keep system caches
        )

        result = await self.db.execute(stmt)
        await self.db.flush()

        logger.info(f"User caches cleaned up: user={user_id}, entries={result.rowcount}")
        return result.rowcount

    async def get_cache_stats(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get cache statistics for monitoring and analytics.
        
        Returns:
            Dict with cache hit rates, cost savings, storage size, etc.
        """
        try:
            # Build query
            stmt = select(AICache)
            if user_id:
                stmt = stmt.where(AICache.user_id == user_id)

            result = await self.db.execute(stmt)
            entries = result.scalars().all()

            if not entries:
                return {
                    "total_entries": 0,
                    "total_hits": 0,
                    "estimated_cost_saved_usd": 0.0,
                    "storage_mb": 0.0,
                }

            total_hits = sum(e.access_count for e in entries)
            total_size = sum(len(e.cache_data) for e in entries)

            # Calculate cost savings
            cost_saved = 0.0
            for entry in entries:
                try:
                    cache_type = CacheType(entry.cache_type)
                    cost_saved += self.COST_SAVINGS.get(cache_type, 0) * entry.access_count
                except ValueError:
                    pass

            return {
                "total_entries": len(entries),
                "total_hits": total_hits,
                "estimated_cost_saved_usd": round(cost_saved, 4),
                "storage_mb": round(total_size / (1024 * 1024), 2),
                "average_ttl_minutes": self._calculate_avg_ttl(entries),
                "by_type": self._breakdown_by_type(entries),
            }

        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {}

    @staticmethod
    def _calculate_avg_ttl(entries) -> float:
        """Calculate average TTL of cache entries."""
        ttls = []
        for entry in entries:
            if entry.expires_at:
                ttl = (entry.expires_at - entry.created_at).total_seconds() / 60
                ttls.append(ttl)

        return round(sum(ttls) / len(ttls), 2) if ttls else 0.0

    @staticmethod
    def _breakdown_by_type(entries) -> Dict[str, int]:
        """Breakdown cache entries by type."""
        breakdown = {}
        for entry in entries:
            breakdown[entry.cache_type] = breakdown.get(entry.cache_type, 0) + 1
        return breakdown


# Module convenience functions

async def get_or_create_job_cache(
    db: AsyncSession,
    user_id: int,
    job_url: str,
    extractor_fn,
) -> Dict[str, Any]:
    """
    Get cached job extraction or create new one.
    
    Usage:
        job_data = await get_or_create_job_cache(
            db=db,
            user_id=user_id,
            job_url=url,
            extractor_fn=extract_job_data_fn,
        )
    """
    cache_mgr = CacheManager(db=db)
    url_hash = await cache_mgr.get_hash(job_url)
    cache_key = f"job_extraction_{url_hash}"

    # Try to get from cache
    cached = await cache_mgr.get_cache(
        key=cache_key,
        user_id=user_id,
        cache_type=CacheType.EXTRACTION,
    )

    if cached:
        logger.info(f"Using cached job extraction for {job_url}")
        return cached["data"]

    # Not in cache, extract and cache
    logger.info(f"Extracting job data for {job_url} (not cached)")
    extracted_data = await extractor_fn(job_url)

    # Cache for future use
    await cache_mgr.set_session_cache(
        user_id=user_id,
        key=cache_key,
        content=extracted_data,
        ttl_minutes=30,
        metadata={"url": job_url},
    )

    return extracted_data
