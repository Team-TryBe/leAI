"""
Database migration: Add personal_statement column to master_profiles table
Run this manually: python migrations/add_master_profile_personal_statement.py
"""

import asyncio
from sqlalchemy import text
from app.db.database import engine


async def upgrade():
    """Add personal_statement column to master_profiles table."""
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS personal_statement TEXT"
        ))
        print("✅ Successfully added personal_statement column to master_profiles table")


async def downgrade():
    """Remove personal_statement column from master_profiles table."""
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE master_profiles DROP COLUMN IF EXISTS personal_statement"
        ))
        print("✅ Successfully removed personal_statement column from master_profiles table")


if __name__ == "__main__":
    print("Running migration: add_master_profile_personal_statement")
    asyncio.run(upgrade())
