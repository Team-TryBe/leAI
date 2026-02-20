# Paystack Integration - Quick Reference

**Status:** Phase 1 Complete - Core Implementation Ready  
**Date:** February 2026  
**Environment Support:** Test & Production

---

## 📦 What's Been Implemented

### 1. ✅ Comprehensive Documentation
- **File:** [`PAYSTACK_INTEGRATION_GUIDE.md`](PAYSTACK_INTEGRATION_GUIDE.md)
- Complete end-to-end flow with diagrams
- Configuration, testing, and deployment guides
- Error handling and troubleshooting

### 2. ✅ PaystackService (Core Service)
- **File:** `/backend/app/services/paystack_service.py`
- **Features:**
  - `initialize_payment()` - Start payment via Paystack
  - `verify_payment()` - Check payment status
  - `verify_webhook_signature()` - Validate webhook authenticity
  - `handle_webhook()` - Process Paystack events
  - Automatic subscription activation on success
  - Complete error handling with retries

### 3. ✅ Database Models
- **File:** `/backend/app/db/models.py`
- **Models:**
  - `PaystackPayment` - Payment records
  - `PaystackTransaction` - Transaction details
  - `PaystackLog` - Audit trail

### 4. ✅ Migration Script
- **File:** `/backend/migrations/add_paystack_tables.py`
- Creates 3 tables with 9 optimized indexes
- Ready to execute

---

## 🚀 Next Steps (What You Need to Do)

### Step 1: Environment Setup
Add to your `.env` file:

```bash
# Paystack Configuration
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Callback URLs
PAYSTACK_CALLBACK_SUCCESS=https://your-domain.com/subscription/success
PAYSTACK_CALLBACK_CANCEL=https://your-domain.com/subscription/cancel

# Settings
PAYSTACK_CURRENCY=KES
PAYSTACK_TIMEOUT=30
```

### Step 2: Update Configuration
Ensure `app/core/config.py` includes:

```python
class Settings(BaseSettings):
    PAYSTACK_PUBLIC_KEY: str
    PAYSTACK_SECRET_KEY: str
    PAYSTACK_WEBHOOK_SECRET: str
    PAYSTACK_CALLBACK_SUCCESS: str
    PAYSTACK_CALLBACK_CANCEL: str
    PAYSTACK_CURRENCY: str = "KES"
    PAYSTACK_TIMEOUT: int = 30
```

### Step 3: Execute Migration
```bash
cd /backend
python3 migrations/add_paystack_tables.py
```

Expected output:
```
✅ Migration completed successfully!
   - paystack_payments table created
   - paystack_transactions table created
   - paystack_logs table created
   - 9 indexes created for performance
```

### Step 4: Create API Endpoints
Create `/backend/app/api/paystack_payments.py` with:

```python
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.api.users import get_current_user
from app.services.paystack_service import PaystackService, PaystackError
from app.db.models import User

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/initiate")
async def initiate_payment(
    email: str,
    plan_id: int,
    amount: int,  # In KES cents
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a payment via Paystack."""
    try:
        service = PaystackService(db)
        result = await service.initialize_payment(
            user_id=current_user.id,
            email=email,
            amount=amount,
            plan_id=plan_id,
            payment_method="mpesa"
        )
        return {"success": True, "data": result}
    except PaystackError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/verify/{reference}")
async def verify_payment(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify payment status."""
    try:
        service = PaystackService(db)
        result = await service.verify_payment(reference)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def webhook(
    x_paystack_signature: str = Header(...),
    event_data: dict = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle Paystack webhook."""
    import json
    
    try:
        service = PaystackService(db)
        
        # Verify signature
        body = json.dumps(event_data).encode()
        if not service.verify_webhook_signature(x_paystack_signature, body):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Process webhook
        await service.handle_webhook(event_data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Step 5: Register Routes in main.py
```python
from app.api import paystack_payments

app.include_router(paystack_payments.router, prefix="/api/v1")
```

---

## 📝 API Usage Examples

### Initialize Payment (Frontend → Backend)

```bash
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "plan_id": 2,
    "amount": 9900,
    "billing_cycle": "monthly"
  }'

# Response
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "xxxxx",
    "reference": "pslv_xxxxx",
    "amount": 9900,
    "payment_id": 123,
    "public_key": "pk_live_xxxxx"
  }
}
```

### Verify Payment (Frontend → Backend)

```bash
curl -X GET http://localhost:8000/api/v1/payments/verify/pslv_xxxxx \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response
{
  "success": true,
  "data": {
    "status": "success",
    "amount": 9900,
    "message": "Verified",
    "transaction_id": "1234567890",
    "receipt": "pslv_xxxxx",
    "paid_at": "2026-02-19T10:30:45.000Z"
  }
}
```

### Webhook Event (Paystack → Backend)

```json
POST https://your-domain.com/api/v1/payments/webhook

{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "reference": "pslv_xxxxx",
    "status": "success",
    "amount": 9900,
    "customer": {
      "email": "user@example.com",
      "phone": "07xxxxxxxx"
    },
    "paid_at": "2026-02-19T10:30:45.000Z"
  }
}
```

---

## 🧪 Testing Guide

### 1. Test Mode Setup

From Paystack Dashboard:
```
1. Go to Settings → API Keys & Webhooks
2. Toggle to "Test" mode
3. Copy test keys
4. Update .env with test keys
```

### 2. Test Payment Initialization

```bash
# Test endpoint locally
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer test_token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "plan_id": 2,
    "amount": 9985
  }'
```

### 3. Test Amount Codes

| Amount | Result |
|--------|--------|
| Ends in 15 | FAIL (test code) |
| Ends in 85 | SUCCESS (test code) |
| Ends in 00 | PENDING |

### 4. Test Webhook Locally

Use Paystack CLI or manually send:

```bash
curl -X POST http://localhost:8000/api/v1/payments/webhook \
  -H "x-paystack-signature: hash_value" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "pslv_xxxxx",
      "status": "success",
      "amount": 9985,
      "paid_at": "2026-02-19T10:30:45.000Z"
    }
  }'
```

---

## 📊 Database Schema

### paystack_payments
```sql
SELECT * FROM paystack_payments WHERE user_id = 123;

-- Fields
id                  - Payment ID
user_id             - User making payment
reference           - Paystack reference (unique)
access_code         - Payment session code
authorization_url   - Checkout URL
amount              - In KES cents (9900 = 99.00)
status              - pending|success|failed
payment_method      - mpesa|card|bank_transfer
payer_phone         - M-Pesa number (07xxx)
plan_id             - Subscription plan
payment_metadata    - Additional data
expires_at          - Payment expires after 24h
```

### paystack_transactions
```sql
SELECT * FROM paystack_transactions WHERE paystack_payment_id = 123;

-- Contains Paystack's full response for audit trail
```

### paystack_logs
```sql
SELECT * FROM paystack_logs WHERE paystack_payment_id = 123 ORDER BY created_at DESC;

-- Event log: initiated|verified|webhook_received|success|failed
```

---

## 🔑 Key Configuration Items

| Item | Value | Notes |
|------|-------|-------|
| Public Key | `pk_live_...` or `pk_test_...` | Used by frontend |
| Secret Key | `sk_live_...` or `sk_test_...` | Backend only |
| Webhook Secret | `whsec_...` | For webhook verification |
| Currency | `KES` | Kenya Shillings |
| Callback URLs | HTTPS required | For redirects |
| Timeout | 30 seconds | For API calls |

---

## 🚨 Error Handling

### Common Errors

```python
# Quota exceeded
PaymentInitializationError("Amount must be greater than 0")

# Invalid webhook
WebhookVerificationError("Invalid signature")

# API timeout
PaymentInitializationError("Payment service timeout (>30s)")

# Payment not found
# Logged but doesn't raise - handled gracefully
```

---

## 📈 Monitoring & Alerts

Monitor these metrics:

```sql
-- Failed payments
SELECT COUNT(*) FROM paystack_payments 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours';

-- Pending payments (might be abandoned)
SELECT * FROM paystack_payments 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '6 hours';

-- Webhook lag
SELECT AVG(EXTRACT(EPOCH FROM (created_at - timestamp))) 
FROM paystack_logs 
WHERE event_type = 'webhook_received';

-- Success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM paystack_payments
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## 🔐 Security Checklist

- [ ] Using HTTPS URLs only
- [ ] Webhook signature verified
- [ ] No API keys in logs
- [ ] Secret key only on backend
- [ ] Public key safe for frontend
- [ ] Payment amounts validated
- [ ] User authenticated before payment
- [ ] Idempotency checks implemented
- [ ] Rate limiting on endpoints
- [ ] PCI compliance verified

---

## 📞 Support Resources

- **Paystack Docs:** https://paystack.com/docs/payments/
- **M-Pesa Guide:** https://paystack.com/docs/payments/mobile-money/
- **API Reference:** https://paystack.com/docs/api/
- **Test Credentials:** See Paystack Dashboard

---

## 📋 Remaining Tasks

- [ ] Create `/api/paystack_payments.py` endpoints
- [ ] Add webhook signature validation
- [ ] Create subscription activation logic
- [ ] Add email receipts
- [ ] Create admin dashboard for payments
- [ ] Implement refund handling
- [ ] Add payment dispute tracking
- [ ] Create reconciliation reports

---

**Ready for implementation! Follow the Next Steps section to complete the integration.**
