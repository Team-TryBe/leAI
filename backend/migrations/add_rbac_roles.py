"""
Migration: Add Role-Based Access Control (RBAC) to Users table
Adds role, MFA fields, and audit tracking columns
"""

import asyncio
import asyncpg
from app.core.config import get_settings

settings = get_settings()


async def run_migration():
    """Add RBAC columns to users table."""
    
    # Extract connection details from DATABASE_URL
    # Format: postgresql+asyncpg://user:password@host:port/database
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "")
    
    # Parse connection string
    conn_parts = db_url.split("@")
    user_pass = conn_parts[0].split(":")
    host_db = conn_parts[1].split("/")
    host_port = host_db[0].split(":")
    
    user = user_pass[0]
    password = user_pass[1] if len(user_pass) > 1 else ""
    host = host_port[0]
    port = int(host_port[1]) if len(host_port) > 1 else 5432
    database = host_db[1].split("?")[0] if len(host_db) > 1 else "aditus"
    
    print(f"🔗 Connecting to database: {host}:{port}/{database}")
    
    conn = await asyncpg.connect(
        user=user,
        password=password,
        database=database,
        host=host,
        port=port
    )
    
    try:
        print("📝 Creating user_role ENUM type...")
        
        # Create ENUM type for UserRole
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE user_role AS ENUM (
                    'super_admin',
                    'support_agent',
                    'finance_admin',
                    'content_manager',
                    'compliance_officer',
                    'candidate',
                    'recruiter',
                    'university_verifier'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        print("✅ ENUM type created or already exists")
        
        # Check if role column already exists
        role_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'role'
            )
        """)
        
        if not role_exists:
            print("➕ Adding role column...")
            await conn.execute("""
                ALTER TABLE users 
                ADD COLUMN role user_role DEFAULT 'candidate' NOT NULL;
            """)
            print("✅ Role column added")
            
            # Create index on role for faster queries
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            """)
            print("✅ Index created on role column")
        else:
            print("⏭️  Role column already exists, skipping...")
        
        # Add MFA columns
        print("➕ Adding MFA and audit tracking columns...")
        
        mfa_enabled_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'mfa_enabled'
            )
        """)
        
        if not mfa_enabled_exists:
            await conn.execute("""
                ALTER TABLE users 
                ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
                ADD COLUMN mfa_secret VARCHAR(255),
                ADD COLUMN last_login_at TIMESTAMP,
                ADD COLUMN last_login_ip VARCHAR(45);
            """)
            print("✅ MFA and audit columns added")
        else:
            print("⏭️  MFA columns already exist, skipping...")
        
        # Migrate existing is_admin users to SUPER_ADMIN role
        print("🔄 Migrating existing admin users to SUPER_ADMIN role...")
        result = await conn.execute("""
            UPDATE users 
            SET role = 'super_admin' 
            WHERE is_admin = TRUE AND role = 'candidate';
        """)
        print(f"✅ Migrated {result.split()[-1]} admin users to SUPER_ADMIN role")
        
        print("\n✅ RBAC migration completed successfully!")
        print("\n📊 Current role distribution:")
        
        # Show role distribution
        roles = await conn.fetch("""
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role 
            ORDER BY count DESC;
        """)
        
        for row in roles:
            print(f"   • {row['role']}: {row['count']} users")
        
        print("\n⚠️  IMPORTANT: Super Admins must enable MFA in settings!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        await conn.close()
        print("🔌 Database connection closed")


if __name__ == "__main__":
    asyncio.run(run_migration())
