# Paystack Integration - Testing & Deployment Checklist

**Status:** Ready for Testing  
**Last Updated:** February 2026  
**Version:** 1.0

---

## ✅ Pre-Deployment Checklist

### Configuration & Setup
- [ ] Paystack account created and verified
- [ ] API keys obtained (public, secret, webhook secret)
- [ ] `.env` file created and configured with Paystack keys
- [ ] Database migration script prepared
- [ ] All configuration variables verified

### Code Review
- [ ] PaystackService implementation reviewed
- [ ] API endpoints reviewed for security
- [ ] Database models reviewed for constraints
- [ ] Error handling reviewed
- [ ] Logging reviewed

### Environment Verification
- [ ] Python syntax checks passed: `python3 -m py_compile app/api/paystack_payments.py`
- [ ] Configuration loads without errors
- [ ] Database connection verified
- [ ] Redis cache verified (if using)

---

## 🧪 Testing Phases

### Phase 1: Unit Testing (Local)

#### 1.1 Configuration Testing
```bash
# [ ] Verify config loads
python3 << 'EOF'
from app.core.config import get_settings
settings = get_settings()
assert settings.PAYSTACK_PUBLIC_KEY, "Public key missing"
assert settings.PAYSTACK_SECRET_KEY, "Secret key missing"
assert settings.PAYSTACK_WEBHOOK_SECRET, "Webhook secret missing"
print("✅ Configuration verified")
EOF

# [ ] Check environment variables
echo "Public key exists: $([ -z $PAYSTACK_PUBLIC_KEY ] && echo ✗ || echo ✓)"
echo "Secret key exists: $([ -z $PAYSTACK_SECRET_KEY ] && echo ✗ || echo ✓)"
echo "Webhook secret exists: $([ -z $PAYSTACK_WEBHOOK_SECRET ] && echo ✗ || echo ✓)"
```

#### 1.2 Database Testing
```bash
# [ ] Run migration
cd /backend
python3 migrations/add_paystack_tables.py

# [ ] Verify tables created
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'paystack%' ORDER BY table_name;

SELECT table_name, indexname FROM pg_indexes 
WHERE tablename LIKE 'paystack%' ORDER BY tablename, indexname;
EOF

# [ ] Check table structure
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
\d paystack_payments
\d paystack_transactions
\d paystack_logs
EOF
```

#### 1.3 Service Testing
```bash
# [ ] Test PaystackService imports
python3 << 'EOF'
from app.services.paystack_service import PaystackService, PaystackError
print("✅ PaystackService imports successfully")
EOF

# [ ] Test signature verification
python3 << 'EOF'
from app.services.paystack_service import PaystackService
import hmac
import hashlib
import json

# Test data
webhook_secret = "test_secret"
test_data = {"event": "charge.success", "data": {"reference": "pslv_xxxxx"}}

# Generate signature
body = json.dumps(test_data).encode()
hash_obj = hmac.new(webhook_secret.encode(), body, hashlib.sha512)
signature = hash_obj.hexdigest()

print(f"✅ Signature generated: {signature[:20]}...")
EOF
```

#### 1.4 API Endpoints Testing (Unit)
```bash
# [ ] Test endpoint imports
python3 << 'EOF'
from app.api import paystack_payments
print(f"✅ API loaded successfully")
print(f"Routes: {len(paystack_payments.router.routes)} endpoints")
for route in paystack_payments.router.routes:
    print(f"  - {route.path}")
EOF
```

---

### Phase 2: Integration Testing (Local)

#### 2.1 Backend Server Setup
```bash
# [ ] Start backend in development mode
cd /backend
uvicorn main:app --reload --log-level debug

# Expected output:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# ✅ Health check endpoint returns 200
```

#### 2.2 Health Check Tests
```bash
# [ ] Test general health endpoint
curl -s http://localhost:8000/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "app": "Aditus",
#   "version": "0.1.0"
# }

# [ ] Test database health endpoint
curl -s http://localhost:8000/health/db | jq .

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected"
# }
```

#### 2.3 Payment Initiation Test (TEST MODE)
```bash
# Get authentication token first
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.data.access_token'

# [ ] Test payment initiation endpoint
PAYLOAD='{
  "email": "test@example.com",
  "plan_id": 2,
  "amount": 9985,
  "payment_method": "mpesa",
  "phone": "07xxxxxxxx"
}'

RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq .

# Expected response includes:
# - success: true
# - data.authorization_url (checkout URL)
# - data.reference (payment reference)
# - data.access_code (Paystack access code)
# - data.payment_id (database ID)

# [ ] Verify response contains required fields
echo "$RESPONSE" | jq -e '.data.authorization_url' && echo "✓ Authorization URL present"
echo "$RESPONSE" | jq -e '.data.reference' && echo "✓ Reference present"
echo "$RESPONSE" | jq -e '.data.access_code' && echo "✓ Access code present"
```

#### 2.4 Payment Verification Test
```bash
# [ ] Test verification endpoint with reference from above
REFERENCE=$(echo "$RESPONSE" | jq -r '.data.reference')

curl -s -X GET http://localhost:8000/api/v1/payments/verify/$REFERENCE \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# Expected response:
# {
#   "success": true,
#   "data": {
#     "reference": "pslv_xxxxx",
#     "status": "pending",  (or "success")
#     "amount": 9985,
#     ...
#   }
# }
```

#### 2.5 Payment Status Test
```bash
# [ ] Test user payment status endpoint
curl -s -X GET http://localhost:8000/api/v1/payments/status \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# Expected response includes:
# - recent_payments (list)
# - current_subscription (if active)
# - account_balance
# - total_successful_payments
# - total_failed_payments
```

#### 2.6 Webhook Test (Local)
```bash
# [ ] Generate valid webhook signature
python3 << 'EOF'
import hmac
import hashlib
import json

webhook_secret = os.getenv("PAYSTACK_WEBHOOK_SECRET")
test_event = {
    "event": "charge.success",
    "data": {
        "reference": "pslv_test123",
        "status": "success",
        "amount": 9985,
        "paid_at": "2026-02-19T10:30:45.000Z",
        "customer": {"email": "test@example.com", "phone": "07xxxxxxxx"}
    }
}

body = json.dumps(test_event).encode()
hash_obj = hmac.new(webhook_secret.encode(), body, hashlib.sha512)
signature = hash_obj.hexdigest()

print(f"Webhook signature: {signature}")
print(f"Test event: {json.dumps(test_event, indent=2)}")
EOF

# [ ] Send webhook event
curl -X POST http://localhost:8000/api/v1/payments/webhook \
  -H "x-paystack-signature: YOUR_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "pslv_test123",
      "status": "success",
      "amount": 9985,
      "paid_at": "2026-02-19T10:30:45.000Z"
    }
  }'

# Expected response:
# {"success": true, "message": "Webhook processed"}

# [ ] Verify payment in database
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT id, reference, status, amount, completed_at 
FROM paystack_payments 
WHERE reference = 'pslv_test123';
EOF
```

---

### Phase 3: Integration Testing with Paystack (Live APIs)

#### 3.1 Setup Test Mode in Paystack
- [ ] Log in to Paystack Dashboard
- [ ] Settings → API Keys & Webhooks
- [ ] Toggle to "Test" mode (don't toggle back until fully tested!)
- [ ] Copy test Public Key and Secret Key
- [ ] Update `.env` with test keys
- [ ] Copy Webhook Secret
- [ ] Update `.env` with webhook secret

#### 3.2 Webhook Configuration
```bash
# [ ] For local testing, use ngrok to expose local server
ngrok http 8000
# This generates: Forwarding https://xxxx-xx-xxx-xxx.ngrok.io -> http://localhost:8000

# [ ] Update Paystack webhook URL in Dashboard:
# Settings → Webhook Settings
# URL: https://xxxx-xx-xxx-xxx.ngrok.io/api/v1/payments/webhook

# [ ] Verify webhook is active
# You should see "Active" status in dashboard
```

#### 3.3 Test Payment Flow with Real Paystack
```bash
# [ ] Initiate payment via API
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "plan_id": 2,
    "amount": 9985,
    "payment_method": "mpesa"
  }'

# [ ] Extract authorization_url from response
# Visit the URL in browser: https://checkout.paystack.com/...

# [ ] Complete test payment
# For M-Pesa: Use test number 254790000000
# Amount ending in 85 = success, 15 = fail, 00 = pending

# [ ] Verify payment in database
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT * FROM paystack_payments ORDER BY created_at DESC LIMIT 1;
SELECT * FROM paystack_transactions ORDER BY created_at DESC LIMIT 1;
SELECT * FROM paystack_logs ORDER BY created_at DESC LIMIT 5;
EOF
```

#### 3.4 Webhook Delivery Test
```bash
# [ ] Check Paystack webhook logs
# Dashboard → API Keys & Webhooks → Webhook Logs
# Verify events were delivered and accepted (200 response)

# [ ] Verify webhook was processed correctly
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT event_type, message, created_at 
FROM paystack_logs 
WHERE event_type IN ('webhook_received', 'success')
ORDER BY created_at DESC LIMIT 10;
EOF

# [ ] Check if subscription was activated
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT * FROM subscriptions 
WHERE user_id = (SELECT user_id FROM paystack_payments ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC LIMIT 1;
EOF
```

---

### Phase 4: Error Handling Tests

#### 4.1 Invalid Input Tests
```bash
# [ ] Test missing required fields
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"plan_id": 2}'

# Expected: 400 Bad Request with error message

# [ ] Test invalid amount
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "test@example.com", "plan_id": 2, "amount": 0}'

# Expected: 400 Bad Request

# [ ] Test invalid email
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "invalid_email", "plan_id": 2, "amount": 9985}'

# Expected: 400 Bad Request
```

#### 4.2 Authorization Tests
```bash
# [ ] Test endpoint without token
curl -X GET http://localhost:8000/api/v1/payments/status

# Expected: 401 Unauthorized

# [ ] Test endpoint with invalid token
curl -X GET http://localhost:8000/api/v1/payments/status \
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Unauthorized

# [ ] Test accessing another user's payment
# Create payment with User A
# Try to verify with User B token
# Expected: 403 Forbidden
```

#### 4.3 Webhook Security Tests
```bash
# [ ] Test webhook without signature
curl -X POST http://localhost:8000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "charge.success", "data": {}}'

# Expected: 401 Missing signature

# [ ] Test webhook with invalid signature
curl -X POST http://localhost:8000/api/v1/payments/webhook \
  -H "x-paystack-signature: invalid_signature_here" \
  -H "Content-Type: application/json" \
  -d '{"event": "charge.success", "data": {}}'

# Expected: 401 Invalid signature

# [ ] Test webhook with wrong secret
# Generate signature with different secret
# Expected: 401 Signature mismatch
```

#### 4.4 Duplicate/Idempotency Tests
```bash
# [ ] Send same webhook event twice
# First: Should process normally
# Second: Should be rejected as duplicate
# Expected: Both return 200, but only one updates DB

# [ ] Verify in logs
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT event_type, message, COUNT(*)
FROM paystack_logs
WHERE event_type = 'webhook_received'
GROUP BY event_type, message
HAVING COUNT(*) > 1;
EOF
```

---

### Phase 5: Performance & Load Testing

#### 5.1 Load Testing
```bash
# [ ] Install Apache Bench
sudo apt-get install apache2-utils

# [ ] Test payment initiation endpoint under load
ab -n 100 -c 10 -m POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -p payload.json \
  http://localhost:8000/api/v1/payments/initiate

# [ ] Monitor database connections
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
EOF

# [ ] Check response times
# Expected: >95% response time < 500ms
```

#### 5.2 Concurrent Webhook Tests
```bash
# [ ] Send multiple webhooks concurrently
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/v1/payments/webhook \
    -H "x-paystack-signature: signature_$i" \
    -d "{\"event\": \"charge.success\", \"data\": {\"reference\": \"pslv_$i\"}}" &
done
wait

# [ ] Verify all processed correctly
psql postgresql://postgres:postgres@localhost:5432/aditus << 'EOF'
SELECT COUNT(*) FROM paystack_logs WHERE event_type = 'webhook_received';
EOF
```

---

### Phase 6: Production Readiness

#### 6.1 Security Audit
- [ ] API keys are environment variables only
- [ ] No secrets logged anywhere
- [ ] HTTPS required for webhooks
- [ ] Rate limiting enabled on endpoints
- [ ] CORS properly configured
- [ ] Input validation in place
- [ ] SQL injection protection verified
- [ ] CSRF protection enabled

#### 6.2 Database Audit
- [ ] Foreign key constraints enforced
- [ ] Indexes optimized
- [ ] Cascade deletion configured
- [ ] Backup strategy in place
- [ ] Recovery procedure tested

#### 6.3 Monitoring Setup
- [ ] Payment success/failure metrics configured
- [ ] Webhook delivery monitoring enabled
- [ ] Error tracking setup (Sentry/similar)
- [ ] Log aggregation configured (ELK/Datadog)
- [ ] Alerts configured for:
  - Payment success rate < 95%
  - Webhook processing time > 5s
  - Failed payments > 5/hour
  - Database connection errors

#### 6.4 Documentation
- [ ] README updated with payment flow
- [ ] API documentation generated
- [ ] Runbook created for common issues
- [ ] Incident response plan created
- [ ] User documentation created

#### 6.5 Deployment
- [ ] Switch to production API keys
- [ ] Update webhook URL to production domain
- [ ] Update callback URLs to production domain
- [ ] Configure SSL certificate
- [ ] Test full payment flow in production
- [ ] Monitor logs during first payments

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment (Day Before)
```bash
# [ ] Backup production database
pg_dump -U postgres aditus > backup_$(date +%Y%m%d_%H%M%S).sql

# [ ] Run migration in staging
python3 migrations/add_paystack_tables.py --database-url $STAGING_DB

# [ ] Test all endpoints in staging
# Run Phase 3 & 4 tests above in staging environment

# [ ] Verify monitoring is working
# Check that all metrics are being collected
```

### Step 2: Deployment (During Maintenance Window)
```bash
# [ ] Stop web server gracefully
# [ ] Run database migration
python3 migrations/add_paystack_tables.py

# [ ] Verify tables created
# [ ] Update .env with production API keys
# [ ] Update webhook URL in Paystack
# [ ] Deploy new code
# [ ] Start web server

# [ ] Monitor logs for errors
tail -f /var/log/aditus/app.log
```

### Step 3: Post-Deployment (After Go-Live)
```bash
# [ ] Run smoke tests (Phase 3 tests)
# [ ] Monitor payment metrics
# [ ] Check webhook delivery success rate
# [ ] Verify user payments are processing
# [ ] Check error rates

# If issues found:
# [ ] Rollback to previous version
# [ ] Investigate in staging
# [ ] Fix and redeploy

# After stable for 1 hour:
# [ ] Mark deployment as successful
# [ ] Send notification to team
# [ ] Continue monitoring for 24 hours
```

---

## 📋 Sign-Off Checklist

### Development Team
- [ ] Code reviewed by 2+ developers
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Performance tests show acceptable results
- [ ] Security audit completed and cleared

### QA Team
- [ ] Functional testing completed
- [ ] Error scenarios tested
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] Production readiness verified

### DevOps Team
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Backup/restore tested
- [ ] Disaster recovery plan in place

### Product Team
- [ ] Feature meets requirements
- [ ] User documentation complete
- [ ] Stakeholders informed
- [ ] Go-live approval given

---

## 📞 Support Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Paystack Support | support@paystack.com | 24/7 |
| Dev Lead | [Your Name] | Business hours |
| DevOps Lead | [Your Name] | Business hours |
| On-Call | [Your Name] | 24/7 |

---

## 📚 Related Documentation

- [PAYSTACK_INTEGRATION_GUIDE.md](PAYSTACK_INTEGRATION_GUIDE.md) - Complete integration guide
- [PAYSTACK_QUICK_REFERENCE.md](PAYSTACK_QUICK_REFERENCE.md) - Quick start reference
- [PAYSTACK_ENV_TEMPLATE.md](PAYSTACK_ENV_TEMPLATE.md) - Environment setup
- [PAYSTACK_IMPLEMENTATION_COMPLETE.md](PAYSTACK_IMPLEMENTATION_COMPLETE.md) - Implementation summary

---

**Last Updated:** February 2026  
**Next Review:** After first production payment  
**Status:** Ready for Testing Phase

