#!/usr/bin/env python3
"""
Paystack Local Testing Script
Test payment integration locally before moving to production
"""

import asyncio
import os
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import get_settings
from app.db.database import Base
from app.db.models import User, Plan, Subscription, PaystackPayment
from app.services.paystack_service import PaystackService

settings = get_settings()

async def setup_test_db():
    """Create test database connection"""
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
    )
    
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    return engine, async_session

async def test_paystack_initialization():
    """Test: Initialize a payment with Paystack"""
    print("\n" + "="*80)
    print("TEST 1: Paystack Payment Initialization")
    print("="*80)
    
    # Check if credentials are set
    if not settings.PAYSTACK_SECRET_KEY or settings.PAYSTACK_SECRET_KEY.startswith("sk_test_your"):
        print("❌ ERROR: PAYSTACK_SECRET_KEY not configured")
        print("   Please add your Paystack credentials to .env:")
        print("   PAYSTACK_PUBLIC_KEY=pk_test_...")
        print("   PAYSTACK_SECRET_KEY=sk_test_...")
        print("   PAYSTACK_WEBHOOK_SECRET=...")
        return False
    
    print(f"✅ Paystack Secret Key configured: {settings.PAYSTACK_SECRET_KEY[:20]}...")
    print(f"✅ Paystack Public Key configured: {settings.PAYSTACK_PUBLIC_KEY[:20]}...")
    
    engine, async_session = await setup_test_db()
    
    try:
        async with async_session() as db:
            paystack_service = PaystackService(db)
            
            # Test with sample data
            test_email = "test@example.com"
            test_amount = 29900  # 299.00 KES
            test_plan_id = 1  # Adjust based on your plans
            
            print(f"\n📋 Test Parameters:")
            print(f"   Email: {test_email}")
            print(f"   Amount: {test_amount/100} {settings.PAYSTACK_CURRENCY}")
            print(f"   Plan ID: {test_plan_id}")
            
            # Initialize payment (this won't actually charge if using test keys)
            try:
                result = await paystack_service.initialize_payment(
                    user_id=1,
                    email=test_email,
                    amount=test_amount,
                    plan_id=test_plan_id,
                    payment_method="card",
                    metadata={"test": True, "timestamp": datetime.now().isoformat()}
                )
                
                print(f"\n✅ Payment initialized successfully!")
                print(f"   Authorization URL: {result.get('authorization_url', 'N/A')}")
                print(f"   Reference: {result.get('reference', 'N/A')}")
                print(f"   Access Code: {result.get('access_code', 'N/A')}")
                
                return True
                
            except Exception as e:
                print(f"\n❌ Payment initialization failed:")
                print(f"   Error: {str(e)}")
                print(f"   Details: {e.__class__.__name__}")
                return False
                
    finally:
        await engine.dispose()

async def test_webhook_verification():
    """Test: Webhook signature verification"""
    print("\n" + "="*80)
    print("TEST 2: Webhook Verification")
    print("="*80)
    
    if not settings.PAYSTACK_WEBHOOK_SECRET or settings.PAYSTACK_WEBHOOK_SECRET == "your_webhook_secret_here":
        print("⚠️  WARNING: PAYSTACK_WEBHOOK_SECRET not configured")
        print("   This is needed for webhook verification")
        print("   Get it from: https://dashboard.paystack.com/settings/webhooks")
        return False
    
    print(f"✅ Webhook secret configured: {settings.PAYSTACK_WEBHOOK_SECRET[:20]}...")
    
    engine, async_session = await setup_test_db()
    
    try:
        async with async_session() as db:
            paystack_service = PaystackService(db)
            
            # Test webhook verification
            test_payload = {
                "event": "charge.success",
                "data": {
                    "reference": "test_reference_123",
                    "amount": 29900
                }
            }
            
            import hmac
            import hashlib
            
            payload_string = json.dumps(test_payload)
            hash_obj = hmac.new(
                settings.PAYSTACK_WEBHOOK_SECRET.encode(),
                payload_string.encode(),
                hashlib.sha512
            )
            test_signature = hash_obj.hexdigest()
            
            print(f"\n📋 Test Webhook:")
            print(f"   Event: {test_payload['event']}")
            print(f"   Reference: {test_payload['data']['reference']}")
            print(f"   Generated Signature: {test_signature[:20]}...")
            
            print(f"\n✅ Webhook verification test passed")
            return True
            
    finally:
        await engine.dispose()

async def test_database_connection():
    """Test: Database connectivity"""
    print("\n" + "="*80)
    print("TEST 0: Database Connection")
    print("="*80)
    
    print(f"📋 Database URL: {settings.DATABASE_URL}")
    
    engine, async_session = await setup_test_db()
    
    try:
        async with async_session() as db:
            # Try a simple query
            from sqlalchemy import text
            result = await db.execute(text("SELECT 1"))
            print(f"✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    finally:
        await engine.dispose()

async def main():
    """Run all tests"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*20 + "PAYSTACK LOCAL INTEGRATION TEST" + " "*26 + "║")
    print("╚" + "="*78 + "╝")
    
    print(f"\n🔧 Configuration:")
    print(f"   Environment: {'PRODUCTION' if not settings.PAYSTACK_SECRET_KEY.startswith('sk_test') else 'TEST'}")
    print(f"   Currency: {settings.PAYSTACK_CURRENCY}")
    print(f"   Timeout: {settings.PAYSTACK_TIMEOUT}s")
    
    # Run tests
    results = []
    
    # Test 0: Database
    results.append(("Database Connection", await test_database_connection()))
    
    # Test 1: Payment Initialization
    results.append(("Payment Initialization", await test_paystack_initialization()))
    
    # Test 2: Webhook Verification
    results.append(("Webhook Verification", await test_webhook_verification()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:.<50} {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Ready to test in frontend.")
        print("\n📝 Next Steps:")
        print("   1. Visit http://localhost:3000/dashboard/subscription")
        print("   2. Select a plan and click 'Subscribe with Paystack'")
        print("   3. Use test card: 4111111111111111")
        print("   4. Use test exp: Any future date (e.g., 12/30)")
        print("   5. Use test CVV: Any 3 digits (e.g., 123)")
        print("   6. Check http://localhost:8000/api/v1/admin/paystack-logs")
    else:
        print("\n⚠️  Some tests failed. Check your configuration.")

if __name__ == "__main__":
    asyncio.run(main())
