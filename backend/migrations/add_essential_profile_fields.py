"""
Migration: Add essential profile fields to master_profiles table.
Adds missing columns needed for CV personalization and job application matching.
"""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def run_migration():
    """Add essential columns to master_profiles table."""
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/aditus",
        echo=False,
    )
    
    columns_to_add = [
        # Skills & Experience
        ("technical_skills", "JSONB DEFAULT '[]'"),
        ("soft_skills", "JSONB DEFAULT '[]'"),
        ("work_experience", "JSONB DEFAULT '[]'"),
        
        # Education details
        ("education_level", "VARCHAR(100)"),
        ("field_of_study", "VARCHAR(255)"),
        
        # Professional summary
        ("professional_summary", "TEXT"),
        
        # Additional sections
        ("languages", "JSONB DEFAULT '[]'"),
        ("publications", "JSONB DEFAULT '[]'"),
        ("volunteer_experience", "JSONB DEFAULT '[]'"),
        
        # Career preferences
        ("preferred_locations", "JSONB DEFAULT '[]'"),
        ("remote_preference", "VARCHAR(50)"),
    ]
    
    async with engine.begin() as conn:
        # Check existing columns
        result = await conn.execute(
            text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'master_profiles'
            """)
        )
        existing_columns = {row[0] for row in result}
        
        # Add missing columns
        for column_name, column_def in columns_to_add:
            if column_name not in existing_columns:
                try:
                    await conn.execute(
                        text(f"ALTER TABLE master_profiles ADD COLUMN {column_name} {column_def}")
                    )
                    print(f"✅ Added column: {column_name}")
                except Exception as e:
                    print(f"⚠️ Could not add {column_name}: {e}")
            else:
                print(f"⏭️ Column {column_name} already exists")
        
        await conn.commit()
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    import sys
    sys.path.insert(0, '/home/caleb/kiptoo/leia/backend')
    asyncio.run(run_migration())
