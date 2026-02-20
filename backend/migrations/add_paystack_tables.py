"""
Migration: Add Paystack payment tables

Creates tables for Paystack integration:
- paystack_payments: Payment records
- paystack_transactions: Transaction details
- paystack_logs: Audit logs
"""

import asyncpg
import logging

logger = logging.getLogger(__name__)


async def run_migration():
    """Create Paystack payment tables."""
    
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
        # Create paystack_payments table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS paystack_payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                reference VARCHAR(255) NOT NULL UNIQUE,
                access_code VARCHAR(255),
                authorization_url TEXT,
                amount INTEGER NOT NULL,
                currency VARCHAR(3) DEFAULT 'KES',
                payment_method VARCHAR(50),
                payer_phone VARCHAR(20),
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                failure_reason TEXT,
                plan_id INTEGER REFERENCES plans(id),
                subscription_id INTEGER REFERENCES subscriptions(id),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                initiated_at TIMESTAMP,
                completed_at TIMESTAMP,
                expires_at TIMESTAMP,
                UNIQUE(reference)
            );
        """)
        logger.info("✓ Created paystack_payments table")
        
        # Create indexes for paystack_payments
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_payments_user_id 
            ON paystack_payments(user_id);
        """)
        logger.info("✓ Created index: idx_paystack_payments_user_id")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_payments_reference 
            ON paystack_payments(reference);
        """)
        logger.info("✓ Created index: idx_paystack_payments_reference")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_payments_status 
            ON paystack_payments(status);
        """)
        logger.info("✓ Created index: idx_paystack_payments_status")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_payments_created_at 
            ON paystack_payments(created_at);
        """)
        logger.info("✓ Created index: idx_paystack_payments_created_at")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_payments_expires_at 
            ON paystack_payments(expires_at);
        """)
        logger.info("✓ Created index: idx_paystack_payments_expires_at")
        
        # Create paystack_transactions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS paystack_transactions (
                id SERIAL PRIMARY KEY,
                paystack_payment_id INTEGER NOT NULL REFERENCES paystack_payments(id) ON DELETE CASCADE,
                transaction_id VARCHAR(255),
                receipt_number VARCHAR(255),
                status VARCHAR(50),
                message TEXT,
                timestamp TIMESTAMP,
                raw_response JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        logger.info("✓ Created paystack_transactions table")
        
        # Create indexes for paystack_transactions
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_transactions_payment_id 
            ON paystack_transactions(paystack_payment_id);
        """)
        logger.info("✓ Created index: idx_paystack_transactions_payment_id")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_transactions_created_at 
            ON paystack_transactions(created_at);
        """)
        logger.info("✓ Created index: idx_paystack_transactions_created_at")
        
        # Create paystack_logs table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS paystack_logs (
                id SERIAL PRIMARY KEY,
                paystack_payment_id INTEGER REFERENCES paystack_payments(id) ON DELETE CASCADE,
                event_type VARCHAR(50) NOT NULL,
                message TEXT,
                request_data JSONB,
                response_data JSONB,
                error_details JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        logger.info("✓ Created paystack_logs table")
        
        # Create indexes for paystack_logs
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_logs_payment_id 
            ON paystack_logs(paystack_payment_id);
        """)
        logger.info("✓ Created index: idx_paystack_logs_payment_id")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_logs_event_type 
            ON paystack_logs(event_type);
        """)
        logger.info("✓ Created index: idx_paystack_logs_event_type")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_paystack_logs_created_at 
            ON paystack_logs(created_at);
        """)
        logger.info("✓ Created index: idx_paystack_logs_created_at")
        
        print("\n✅ Migration completed successfully!")
        print("   - paystack_payments table created")
        print("   - paystack_transactions table created")
        print("   - paystack_logs table created")
        print("   - 9 indexes created for performance")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_migration())
