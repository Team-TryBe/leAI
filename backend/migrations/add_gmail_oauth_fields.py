"""
Database migration: Add Gmail OAuth2 fields to users table
Run this manually: python migrations/add_gmail_oauth_fields.py
"""

import asyncio
from sqlalchemy import text
from app.db.database import engine

async def upgrade():
    """Add Gmail OAuth2 columns to users table."""
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_access_token TEXT"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_token_expires_at TIMESTAMP"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_connected BOOLEAN DEFAULT FALSE NOT NULL"
        ))

        print("✅ Successfully added Gmail OAuth2 columns to users table")

async def downgrade():
    """Remove Gmail OAuth2 columns from users table."""
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS gmail_refresh_token"))
        await conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS gmail_access_token"))
        await conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS gmail_token_expires_at"))
        await conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS gmail_connected"))

        print("✅ Successfully removed Gmail OAuth2 columns from users table")

if __name__ == "__main__":
    print("Running migration: add_gmail_oauth_fields")
    asyncio.run(upgrade())
