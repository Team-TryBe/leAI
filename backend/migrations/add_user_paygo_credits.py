"""
Migration: Add paygo_credits to users table.
Run: python migrations/add_user_paygo_credits.py
"""

import asyncio
import asyncpg
import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/aditus"
)


async def run_migration():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print("🚀 Adding paygo_credits to users table...")

        await conn.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS paygo_credits INTEGER NOT NULL DEFAULT 0;
        """)

        print("✅ paygo_credits added successfully!")
        print("✅ Migration completed successfully!")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
