"""
Migration: Add AICache table for caching layer

Adds support for:
- System prompt caching (permanent)
- Session caching (30min-2hr TTL)
- Content caching (task-specific)
- Extraction caching (job description results)

Cache tiers are plan-based:
- Free: No caching
- Pro Monthly: 30-60 min TTL
- Pro Annual: 60-120 min TTL
- Enterprise: 120-240 min TTL
"""

import asyncpg
import logging

logger = logging.getLogger(__name__)


async def run_migration():
    """Create AICache table."""
    
    # Database connection (run manually: python migrations/add_ai_cache.py)
    import os
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    from app.core.config import get_settings
    settings = get_settings()
    
    # Convert SQLAlchemy URL to asyncpg URL
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    conn = await asyncpg.connect(db_url)
    
    try:
        # Create AICache table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_cache (
                id SERIAL PRIMARY KEY,
                cache_key VARCHAR(255) NOT NULL,
                cache_type VARCHAR(50) NOT NULL,  -- system, session, content, extraction
                cache_data TEXT NOT NULL,         -- JSON data
                user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
                expires_at TIMESTAMP,             -- NULL = never expires
                cache_metadata JSONB,             -- Additional metadata
                access_count INTEGER DEFAULT 0,   -- Track cache hits
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
                
                UNIQUE(cache_key, cache_type, user_id)  -- Prevent duplicates
            );
        """)
        
        logger.info("✓ Created ai_cache table")
        
        # Create indexes for performance
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_ai_cache_key_type 
            ON ai_cache(cache_key, cache_type);
        """)
        logger.info("✓ Created index: idx_ai_cache_key_type")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_ai_cache_user_expires 
            ON ai_cache(user_id, expires_at);
        """)
        logger.info("✓ Created index: idx_ai_cache_user_expires")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_ai_cache_expires 
            ON ai_cache(expires_at) 
            WHERE expires_at IS NOT NULL;
        """)
        logger.info("✓ Created index: idx_ai_cache_expires")
        
        print("\n✅ Migration completed successfully!")
        print("   - ai_cache table created")
        print("   - Indexes created for performance")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_migration())
