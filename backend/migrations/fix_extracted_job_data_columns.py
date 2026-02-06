"""
Fix extracted_job_data schema - Add missing columns for deadline/email tracking
Simplified version that adds one column at a time
"""

import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def add_column_if_not_exists(db, column_name, column_type):
    """Add a column only if it doesn't already exist."""
    try:
        # Check if column exists
        result = await db.execute(text(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'extracted_job_data' 
            AND column_name = '{column_name}'
        """))
        exists = result.fetchone()
        
        if not exists:
            await db.execute(text(f"""
                ALTER TABLE extracted_job_data 
                ADD COLUMN {column_name} {column_type}
            """))
            await db.commit()
            print(f"  ✅ Added column: {column_name}")
        else:
            print(f"  ℹ️  Column already exists: {column_name}")
    except Exception as e:
        await db.rollback()
        print(f"  ⚠️  Error adding {column_name}: {e}")

async def run_migration():
    """Add all missing columns to extracted_job_data table."""
    
    async with AsyncSessionLocal() as db:
        print("📝 Adding missing columns to extracted_job_data...\n")
        
        # Define columns to add
        columns_to_add = [
            ("application_deadline_notes", "TEXT"),
            ("application_email_to", "VARCHAR(255)"),
            ("application_email_cc", "VARCHAR(255)"),
            ("application_method", "VARCHAR(100)"),
            ("application_url", "VARCHAR(500)"),
            ("responsibilities", "JSON"),
            ("benefits", "JSON"),
        ]
        
        for col_name, col_type in columns_to_add:
            await add_column_if_not_exists(db, col_name, col_type)
        
        # Update application_deadline type from TIMESTAMP to VARCHAR
        print("\n📝 Updating application_deadline column type...")
        try:
            # Check current type
            result = await db.execute(text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'extracted_job_data' 
                AND column_name = 'application_deadline'
            """))
            current_type = result.fetchone()[0]
            
            if 'timestamp' in current_type.lower():
                # Rename old column
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    RENAME COLUMN application_deadline TO application_deadline_old
                """))
                
                # Add new column
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    ADD COLUMN application_deadline VARCHAR(255)
                """))
                
                # Copy data
                await db.execute(text("""
                    UPDATE extracted_job_data 
                    SET application_deadline = TO_CHAR(application_deadline_old, 'YYYY-MM-DD')
                    WHERE application_deadline_old IS NOT NULL
                """))
                
                # Drop old column
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    DROP COLUMN application_deadline_old
                """))
                
                await db.commit()
                print("  ✅ Updated application_deadline from TIMESTAMP to VARCHAR")
            else:
                print("  ℹ️  application_deadline is already VARCHAR")
        except Exception as e:
            await db.rollback()
            print(f"  ⚠️  Error updating application_deadline: {e}")
        
        # Remove obsolete columns
        print("\n📝 Removing obsolete columns...")
        obsolete_columns = ["nice_to_have", "hiring_manager_name", "hiring_manager_title", "company_tone"]
        
        for col in obsolete_columns:
            try:
                result = await db.execute(text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'extracted_job_data' 
                    AND column_name = '{col}'
                """))
                exists = result.fetchone()
                
                if exists:
                    await db.execute(text(f"""
                        ALTER TABLE extracted_job_data 
                        DROP COLUMN {col}
                    """))
                    await db.commit()
                    print(f"  ✅ Removed obsolete column: {col}")
            except Exception as e:
                await db.rollback()
                print(f"  ⚠️  Error removing {col}: {e}")
        
        print("\n✅ Migration completed!")

if __name__ == "__main__":
    asyncio.run(run_migration())
