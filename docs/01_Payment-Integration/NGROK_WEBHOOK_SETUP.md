# 🔗 Webhook Testing with ngrok - Complete Guide

## What is ngrok?

ngrok creates a public HTTPS tunnel to your localhost, allowing external services (like Paystack) to send webhooks to your local machine.

```
Internet → ngrok tunnel → Your Local API (http://localhost:8000)
```

## ✅ Prerequisites

- ✅ ngrok installed: `/snap/bin/ngrok` 
- ✅ Backend running on `http://localhost:8000`
- ✅ Paystack credentials configured in `.env`

## 🚀 Quick Start (5 minutes)

### Step 1: Create ngrok Account (Optional but Recommended)

1. Go to [ngrok.com](https://ngrok.com)
2. Sign up for free account
3. Log in and go to **Dashboard > Your Authtoken**
4. Copy your auth token

### Step 2: Authenticate ngrok (Optional)

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

Benefits of authenticating:
- Longer tunnel duration (hours instead of 2 hours)
- Reserve a static URL (same URL each time)
- Higher rate limits

### Step 3: Start the Tunnel

Open a new terminal and run:

```bash
# Start ngrok tunnel on port 8000
ngrok http 8000
```

You'll see output like:
```
ngrok                                                              (Ctrl+C to quit)

Session Status                online
Account                       you@example.com
Version                        3.x.x
Region                         us (United States)
Forwarding                     https://xxxx-xxxx-xxxx.ngrok.io -> http://localhost:8000
Forwarding                     http://xxxx-xxxx-xxxx.ngrok.io -> http://localhost:8000

Connections                    ttl
```

**Copy the HTTPS URL**: `https://xxxx-xxxx-xxxx.ngrok.io`

### Step 4: Configure Paystack Webhook

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. **Settings > Webhooks**
3. Click **Add Webhook URL**
4. Paste: `https://xxxx-xxxx-xxxx.ngrok.io/api/v1/payments/webhook`
5. Click **Add Webhook**

### Step 5: Send Test Webhook

In Paystack dashboard:
1. Go to **Settings > Webhooks**
2. Find your webhook URL
3. Click the **...** menu
4. Select **Test Delivery**
5. Watch your ngrok terminal for the request!

## 📊 How It Works

### Request Flow

```
1. You (on localhost:3000)
   ↓
2. Click "Subscribe with Paystack"
   ↓
3. Paystack initializes payment (via your backend)
   ↓
4. User pays at Paystack checkout
   ↓
5. Paystack sends webhook event
   ↓
6. ngrok tunnel receives webhook
   ↓
7. ngrok forwards to http://localhost:8000
   ↓
8. Your API processes the webhook
   ↓
9. Backend logs transaction in database
```

### Example Terminal Output

**Your Backend (Terminal 1)**:
```
2026-02-21 14:23:45,123 - app.api.payments - INFO - 🔔 Webhook received: charge.success
2026-02-21 14:23:45,124 - app.api.payments - INFO - ✅ Payment verified: Reference KS-123456
2026-02-21 14:23:45,125 - app.db.models - INFO - 💾 Transaction saved
```

**ngrok (Terminal 2)**:
```
ngrok                                                              (Ctrl+C to quit)

Forwarding                     https://xxxx-xxxx-xxxx.ngrok.io -> http://localhost:8000

POST /api/v1/payments/webhook                200 OK
```

## 🔧 Setup Commands

### Terminal 1: Backend API
```bash
cd /home/caleb/kiptoo/trybe/leAI/backend
source ~/venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Terminal 2: ngrok Tunnel
```bash
# Without authentication (2 hour limit)
ngrok http 8000

# OR with authentication (recommended)
ngrok http 8000 --authtoken YOUR_AUTH_TOKEN
```

### Terminal 3: Frontend
```bash
cd /home/caleb/kiptoo/trybe/leAI/frontend
npm run dev
```

## 🧪 Test Scenarios

### Scenario 1: Successful Payment

**Step by step:**

1. **Start tunnel**: `ngrok http 8000` (copy HTTPS URL)
2. **Add webhook**: Paystack → Settings > Webhooks > Add → `https://xxxxx.ngrok.io/api/v1/payments/webhook`
3. **Start API**: `uvicorn main:app --reload --port 8000`
4. **Visit**: http://localhost:3000/dashboard/subscription
5. **Click**: Subscribe on any plan
6. **Use test card**: 
   - Card: `4111111111111111`
   - Exp: `12/30`
   - CVV: `123`
7. **Complete payment**
8. **Watch**:
   - ngrok terminal: See webhook request
   - Backend logs: See webhook processed
   - Browser: See success redirect

### Scenario 2: Test Webhook Delivery

Without actually making a payment:

1. Paystack Dashboard → Settings > Webhooks
2. Find your webhook URL
3. Click **...** menu → **Test Delivery**
4. Select **charge.success** event
5. Watch ngrok receive the test event
6. Check backend logs

### Scenario 3: Verify Payment

Manually verify a payment:

```bash
curl -X GET "http://localhost:8000/api/v1/payments/verify/TRANSACTION_REFERENCE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📝 Webhook Payload Example

This is what Paystack sends to your webhook:

```json
{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "reference": "KS-1234567890",
    "amount": 29900,
    "currency": "KES",
    "status": "success",
    "customer": {
      "id": 123,
      "email": "user@example.com",
      "code": "CUS_xxxxx"
    },
    "plan": 1,
    "transaction_date": "2026-02-21T14:23:45.000Z",
    "paidAt": "2026-02-21T14:23:50.000Z",
    "createdAt": "2026-02-21T14:23:45.000Z",
    "channel": "card"
  }
}
```

## 🔐 Security Considerations

### Webhook Signature Verification

Paystack includes a signature header for security:

```
Header: x-paystack-signature
Value: SHA512(JSON_PAYLOAD + WEBHOOK_SECRET)
```

Your backend automatically verifies this in `PaystackService.verify_webhook_signature()`

### Test vs Production

- **Test webhook**: Won't charge real cards
- **Production webhook**: Will process real payments
- **Use ngrok only for local testing**

## ⚙️ Advanced: Static URL

For consistent testing, use a reserved domain:

```bash
# 1. Go to ngrok Dashboard
# 2. Domains > Reserve a Domain
# 3. Get your reserved domain (e.g., my-app.ngrok.io)

# 4. Use it in commands
ngrok http 8000 --domain my-app.ngrok.io
```

Now your webhook URL stays the same every time!

## 🐛 Troubleshooting

### "Connection refused"
```
❌ Error: Connection refused: ("Trying to connect to ('127.0.0.1', 8000)")
```
**Solution**: Make sure backend is running on port 8000

### "Invalid Webhook URL"
```
❌ Webhook URL validation failed
```
**Solution**: 
- Use HTTPS (not HTTP)
- Make sure ngrok tunnel is running
- URL must be: `https://xxxx-xxxx.ngrok.io/api/v1/payments/webhook`

### "Webhook not received"
```
❌ Webhook status: Failed
```
**Solution**:
- Check backend logs for errors
- Verify webhook secret in `.env`
- Ensure ngrok is still running
- Try Paystack Test Delivery to verify connectivity

### "ngrok tunnel stopped"
```
❌ Session Status: offline
```
**Solution**: Restart ngrok with `ngrok http 8000`

## 📊 Viewing Requests in ngrok

ngrok Inspector (Web UI):

```bash
# Open in browser (shown when starting ngrok)
http://127.0.0.1:4040
```

Here you can:
- View all requests and responses
- Inspect headers and payload
- Replay requests
- Debug webhook issues

## 🔗 Webhook Testing Checklist

- [ ] ngrok tunnel running (`ngrok http 8000`)
- [ ] Backend API running on `localhost:8000`
- [ ] Frontend running on `localhost:3000`
- [ ] Webhook URL added to Paystack: `https://xxxxx.ngrok.io/api/v1/payments/webhook`
- [ ] `.env` has `PAYSTACK_WEBHOOK_SECRET` set
- [ ] Test payment card ready: `4111111111111111`
- [ ] Browser dev tools open (Console tab)
- [ ] ngrok terminal visible (to watch requests)

## 🚀 Full Test Workflow

```bash
# Terminal 1: Backend
cd /backend
source ~/venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2: ngrok (copy HTTPS URL)
ngrok http 8000

# Terminal 3: Frontend
cd /frontend
npm run dev

# Manual Steps:
# 1. Add webhook to Paystack: https://xxxxx.ngrok.io/api/v1/payments/webhook
# 2. Visit: http://localhost:3000/dashboard/subscription
# 3. Click Subscribe
# 4. Use test card: 4111111111111111 | 12/30 | 123
# 5. Watch ngrok terminal for webhook
# 6. Check backend logs
# 7. Verify database: SELECT * FROM paystack_transactions;
```

## 📚 Additional Resources

- [ngrok Documentation](https://ngrok.com/docs)
- [Paystack Webhook Guide](https://paystack.com/docs/webhooks/)
- [Testing Webhooks Best Practices](https://webhook.cool/)

## ✅ Success Indicators

When everything is working:

1. ✅ ngrok shows: `POST /api/v1/payments/webhook 200 OK`
2. ✅ Backend logs: `✅ Payment verified: Reference KS-XXXXX`
3. ✅ Browser redirects to success page
4. ✅ Database shows new transaction
5. ✅ Paystack dashboard shows received webhook

---

**All set for webhook testing!** Your ngrok tunnel is ready to receive Paystack webhooks. 🎉

