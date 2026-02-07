# M-Pesa Payment Integration Guide for Aditus

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Daraja API Setup](#daraja-api-setup)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Testing with Ngrok](#testing-with-ngrok)
7. [Payment Flow](#payment-flow)
8. [API Endpoints](#api-endpoints)
9. [Frontend Integration](#frontend-integration)
10. [Error Handling](#error-handling)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

---

## 📖 Overview

Aditus integrates Safaricom's **M-Pesa Daraja API** (STK Push / Lipa Na M-Pesa Online) to process payments for:
- **Pay-As-You-Go**: KES 50 per application
- **Pro Monthly**: KES 1,999/month
- **Pro Annual**: KES 19,990/year

### Architecture
- **Backend**: FastAPI (Python) with async/await
- **Payment Service**: `app/services/mpesa_service.py`
- **API Routes**: `app/api/payments.py`
- **Database**: PostgreSQL (Transaction model)
- **Frontend**: React PaymentModal component

---

## 🎯 Prerequisites

### 1. Safaricom Daraja Account
- Register at [https://developer.safaricom.co.ke](https://developer.safaricom.co.ke)
- Create a **Lipa Na M-Pesa Online** app
- Get your **Consumer Key** and **Consumer Secret**

### 2. Till Number or Paybill
You mentioned you have a **Till Number** for customer payments. You'll need:
- **Till Number** (acts as your shortcode)
- **Lipa Na M-Pesa Passkey** (from Daraja portal)

### 3. Python Packages
Install required dependencies:
```bash
pip install httpx  # For async HTTP requests
```

---

## 🔧 Daraja API Setup

### Step 1: Create Daraja App
1. Go to [Daraja Portal](https://developer.safaricom.co.ke)
2. Log in and navigate to **My Apps**
3. Click **Create New App**
4. Select **Lipa Na M-Pesa Online** API
5. Fill in app details:
   - **App Name**: Aditus Payments
   - **Description**: Career app subscription payments

### Step 2: Get Credentials
After app creation, you'll receive:
- **Consumer Key**: `YOUR_CONSUMER_KEY`
- **Consumer Secret**: `YOUR_CONSUMER_SECRET`

### Step 3: Get Passkey
1. In your app dashboard, go to **Lipa Na M-Pesa Online**
2. Click **Generate Passkey** (or it may be provided automatically)
3. Copy the passkey (example: `YOUR_PASSKEY`)

### Step 4: Configure Till Number
- Use your Till Number as the **DARAJA_SHORTCODE**
- **Transaction Type**: `CustomerBuyGoodsOnline` (Till) or `CustomerPayBillOnline` (Paybill)
  - Set via `DARAJA_TRANSACTION_TYPE` in `.env`

---

## 🗄️ Database Setup

### Step 1: Run Migration
Execute the migration to create the `transactions` table:

```bash
cd backend
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
PYTHONPATH=/home/caleb/kiptoo/trybe/leAI/backend python3 migrations/add_transactions_table.py
```

### Step 2: Verify Table
```sql
psql postgresql://postgres:postgres@localhost:5432/aditus

\d transactions;

-- Expected columns:
-- id, user_id, merchant_request_id, checkout_request_id, mpesa_receipt_number
-- amount, phone_number, account_reference, status, result_code, result_desc
-- callback_payload, initiated_at, completed_at, created_at, updated_at
```

---

## ⚙️ Environment Configuration

### Update `.env` File
Edit `/backend/.env`:

```env
# ============================================================================
# M-PESA DARAJA API CONFIGURATION
# ============================================================================

# Credentials from Daraja Portal
DARAJA_CONSUMER_KEY=YOUR_CONSUMER_KEY
DARAJA_CONSUMER_SECRET=YOUR_CONSUMER_SECRET

# Passkey from Daraja (Lipa Na M-Pesa Online section)
DARAJA_PASSKEY=YOUR_PASSKEY

# Your Till Number (replace with your actual Till)
DARAJA_SHORTCODE=YOUR_TILL_OR_PAYBILL

# Callback URL (MUST be public HTTPS - use ngrok for local testing)
DARAJA_CALLBACK_URL=https://xxxx-xxxx.ngrok.io/api/v1/payments/callback

# Environment (sandbox or production)
DARAJA_BASE_URL=https://sandbox.safaricom.co.ke  # Change to https://api.safaricom.co.ke for production

# Transaction Type (Till vs Paybill)
DARAJA_TRANSACTION_TYPE=CustomerBuyGoodsOnline  # Use CustomerPayBillOnline for Paybill
```

### Important Notes:
- **Callback URL**: Must be publicly accessible via HTTPS
- **Sandbox vs Production**: Use sandbox for testing, switch to production URLs for live payments
- **Till Number**: Update `DARAJA_SHORTCODE` with your actual Till Number

---

## 🌐 Testing with Ngrok

M-Pesa callbacks require a **public HTTPS URL**. Use ngrok for local development:

### Step 1: Install Ngrok
```bash
# On Linux/macOS
sudo snap install ngrok
# or download from https://ngrok.com/download

# Authenticate (signup for free account)
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 2: Start Backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Step 3: Start Ngrok Tunnel
```bash
# In a new terminal
ngrok http 8000
```

Output:
```
Forwarding   https://abcd-1234-5678.ngrok.io -> http://localhost:8000
```

### Step 4: Update Callback URL
Copy the `https://` URL from ngrok and update `.env`:
```env
DARAJA_CALLBACK_URL=https://abcd-1234-5678.ngrok.io/api/v1/payments/callback
```

Restart your backend for changes to take effect.

### Step 5: Test Callback
You can monitor callback requests in ngrok's web interface:
```
http://127.0.0.1:4040
```

---

## 🔄 Payment Flow

### User Journey
1. **User clicks "Subscribe" or "Pay"**
   - Frontend opens PaymentModal
   - User enters M-Pesa phone number (254712345678 or 0712345678)

2. **Payment Initiation**
   - Frontend calls `POST /api/v1/payments/initiate`
   - Backend sends STK Push to Safaricom
   - User receives M-Pesa prompt on their phone

3. **User Enters PIN**
   - User enters M-Pesa PIN on their phone
   - Payment is processed by Safaricom

4. **Callback Processing**
   - Safaricom sends callback to `POST /api/v1/payments/callback`
   - Backend updates transaction status
   - If successful, activates subscription/credits

5. **Frontend Polling**
   - Frontend polls `GET /api/v1/payments/status/{checkout_request_id}` every 3 seconds
   - Shows success message when payment completes
   - Redirects user to unlocked feature

### Sequence Diagram
```
User -> Frontend: Click Pay KES 1,999
Frontend -> Backend: POST /payments/initiate {phone, amount, plan_type}
Backend -> Safaricom: STK Push Request
Safaricom -> User: M-Pesa Prompt (Enter PIN)
User -> Safaricom: Enter PIN
Safaricom -> Backend: Callback (ResultCode: 0)
Backend -> Database: Update transaction (status: completed)
Frontend -> Backend: Poll status (every 3s)
Backend -> Frontend: {status: "completed"}
Frontend -> User: Success! Redirect to dashboard
```

---

## 🔌 API Endpoints

### 1. Initiate Payment
**Endpoint**: `POST /api/v1/payments/initiate`

**Request Body**:
```json
{
  "phone": "0712345678",  // or "254712345678"
  "amount": 1999,
  "plan_type": "pro_monthly"  // or "paygo", "pro_annual"
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "transaction_id": 123,
    "checkout_request_id": "ws_CO_12345678901234567890",
    "merchant_request_id": "12345-67890-1",
    "message": "Payment request sent. Please enter your M-Pesa PIN.",
    "phone_number": "254712345678",
    "amount": 1999
  }
}
```

### 2. Check Payment Status
**Endpoint**: `GET /api/v1/payments/status/{checkout_request_id}`

**Response** (Pending):
```json
{
  "success": true,
  "data": {
    "transaction_id": 123,
    "status": "pending",
    "amount": 1999,
    "phone_number": "254712345678",
    "mpesa_receipt": null,
    "result_desc": null
  }
}
```

**Response** (Completed):
```json
{
  "success": true,
  "data": {
    "transaction_id": 123,
    "status": "completed",
    "amount": 1999,
    "phone_number": "254712345678",
    "mpesa_receipt": "QGR12345XYZ",
    "result_desc": "The service request is processed successfully."
  }
}
```

### 3. Payment History
**Endpoint**: `GET /api/v1/payments/history?limit=10`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "amount": 1999,
      "phone_number": "254712345678",
      "account_reference": "pro_monthly",
      "status": "completed",
      "mpesa_receipt": "QGR12345XYZ",
      "result_desc": "Success",
      "created_at": "2026-02-06T10:30:00",
      "completed_at": "2026-02-06T10:31:00"
    }
  ]
}
```

### 4. M-Pesa Callback (Internal)
**Endpoint**: `POST /api/v1/payments/callback`

**Called by**: Safaricom (not your frontend)

**Request Body** (from Safaricom):
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "12345-67890-1",
      "CheckoutRequestID": "ws_CO_12345678901234567890",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 1999},
          {"Name": "MpesaReceiptNumber", "Value": "QGR12345XYZ"},
          {"Name": "TransactionDate", "Value": 20260206103045},
          {"Name": "PhoneNumber", "Value": 254712345678}
        ]
      }
    }
  }
}
```

**Result Codes**:
- `0`: Success
- `1032`: User cancelled
- `1`: Insufficient funds
- `2001`: Invalid initiator information

---

## 🎨 Frontend Integration

### Example: Pricing Page with Payment

```tsx
'use client'

import { useState } from 'react'
import { PaymentModal } from '@/components/PaymentModal'

export default function PricingPage() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<{
    type: 'paygo' | 'pro_monthly' | 'pro_annual'
    amount: number
  } | null>(null)

  const handleSubscribe = (planType: string, amount: number) => {
    setSelectedPlan({ type: planType as any, amount })
    setPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    // Refresh subscription status
    window.location.href = '/dashboard'
  }

  return (
    <div>
      {/* Pricing Cards */}
      <button
        onClick={() => handleSubscribe('pro_monthly', 1999)}
        className="btn-primary"
      >
        Subscribe - KES 1,999/month
      </button>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          planType={selectedPlan.type}
          amount={selectedPlan.amount}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
```

---

## ❌ Error Handling

### Common Errors

#### 1. Phone Number Validation
```python
# Backend handles these formats:
# ✅ 0712345678 -> 254712345678
# ✅ 712345678 -> 254712345678
# ✅ 254712345678 -> 254712345678
# ✅ +254712345678 -> 254712345678
```

#### 2. Result Codes
| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Activate subscription |
| 1 | Insufficient funds | Show error |
| 1032 | User cancelled | Allow retry |
| 17 | Failed (generic) | Show error |
| 2001 | Invalid initiator | Check credentials |

#### 3. Timeout Handling
Frontend polls for 60 seconds (20 polls × 3s). If no response:
```tsx
if (pollCount > 20) {
  setError("Payment timed out. Please check your M-Pesa messages.")
}
```

---

## 🚀 Production Deployment

### 1. Switch to Production URLs
Update `.env`:
```env
DARAJA_BASE_URL=https://api.safaricom.co.ke
```

### 2. Update Callback URL
Use your production domain:
```env
DARAJA_CALLBACK_URL=https://aditus.co.ke/api/v1/payments/callback
```

### 3. Get Production Credentials
- Go to Daraja portal
- Switch app to **Production** mode
- Get new Consumer Key and Secret
- Get production Passkey
- Update `.env` with production values

### 4. Test with Real Money
- Use a live M-Pesa account
- Test with small amount first (KES 1)
- Verify callback processing

### 5. Monitor Transactions
```bash
# Check logs
tail -f /var/log/aditus/app.log

# Monitor failed transactions
psql aditus -c "SELECT * FROM transactions WHERE status='failed' ORDER BY created_at DESC LIMIT 10;"
```

---

## 🐛 Troubleshooting

### Issue 1: "Transaction not found" in callback
**Cause**: Callback URL mismatch or checkout_request_id not saved

**Solution**:
1. Check ngrok URL hasn't changed
2. Verify transaction was created in DB
3. Check backend logs for errors

### Issue 2: User doesn't receive STK Push
**Cause**: Phone number format or network issue

**Solution**:
1. Verify phone starts with 254
2. Ensure user has network connection
3. Check Safaricom service status

### Issue 3: Callback never arrives
**Cause**: Callback URL not accessible

**Solution**:
1. Verify ngrok is running: `curl https://your-ngrok-url.ngrok.io/health`
2. Check firewall/security groups
3. View ngrok dashboard at http://127.0.0.1:4040

### Issue 4: "Invalid access token"
**Cause**: Token expired or wrong credentials

**Solution**:
1. Check Consumer Key/Secret are correct
2. Token auto-refreshes every 50 minutes
3. Manually clear token cache: restart backend

---

## 📊 Transaction States

```
PENDING -> User initiated payment, STK sent
    ↓
COMPLETED -> User entered PIN, payment successful
    ↓
[Activate Subscription]

PENDING -> User cancelled or timeout
    ↓
CANCELLED/FAILED -> No action, allow retry
```

---

## 🔐 Security Best Practices

1. **Never expose credentials**: Keep Consumer Key/Secret in `.env`, never commit to git
2. **Validate callback source**: Check IP whitelist from Safaricom
3. **Log all transactions**: Store full callback payload for auditing
4. **Encrypt sensitive data**: Use HTTPS for all M-Pesa communication
5. **Rate limiting**: Prevent spam payment requests (add to routes)

---

## 📞 Support

### Safaricom Daraja Support
- Email: apisupport@safaricom.co.ke
- Portal: https://developer.safaricom.co.ke
- Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate

### Testing Credentials
- **Sandbox Phone**: 254708374149 (always succeeds)
- **Test Amount**: Any amount between 1-150,000 KES

---

## ✅ Checklist

Before going live:

- [ ] Database migration run successfully
- [ ] Environment variables configured
- [ ] Ngrok running for local testing
- [ ] Test payment with sandbox credentials
- [ ] Callback received and processed
- [ ] Frontend polling works
- [ ] Transaction history displays correctly
- [ ] Error handling tested (cancelled, failed)
- [ ] Production credentials obtained
- [ ] Production callback URL configured
- [ ] SSL certificate installed
- [ ] Firewall rules allow Safaricom IPs
- [ ] Monitoring and logging set up

---

**Need Help?** Check backend logs for detailed error messages:
```bash
tail -f /var/log/aditus/app.log | grep "M-Pesa"
```
