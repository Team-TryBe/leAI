"""Add user_id column to extracted_job_data table."""
import sys
import os
import asyncio

# Add parent directory to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import Settings

# Load settings
settings = Settings()


async def run_migration():
    """Add user_id foreign key to extracted_job_data table."""
    
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(
            text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'extracted_job_data' 
            AND column_name = 'user_id'
            """)
        )
        
        if result.scalar() is None:
            # Add the user_id column
            await conn.execute(
                text("""
                ALTER TABLE extracted_job_data
                ADD COLUMN user_id INTEGER
                """)
            )
            print("✓ Added user_id column to extracted_job_data")
            
            # Add foreign key constraint
            await conn.execute(
                text("""
                ALTER TABLE extracted_job_data
                ADD CONSTRAINT fk_extracted_job_data_user_id
                FOREIGN KEY (user_id) REFERENCES users(id)
                """)
            )
            print("✓ Added foreign key constraint for user_id")
            
            # Add index for better query performance
            await conn.execute(
                text("""
                CREATE INDEX idx_extracted_job_data_user_id
                ON extracted_job_data(user_id)
                """)
            )
            print("✓ Created index on user_id")
        else:
            print("✓ user_id column already exists, skipping migration")
    
    await engine.dispose()
    print("✓ Migration completed successfully")


if __name__ == "__main__":
    asyncio.run(run_migration())
