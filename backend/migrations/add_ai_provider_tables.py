"""
Database migration to add AI Provider management tables.
Supports Gemini, OpenAI, and Claude with encryption.

Run with: python migrations/add_ai_provider_tables.py
"""

import asyncio
from app.db.database import get_db_engine
from sqlalchemy import text


async def run_migration():
    """Create AI provider configuration and usage log tables."""
    
    engine = get_db_engine()
    async with engine.begin() as conn:
        # Create AIProviderType enum if it doesn't exist
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE ai_provider_type AS ENUM('gemini', 'openai', 'claude');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        
        # Create ai_provider_configs table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_provider_configs (
                id SERIAL PRIMARY KEY,
                provider_type ai_provider_type NOT NULL,
                api_key_encrypted TEXT NOT NULL,
                model_name VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                description TEXT,
                is_active BOOLEAN DEFAULT true NOT NULL,
                is_default BOOLEAN DEFAULT false NOT NULL,
                default_for_extraction BOOLEAN DEFAULT false NOT NULL,
                default_for_cv_draft BOOLEAN DEFAULT false NOT NULL,
                default_for_cover_letter BOOLEAN DEFAULT false NOT NULL,
                default_for_validation BOOLEAN DEFAULT false NOT NULL,
                daily_token_limit INTEGER,
                monthly_token_limit INTEGER,
                last_tested_at TIMESTAMP,
                last_test_success BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                created_by_id INTEGER NOT NULL REFERENCES users(id),
                UNIQUE (provider_type, model_name)
            );
        """))
        
        # Create indices for ai_provider_configs
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_provider_type 
            ON ai_provider_configs(provider_type);
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_is_active 
            ON ai_provider_configs(is_active);
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_created_by_id 
            ON ai_provider_configs(created_by_id);
        """))
        
        # Create ai_provider_usage_logs table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_provider_usage_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                provider_config_id INTEGER NOT NULL REFERENCES ai_provider_configs(id),
                task_type VARCHAR(50) NOT NULL,
                input_tokens INTEGER,
                output_tokens INTEGER,
                total_tokens INTEGER,
                estimated_cost_usd INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'success' NOT NULL,
                error_message TEXT,
                latency_ms INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        """))
        
        # Create indices for ai_provider_usage_logs
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ai_provider_usage_logs_user_id 
            ON ai_provider_usage_logs(user_id);
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ai_provider_usage_logs_provider_config_id 
            ON ai_provider_usage_logs(provider_config_id);
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ai_provider_usage_logs_created_at 
            ON ai_provider_usage_logs(created_at);
        """))
        
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ai_provider_usage_logs_task_type 
            ON ai_provider_usage_logs(task_type);
        """))
        
        print("✅ AI Provider tables created successfully")
        print("   - ai_provider_configs: Stores provider configurations with encrypted API keys")
        print("   - ai_provider_usage_logs: Tracks API usage for cost monitoring")
        print("\n📊 Next steps:")
        print("   1. Start the backend server")
        print("   2. Access admin dashboard at /admin/providers")
        print("   3. Create first provider config (Gemini, OpenAI, or Claude)")
        print("   4. Test credentials and verify integration")


if __name__ == "__main__":
    asyncio.run(run_migration())
