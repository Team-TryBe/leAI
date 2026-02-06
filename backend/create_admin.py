#!/usr/bin/env python3
"""
Create admin user directly in the database
Usage: python3 create_admin.py
"""

import asyncio
from passlib.context import CryptContext
from sqlalchemy import text
from app.db.database import engine
from app.db.models import User, Base

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

async def create_admin_user():
    """Create admin user in the database."""
    
    email = "kiptoocaleb02@gmail.com"
    full_name = "kiptoo caleb"
    password = "admin1234"
    
    # Hash the password
    hashed_password = hash_password(password)
    
    print(f"Creating admin user...")
    print(f"  Email: {email}")
    print(f"  Name: {full_name}")
    print(f"  Hashed Password: {hashed_password[:20]}...")
    
    async with engine.begin() as conn:
        # Check if user already exists
        result = await conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email}
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"❌ User with email '{email}' already exists!")
            return False
        
        # Insert new admin user
        await conn.execute(
            text("""
                INSERT INTO users (email, full_name, hashed_password, is_admin, is_active)
                VALUES (:email, :full_name, :hashed_password, true, true)
            """),
            {
                "email": email,
                "full_name": full_name,
                "hashed_password": hashed_password
            }
        )
        
        # Verify insertion
        result = await conn.execute(
            text("SELECT id, email, is_admin FROM users WHERE email = :email"),
            {"email": email}
        )
        user = result.one()
        
        print(f"✅ Admin user created successfully!")
        print(f"  ID: {user[0]}")
        print(f"  Email: {user[1]}")
        print(f"  Admin: {user[2]}")
        
        return True

if __name__ == "__main__":
    asyncio.run(create_admin_user())
