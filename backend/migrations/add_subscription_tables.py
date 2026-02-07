"""
Migration: Add subscription tables for plan management, payments, and invoicing.
Run with: python migrations/add_subscription_tables.py
"""

import asyncio
import asyncpg
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def run_migration():
    """Create subscription-related tables."""
    settings = get_settings()
    
    # Parse DATABASE_URL to get connection details
    from urllib.parse import urlparse
    parsed_url = urlparse(settings.DATABASE_URL)
    
    # Create connection
    conn = await asyncpg.connect(
        host=parsed_url.hostname or 'localhost',
        port=parsed_url.port or 5432,
        user=parsed_url.username or 'postgres',
        password=parsed_url.password or 'postgres',
        database=parsed_url.path.lstrip('/') or 'aditus',
    )
    
    try:
        # Create enums
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE plan_type_enum AS ENUM ('freemium', 'paygo', 'pro', 'annual');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE subscription_status_enum AS ENUM ('active', 'paused', 'cancelled', 'expired', 'past_due');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE payment_status_enum AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        
        # Plans table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                plan_type plan_type_enum UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                price INTEGER NOT NULL,
                period VARCHAR(50) NOT NULL,
                description TEXT,
                features JSONB DEFAULT '[]'::jsonb,
                max_applications INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✅ Created plans table")
        
        # Subscriptions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                plan_id INTEGER NOT NULL REFERENCES plans(id),
                status subscription_status_enum DEFAULT 'active',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                current_period_end TIMESTAMP,
                cancelled_at TIMESTAMP,
                auto_renew BOOLEAN DEFAULT TRUE,
                cancellation_requested BOOLEAN DEFAULT FALSE,
                total_paid INTEGER DEFAULT 0,
                payment_method VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (plan_id) REFERENCES plans(id)
            );
        """)
        logger.info("✅ Created subscriptions table")
        
        # Payments table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL,
                currency VARCHAR(10) DEFAULT 'KES',
                status payment_status_enum DEFAULT 'pending',
                payment_provider VARCHAR(100),
                transaction_id VARCHAR(255) UNIQUE,
                payment_method VARCHAR(100),
                paid_at TIMESTAMP,
                failed_at TIMESTAMP,
                failure_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
            );
        """)
        logger.info("✅ Created payments table")
        
        # Invoices table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
                payment_id INTEGER UNIQUE REFERENCES payments(id),
                invoice_number VARCHAR(100) UNIQUE NOT NULL,
                amount INTEGER NOT NULL,
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                due_date TIMESTAMP,
                paid_at TIMESTAMP,
                pdf_path VARCHAR(500),
                download_token VARCHAR(255) UNIQUE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
                FOREIGN KEY (payment_id) REFERENCES payments(id)
            );
        """)
        logger.info("✅ Created invoices table")
        
        # Create indexes for better query performance
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
            CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
            CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
            CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
            CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
            CREATE INDEX IF NOT EXISTS idx_plans_plan_type ON plans(plan_type);
        """)
        logger.info("✅ Created indexes")
        
        # Insert default plans
        await conn.execute("""
            INSERT INTO plans (plan_type, name, price, period, description, features, max_applications, is_active)
            VALUES
                ('freemium', 'Freemium', 0, '/month', 'Perfect for getting started', 
                 '["2 applications per month", "Basic AI Model (Gemini Flash)", "Standard CV Templates", "Email Support"]'::jsonb, 
                 2, TRUE),
                ('paygo', 'Pay-As-You-Go', 50, 'per application', 'Perfect for occasional applicants',
                 '["1 Full Pro Application", "CV + Cover Letter + Email", "Direct Send as Me", "Premium AI (Claude 3.5)"]'::jsonb,
                 1, TRUE),
                ('pro', 'Pro Monthly', 1999, '/month', 'Most popular for active job seekers',
                 '["Unlimited Applications (Fair Use)", "Premium AI Models (Claude + Gemini)", "ATS-Optimized Custom Layouts", "Direct Email Send", "Advanced Job Scraping", "Email Open Tracking", "Multi-Model Intelligence", "ATS Score Check", "WhatsApp Alerts"]'::jsonb,
                 NULL, TRUE),
                ('annual', 'Pro Annual', 19990, '/year', 'Save 20% with annual commitment',
                 '["Everything in Pro Monthly", "LinkedIn Profile Makeover", "Hidden Market Weekly Report", "Human Review Credit (1x)", "Priority Support"]'::jsonb,
                 NULL, TRUE)
            ON CONFLICT (plan_type) DO NOTHING;
        """)
        logger.info("✅ Inserted default plans")
        
        print("\n✅ Migration completed successfully!")
        print("\nNew tables created:")
        print("  - plans")
        print("  - subscriptions")
        print("  - payments")
        print("  - invoices")
        print("\nDefault plans inserted (4 tiers)")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
