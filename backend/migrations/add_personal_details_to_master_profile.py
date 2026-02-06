"""
Database migration: Add personal details columns to master_profiles table
Run this manually: python migrations/add_personal_details_to_master_profile.py
"""

import asyncio
from sqlalchemy import text
from app.db.database import engine


async def upgrade():
    """Add personal details columns to master_profiles table."""
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(10)"))
        await conn.execute(text("ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)"))
        await conn.execute(text("ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS twitter_url VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS medium_url VARCHAR(500)"))
        print("✅ Successfully added personal detail columns to master_profiles table")


async def downgrade():
    """Remove personal details columns from master_profiles table."""
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE master_profiles DROP COLUMN IF EXISTS medium_url"))
        await conn.execute(text("ALTER TABLE master_profiles DROP COLUMN IF EXISTS twitter_url"))
        await conn.execute(text("ALTER TABLE master_profiles DROP COLUMN IF EXISTS location"))
        await conn.execute(text("ALTER TABLE master_profiles DROP COLUMN IF EXISTS email"))
        await conn.execute(text("ALTER TABLE master_profiles DROP COLUMN IF EXISTS phone_number"))
        await conn.execute(text("ALTER TABLE master_profiles DROP COLUMN IF EXISTS phone_country_code"))
        await conn.execute(text("ALTER TABLE master_profiles DROP COLUMN IF EXISTS full_name"))
        print("✅ Successfully removed personal detail columns from master_profiles table")


if __name__ == "__main__":
    print("Running migration: add_personal_details_to_master_profile")
    asyncio.run(upgrade())
