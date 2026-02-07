"""
Migration: Add email verification and password reset fields to users table.
Run with: python migrations/add_auth_verification_fields.py
"""

import asyncio
import asyncpg
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def run_migration():
    settings = get_settings()

    from urllib.parse import urlparse
    parsed_url = urlparse(settings.DATABASE_URL.replace("+asyncpg", ""))

    conn = await asyncpg.connect(
        host=parsed_url.hostname or 'localhost',
        port=parsed_url.port or 5432,
        user=parsed_url.username or 'postgres',
        password=parsed_url.password or 'postgres',
        database=parsed_url.path.lstrip('/') or 'aditus',
    )

    try:
        await conn.execute("""
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255),
                ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255),
                ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
        """)

        await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_verification_token_hash
            ON users (email_verification_token_hash);

            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_password_reset_token_hash
            ON users (password_reset_token_hash);

            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
            ON users (google_sub);
        """)

        logger.info("✅ Added auth verification fields to users table")
        print("✅ Migration completed successfully!")

    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
