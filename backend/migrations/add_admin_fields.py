"""
Database migration: Add admin and active status fields to users table
Run this manually: python migrations/add_admin_fields.py
"""

import asyncio
from sqlalchemy import text
from app.db.database import engine

async def upgrade():
    """Add is_admin and is_active columns to users table."""
    async with engine.begin() as conn:
        # Add is_admin column
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL"
        ))
        
        # Add is_active column
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL"
        ))
        
        print("✅ Successfully added is_admin and is_active columns to users table")

async def downgrade():
    """Remove is_admin and is_active columns from users table."""
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS is_admin"))
        await conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS is_active"))
        print("✅ Successfully removed is_admin and is_active columns from users table")

if __name__ == "__main__":
    print("Running migration: add_admin_fields")
    asyncio.run(upgrade())
