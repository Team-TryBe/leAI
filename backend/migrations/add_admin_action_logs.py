"""
Database migration: Add admin_action_logs table for admin audit trail
Run this manually: python migrations/add_admin_action_logs.py
"""

import asyncio
from sqlalchemy import text
from app.db.database import engine


async def upgrade():
    """Create admin_action_logs table."""
    async with engine.begin() as conn:
        await conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS admin_action_logs (
                id SERIAL PRIMARY KEY,
                admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(150) NOT NULL,
                target_type VARCHAR(100),
                target_id INTEGER,
                details JSONB DEFAULT '{}'::jsonb,
                ip_address VARCHAR(64),
                user_agent VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        ))

        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_user_id ON admin_action_logs(admin_user_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at)"
        ))

        print("✅ Successfully created admin_action_logs table")


async def downgrade():
    """Drop admin_action_logs table."""
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS admin_action_logs"))
        print("✅ Successfully dropped admin_action_logs table")


if __name__ == "__main__":
    print("Running migration: add_admin_action_logs")
    asyncio.run(upgrade())
