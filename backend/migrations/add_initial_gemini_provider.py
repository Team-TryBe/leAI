"""
Add initial Gemini provider configuration from environment variables

This migration ensures that existing deployments can immediately use the
dynamic provider system by creating a default provider config from the
GEMINI_API_KEY environment variable.

Usage:
    cd backend
    python migrations/add_initial_gemini_provider.py
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.core.config import get_settings
from app.db.models import AIProviderConfig, AIProviderType, User
from app.services.encryption_service import encrypt_token


async def run_migration():
    """Create initial Gemini provider config from environment."""
    print("🔧 Starting migration: add_initial_gemini_provider")
    
    settings = get_settings()
    
    if not settings.GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY not found in environment variables")
        print("   Please set GEMINI_API_KEY in your .env file before running this migration")
        return
    
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    async with AsyncSession(engine) as session:
        # Check if provider config already exists
        result = await session.execute(
            select(AIProviderConfig).where(
                AIProviderConfig.provider_type == "gemini",
                AIProviderConfig.is_default == True
            )
        )
        existing_provider = result.scalar_one_or_none()
        
        if existing_provider:
            print(f"⚠️  Default Gemini provider already exists (ID: {existing_provider.id})")
            print(f"   Model: {existing_provider.model_name}")
            print(f"   Active: {existing_provider.is_active}")
            print(f"   Created: {existing_provider.created_at}")
            
            # Ask if user wants to update
            response = input("\n   Do you want to update the API key? (y/N): ").strip().lower()
            
            if response == 'y':
                encrypted_key = encrypt_token(settings.GEMINI_API_KEY)
                existing_provider.api_key_encrypted = encrypted_key
                existing_provider.is_active = True
                await session.commit()
                print("✅ Provider API key updated successfully")
            else:
                print("   Skipping update")
            
            return
        
        # Encrypt the API key from environment
        print("🔐 Encrypting API key...")
        encrypted_key = encrypt_token(settings.GEMINI_API_KEY)
        
        # Get first admin user
        user_result = await session.execute(
            select(User).where(User.is_admin == True).limit(1)
        )
        admin_user = user_result.scalar_one_or_none()
        
        if not admin_user:
            # Fallback to first user
            user_result = await session.execute(select(User).limit(1))
            admin_user = user_result.scalar_one_or_none()
        
        if not admin_user:
            print("❌ No users found in database. Please create a user first.")
            return
        
        # Create new provider config
        print("📝 Creating default Gemini provider configuration...")
        
        provider = AIProviderConfig(
            provider_type=AIProviderType.GEMINI,
            api_key_encrypted=encrypted_key,
            model_name=settings.GEMINI_MODEL_FAST or "gemini-1.5-pro",
            is_active=True,
            is_default=True,
            daily_token_limit=None,  # No quota limit initially
            created_by_id=admin_user.id,
        )
        
        session.add(provider)
        await session.commit()
        await session.refresh(provider)
        
        print("\n✅ Migration completed successfully!")
        print(f"   Provider ID: {provider.id}")
        print(f"   Provider Type: {provider.provider_type}")
        print(f"   Model: {provider.model_name}")
        print(f"   Active: {provider.is_active}")
        print(f"   Default: {provider.is_default}")
        print(f"\n🎉 Your app will now use database-driven provider selection!")
        print(f"   You can add more providers via the admin UI at /admin/providers")
    
    await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(run_migration())
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
