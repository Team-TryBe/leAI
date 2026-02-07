"""
Migration: Create transactions table for M-Pesa payments.
Run: python migrations/add_transactions_table.py
"""

import asyncio
import asyncpg
import os
from datetime import datetime


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/aditus"
)


async def run_migration():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print("🚀 Creating transactions table...")
        
        # Create enum type for transaction status
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE transaction_status_enum AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'timeout');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)

        # Create transactions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                merchant_request_id VARCHAR(100),
                checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
                mpesa_receipt_number VARCHAR(100) UNIQUE,
                
                amount INTEGER NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                account_reference VARCHAR(100),
                transaction_desc VARCHAR(255),
                
                status transaction_status_enum NOT NULL DEFAULT 'pending',
                result_code INTEGER,
                result_desc TEXT,
                
                callback_payload JSONB,
                initiated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                completed_at TIMESTAMP,
                
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        """)

        # Create indexes for performance
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transactions_checkout_id ON transactions(checkout_request_id);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
        """)

        print("✅ Transactions table created successfully!")
        print("✅ Migration completed successfully!")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
