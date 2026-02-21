# Paystack Local Testing Setup Guide

## 1. Get Your Paystack Credentials

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Sign in to your account
3. Navigate to **Settings > Developers**
4. You'll see your credentials:
   - **Public Key**: Starts with `pk_test_` (for testing)
   - **Secret Key**: Starts with `sk_test_` (for testing)
5. For webhooks, go to **Settings > Webhooks** and copy the webhook secret

## 2. Configure .env File

Add your Paystack credentials to `/backend/.env`:

```env
# Paystack Integration
PAYSTACK_PUBLIC_KEY=pk_test_your_actual_key_here
PAYSTACK_SECRET_KEY=sk_test_your_actual_key_here
PAYSTACK_WEBHOOK_SECRET=your_actual_webhook_secret_here

# Callbacks (for local testing)
PAYSTACK_CALLBACK_SUCCESS=http://localhost:3000/dashboard/subscription?status=success
PAYSTACK_CALLBACK_CANCEL=http://localhost:3000/dashboard/subscription?status=cancel

# Currency and timeout
PAYSTACK_CURRENCY=KES
PAYSTACK_TIMEOUT=30
```

## 3. Test Credentials (Paystack Test Environment)

Use these test credentials to verify the integration without real charges:

### Test Cards:

| Type | Card Number | Exp (MM/YY) | CVV |
|------|-------------|-------------|-----|
| Visa | 4111111111111111 | 12/30 | 123 |
| Mastercard | 5399810000000015 | 12/30 | 123 |
| Verve | 5061020000000000015 | 12/30 | 123 |

### Test Amounts:

- **Any amount** works in test mode
- No real money is charged
- Perfect for testing the flow

## 4. Run Local Tests

```bash
cd /home/caleb/kiptoo/trybe/leAI/backend

# Activate virtual environment
source ~/venv/bin/activate

# Run the test script
python test_paystack_local.py
```

Expected output:
```
✅ Database Connection ............................ PASSED
✅ Payment Initialization ......................... PASSED
✅ Webhook Verification ........................... PASSED

Total: 3/3 tests passed

🎉 All tests passed! Ready to test in frontend.
```

## 5. Test Payment Flow Locally

1. **Start the backend API**:
   ```bash
   source ~/venv/bin/activate
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test the payment**:
   - Go to http://localhost:3000/dashboard/subscription
   - Click on a plan to subscribe
   - You'll be redirected to Paystack checkout
   - Use the test card numbers above
   - Complete the payment flow

4. **Verify in database**:
   - Check `/api/v1/admin/paystack-logs` for transaction logs
   - Verify payment records in PostgreSQL

## 6. Webhook Testing (Optional)

For webhook testing locally, use [ngrok](https://ngrok.com/):

1. Install ngrok
2. Run: `ngrok http 8000`
3. Copy the HTTPS URL (e.g., `https://xxxx-xxxx.ngrok.io`)
4. Update Paystack dashboard with webhook URL:
   - Go to **Settings > Webhooks**
   - Add endpoint: `https://xxxx-xxxx.ngrok.io/api/v1/payments/webhook`
5. Paystack will send test webhooks

## 7. Move to Production

When ready to use real payments:

1. In Paystack Dashboard:
   - Go to **Settings > Developers**
   - Switch to **Live Keys**
   - Copy your live **Public Key** and **Secret Key**

2. Update environment:
   ```env
   # Change test keys to live keys
   PAYSTACK_PUBLIC_KEY=pk_live_your_actual_key_here
   PAYSTACK_SECRET_KEY=sk_live_your_actual_key_here
   ```

3. Update callback URLs to your production domain:
   ```env
   PAYSTACK_CALLBACK_SUCCESS=https://yourdomain.com/dashboard/subscription?status=success
   PAYSTACK_CALLBACK_CANCEL=https://yourdomain.com/dashboard/subscription?status=cancel
   ```

## Troubleshooting

### "PAYSTACK_SECRET_KEY not configured"
- Check `.env` file has the correct keys
- Make sure you copied the entire key (including the prefix)
- Restart the API server after updating `.env`

### "Payment initialization failed"
- Verify internet connection (API calls to Paystack)
- Check API keys are correct
- Make sure you're using test keys for localhost
- Check Paystack dashboard for API activity

### Webhook not receiving events
- Webhook secret must match what's in Paystack dashboard
- For localhost, you need ngrok running
- Endpoint must be public HTTPS URL
- Check Paystack dashboard > Settings > Webhooks > Test Delivery

## API Endpoints for Testing

- **Initialize Payment**: `POST /api/v1/payments/initialize`
- **Verify Payment**: `GET /api/v1/payments/verify/{reference}`
- **Payment Logs**: `GET /api/v1/admin/paystack-logs`
- **Webhook**: `POST /api/v1/payments/webhook`

