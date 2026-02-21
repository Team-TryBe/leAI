# 🏗️ Paystack + ngrok Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR LOCAL MACHINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┐      ┌──────────┐      ┌──────────────┐         │
│  │  Frontend  │      │ Backend  │      │  PostgreSQL  │         │
│  │  :3000     │◄────►│  :8000   │◄────►│   Database   │         │
│  │ React/Next │      │ FastAPI  │      │    :5432     │         │
│  └────────────┘      └──────────┘      └──────────────┘         │
│         ▲                   ▲                                     │
│         │                   │                                     │
│         │    (Local Only)   │                                     │
│         │                   │                                     │
│         └──────────────────┬┘                                     │
│                            │                                      │
│                    ┌───────▼────────┐                            │
│                    │   ngrok Tunnel │                            │
│                    │  :4040 (proxy) │                            │
│                    └────────┬────────┘                            │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                    HTTPS Public Internet
                              │
           ┌──────────────────▼──────────────────┐
           │                                     │
           │      Paystack Cloud Services       │
           │      https://api.paystack.co       │
           │                                     │
           │  ┌─────────────────────────────┐   │
           │  │  1. Initialize Payment      │   │
           │  │  POST /transaction/init     │   │
           │  └─────────────────────────────┘   │
           │                │                    │
           │                ▼                    │
           │  ┌─────────────────────────────┐   │
           │  │  2. User Pays at Checkout   │   │
           │  │  https://checkout.paystack  │   │
           │  └─────────────────────────────┘   │
           │                │                    │
           │                ▼                    │
           │  ┌─────────────────────────────┐   │
           │  │  3. Send Webhook Event      │   │
           │  │  POST /webhook (via ngrok)  │   │
           │  └─────────────────────────────┘   │
           │                                     │
           └──────────────────┬──────────────────┘
                              │
                    HTTPS Webhook Delivery
                              │
           ┌──────────────────▼──────────────────┐
           │        Your ngrok Tunnel            │
           │   https://xxxx-xxxx.ngrok.io        │
           │   Forwards to: :8000/webhook        │
           └──────────────────┬──────────────────┘
                              │
           ┌──────────────────▼──────────────────┐
           │    Your Backend API (:8000)         │
           │  Processes Webhook & Stores Data    │
           └──────────────────┬──────────────────┘
                              │
           ┌──────────────────▼──────────────────┐
           │      PostgreSQL Database            │
           │   Stores Transactions & Logs        │
           └──────────────────────────────────────┘
```

## 1️⃣ Payment Initialization

```
Your Frontend          Your Backend           Paystack API
      │                    │                      │
      ├─ POST /subscribe ──►│                      │
      │                    ├─ Check Quota        │
      │                    ├─ Verify User        │
      │                    │                      │
      │                    ├─ POST /initialize ──►│
      │                    │                      ├─ Create Session
      │                    │◄─ Authorization URL─┤
      │                    │                      │
      │◄─ Checkout URL ────┤                      │
      │                    │                      │
      ├─ Redirect to Paystack Checkout ──────────►│
```

## 2️⃣ User Payment

```
Paystack Checkout Page
      │
      ├─ Display Payment Form
      │  - Card Details
      │  - Amount
      │  - User Email
      │
      ├─ User Enters Test Card
      │  - 4111111111111111
      │  - 12/30
      │  - 123
      │
      ├─ Paystack Processes Payment
      │
      ├─ Payment Success
      │  - Create Transaction
      │  - Generate Reference ID
      │
      ├─ Store Event
      │  - charge.success
      │  - charge.failed
      │
      └─ Trigger Webhooks
```

## 3️⃣ Webhook Delivery (ngrok)

```
Paystack Cloud              Your ngrok Tunnel        Your Backend API
       │                           │                        │
       ├─ Generate Event ──────────┐                        │
       │  charge.success           │                        │
       │                           │                        │
       ├─ Prepare Webhook ─────────┐                        │
       │  - Calculate Signature    │                        │
       │  - JSON Payload           │                        │
       │                           │                        │
       ├─ Send HTTPS POST ─────────►│ Public HTTPS URL      │
       │  https://xxxx.ngrok.io    │                        │
       │  /api/v1/payments/webhook │                        │
       │                           ├─ Tunnel to localhost ──►│
       │                           │  http://localhost:8000  │
       │                           │  /api/v1/payments/webhook
       │                           │                        │
       │                           │◄─ Process & Respond ───┤
       │                           │  Status: 200 OK        │
       │                           │                        │
       │◄─ Webhook Logged ─────────┤                        │
       │  Status: Delivered        │                        │
```

## 4️⃣ Backend Processing

```
Webhook Received
       │
       ├─ Verify Signature
       │  x-paystack-signature header
       │  HMAC-SHA512(payload + secret)
       │
       ├─ Parse Payload
       │  Extract reference ID
       │  Extract amount
       │  Extract customer email
       │
       ├─ Verify Payment
       │  GET /transaction/verify/{reference}
       │  Confirm status: success
       │
       ├─ Update Database
       │  INSERT paystack_transactions
       │  INSERT paystack_payments
       │  UPDATE subscriptions
       │  UPDATE users
       │
       ├─ Send Confirmation Email
       │  (Optional)
       │
       ├─ Log Event
       │  INSERT paystack_logs
       │
       └─ Send Response to Paystack
          Status: 200 OK
```

## File Locations & Purposes

```
/backend/
├── .env                              ← Paystack credentials
├── app/
│   ├── api/
│   │   ├── payments.py              ← Payment endpoints
│   │   └── applications.py          ← Send via Gmail endpoint
│   ├── services/
│   │   ├── paystack_service.py      ← Paystack business logic
│   │   └── encryption_service.py    ← Token encryption
│   ├── db/
│   │   └── models.py                ← Database models
│   │       ├── PaystackPayment
│   │       ├── PaystackTransaction
│   │       ├── PaystackLog
│   │       └── Subscription
│   └── core/
│       └── config.py                ← Configuration
│
/frontend/
├── src/
│   ├── app/dashboard/
│   │   └── subscription/            ← Subscription page
│   │       └── page.tsx             ← Plan cards & checkout
│   └── components/
│       └── PaymentDialog.tsx        ← Payment modal
│
├── PAYSTACK_LOCAL_TESTING.md        ← Getting started
├── NGROK_WEBHOOK_SETUP.md           ← Webhook setup
├── PAYSTACK_TESTING_CHECKLIST.md    ← Testing steps
└── start-paystack-testing.sh        ← Startup script
```

## Data Flow: Complete Payment Cycle

```
1. USER ACTION
   └─► Click "Subscribe" on plan card
       
2. FRONTEND
   └─► POST /api/v1/payments/initialize
       ├─ Plan ID
       ├─ User ID
       └─ Email
       
3. BACKEND (Payment Init)
   └─► Check Quota ✓
       Check User ✓
       Create PaystackPayment record
       Call Paystack API
       Return authorization_url
       
4. FRONTEND
   └─► Redirect to Paystack Checkout
       https://checkout.paystack.com/...
       
5. USER (at Paystack)
   └─► Enter test card details
       4111111111111111 | 12/30 | 123
       
6. PAYSTACK (Processing)
   └─► Validate Card ✓
       Process Payment ✓
       Create Transaction ✓
       Generate Reference ID ✓
       
7. PAYSTACK (Webhook)
   └─► Create Event: charge.success
       Calculate Signature
       Send HTTPS POST to ngrok
       https://xxxx.ngrok.io/webhook
       
8. NGROK (Tunnel)
   └─► Receive HTTPS request
       Forward to localhost:8000
       
9. YOUR BACKEND (Webhook Handler)
   └─► Verify Signature ✓
       Parse Event Data ✓
       Query Paystack API for verification ✓
       Update Database ✓
       Insert Transaction ✓
       Update Subscription ✓
       Insert Log ✓
       Return 200 OK ✓
       
10. PAYSTACK (Confirmation)
    └─► Webhook Delivered ✓
        Store Event ✓
        Mark as Processed ✓
        
11. DATABASE (Your PostgreSQL)
    └─► paystack_payments
        ├─ id: 1
        ├─ user_id: 6
        ├─ reference: KS-123456
        ├─ amount: 29900
        └─ status: success
        
        paystack_transactions
        ├─ id: 1
        ├─ reference: KS-123456
        ├─ event: charge.success
        ├─ payload: {...}
        └─ verified: true
        
        subscriptions
        ├─ id: 1
        ├─ user_id: 6
        ├─ plan_id: 1
        ├─ status: active
        └─ expires_at: 2026-03-21
```

## Environment Variables Used

```
PAYSTACK_PUBLIC_KEY
├─ Used in: Frontend (optional, for direct client-side payment)
└─ Format: pk_test_... or pk_live_...

PAYSTACK_SECRET_KEY
├─ Used in: Backend API calls & verification
├─ Format: sk_test_... or sk_live_...
└─ ⚠️  NEVER expose to frontend

PAYSTACK_WEBHOOK_SECRET
├─ Used in: Webhook signature verification
├─ Format: whsec_... or similar
└─ ⚠️  NEVER expose to frontend

PAYSTACK_CALLBACK_SUCCESS
├─ Used in: Redirect after successful payment
└─ Format: http://localhost:3000/dashboard/subscription?status=success

PAYSTACK_CALLBACK_CANCEL
├─ Used in: Redirect after cancelled payment
└─ Format: http://localhost:3000/dashboard/subscription?status=cancel

PAYSTACK_CURRENCY
├─ Used in: Payment amount display
└─ Value: KES (Kenya), NGN (Nigeria), etc.

PAYSTACK_TIMEOUT
├─ Used in: API request timeout
└─ Value: 30 (seconds)
```

## Webhook Event Types

Your backend can handle:

```
charge.success
├─ When: Payment successful
├─ Action: Create subscription, send confirmation
└─ Verify: Check Paystack API for confirmation

charge.failed
├─ When: Payment failed
├─ Action: Log failure, notify user
└─ Verify: Check Paystack API for failure reason

subscription.create
├─ When: Recurring subscription created
├─ Action: Store subscription details
└─ Verify: Verify subscription ID

subscription.disable
├─ When: Subscription cancelled
├─ Action: Update subscription status
└─ Verify: Check reason code
```

## Security Flow

```
1. Request to Backend
   ├─ Include: x-paystack-signature header
   ├─ Payload: JSON body
   └─ Method: POST /webhook
   
2. Backend Verification
   ├─ Get signature from header
   ├─ Recreate signature:
   │  ├─ Get PAYSTACK_WEBHOOK_SECRET
   │  ├─ HMAC-SHA512(json_body + secret)
   │  └─ Get hash
   ├─ Compare: header_signature == calculated_hash
   └─ Result: ✓ Valid or ✗ Invalid
   
3. Secondary Verification
   ├─ Get reference from payload
   ├─ Call Paystack API:
   │  GET /transaction/verify/{reference}
   ├─ Compare amounts & status
   └─ Result: ✓ Confirmed or ✗ Mismatch
   
4. Database Update
   └─ Only if both verifications pass
```

## Testing Checklist for Architecture

- [ ] Frontend can initialize payment
- [ ] Backend receives initialization request
- [ ] Paystack API accepts request
- [ ] User redirected to Paystack checkout
- [ ] User can complete payment with test card
- [ ] Paystack generates webhook event
- [ ] ngrok receives webhook request
- [ ] Backend receives forwarded request
- [ ] Backend verifies webhook signature
- [ ] Backend queries Paystack API
- [ ] Backend updates database
- [ ] Transaction logged in database
- [ ] Subscription created for user
- [ ] User sees success confirmation

---

**Architecture complete! Ready for webhook testing.** 🚀

