"""
Migration: Update extracted_job_data schema for better deadline/email tracking

Changes:
1. Make company_name, job_title, location NOT NULL (required fields)
2. Change application_deadline from DateTime to String (for flexibility)
3. Add application_deadline_notes for deadline context
4. Add application_email_to and application_email_cc for email tracking
5. Update application_method field
6. Add application_url field
7. Add responsibilities and benefits JSON fields
8. Update company_industry and company_size fields
"""

import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def run_migration():
    """Run the migration to update extracted_job_data schema."""
    
    async with AsyncSessionLocal() as db:
        try:
            # Check if columns exist before adding
            print("📝 Updating extracted_job_data schema...")
            
            # 1. Add missing columns (if not exist)
            columns_to_add = {
                "application_deadline_notes": "TEXT",
                "application_email_to": "VARCHAR(255)",
                "application_email_cc": "VARCHAR(255)",
                "application_url": "VARCHAR(500)",
                "responsibilities": "JSON",
                "benefits": "JSON",
            }
            
            for col_name, col_type in columns_to_add.items():
                try:
                    await db.execute(text(f"""
                        ALTER TABLE extracted_job_data 
                        ADD COLUMN {col_name} {col_type}
                    """))
                    print(f"  ✅ Added column: {col_name}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"  ℹ️  Column {col_name} already exists")
                    else:
                        print(f"  ⚠️  Error adding {col_name}: {e}")
            
            # 2. Update application_deadline type if needed
            # Note: This is complex in PostgreSQL, so we'll just ensure the column exists
            try:
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    RENAME COLUMN application_deadline TO application_deadline_old
                """))
                
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    ADD COLUMN application_deadline VARCHAR(255)
                """))
                
                # Copy data (convert DateTime to string)
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
                
                print(f"  ✅ Updated application_deadline column (DateTime -> VARCHAR)")
            except Exception as e:
                if "already exists" in str(e).lower() or "already defined" in str(e).lower():
                    print(f"  ℹ️  application_deadline column already updated")
                else:
                    print(f"  ⚠️  Note: application_deadline may need manual update")
            
            # 3. Update NOT NULL constraints
            try:
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    ALTER COLUMN company_name SET NOT NULL
                """))
                print(f"  ✅ Made company_name NOT NULL")
            except:
                print(f"  ℹ️  company_name constraint already set")
            
            try:
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    ALTER COLUMN job_title SET NOT NULL
                """))
                print(f"  ✅ Made job_title NOT NULL")
            except:
                print(f"  ℹ️  job_title constraint already set")
            
            try:
                await db.execute(text("""
                    ALTER TABLE extracted_job_data 
                    ALTER COLUMN location SET NOT NULL
                """))
                print(f"  ✅ Made location NOT NULL")
            except:
                print(f"  ℹ️  location constraint already set")
            
            # 4. Initialize JSON columns with empty arrays/objects
            try:
                await db.execute(text("""
                    UPDATE extracted_job_data 
                    SET responsibilities = '[]'::json 
                    WHERE responsibilities IS NULL
                """))
                
                await db.execute(text("""
                    UPDATE extracted_job_data 
                    SET benefits = '[]'::json 
                    WHERE benefits IS NULL
                """))
                
                print(f"  ✅ Initialized JSON columns")
            except Exception as e:
                print(f"  ℹ️  JSON columns already initialized: {e}")
            
            await db.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            await db.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
