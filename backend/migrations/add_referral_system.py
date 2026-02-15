"""
Migration: Add Referral System (Give 1, Get 1)

Adds:
- Referral fields to users table
- New referral_transactions table
- Indexes for performance
"""

import asyncio
import asyncpg


async def run_migration():
    """Run migration to add referral system tables and fields."""
    conn = await asyncpg.connect(
        user='postgres',
        password='postgres',
        database='aditus',
        host='localhost',
        port=5432,
    )
    
    try:
        # Add referral fields to users table
        print("Adding referral fields to users table...")
        await conn.execute('''
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) DEFAULT '',
            ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS referral_credits INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS has_earned_referral_reward BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS referral_reward_earned_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS signup_ip VARCHAR(45);
        ''')
        print("✓ Referral fields added to users table")
        
        # Generate unique referral codes for existing users
        print("Generating unique referral codes for existing users...")
        import secrets
        import string
        
        users = await conn.fetch('SELECT id FROM users WHERE referral_code IS NULL OR referral_code = \'\'')
        for user in users:
            # Generate unique code
            while True:
                code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
                existing = await conn.fetchval('SELECT id FROM users WHERE referral_code = $1', code)
                if not existing:
                    break
            await conn.execute('UPDATE users SET referral_code = $1 WHERE id = $2', code, user['id'])
        print(f"✓ Generated referral codes for {len(users)} users")
        
        # Create index on referral_code for fast lookups
        print("Creating index on referral_code...")
        await conn.execute('''
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code 
            ON users(referral_code) WHERE referral_code != '';
        ''')
        print("✓ Index created on referral_code")
        
        # Create referral_transactions table
        print("Creating referral_transactions table...")
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS referral_transactions (
                id SERIAL PRIMARY KEY,
                referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                referral_code VARCHAR(8) NOT NULL,
                signup_ip VARCHAR(45),
                verified_at TIMESTAMP,
                reward_granted_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        print("✓ referral_transactions table created")
        
        # Create indexes on referral_transactions
        print("Creating indexes on referral_transactions...")
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_referral_referrer 
            ON referral_transactions(referrer_id);
        ''')
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_referral_referred_user 
            ON referral_transactions(referred_user_id);
        ''')
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_referral_code 
            ON referral_transactions(referral_code);
        ''')
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_referral_status 
            ON referral_transactions(status);
        ''')
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_referral_created 
            ON referral_transactions(created_at);
        ''')
        print("✓ Indexes created on referral_transactions")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
