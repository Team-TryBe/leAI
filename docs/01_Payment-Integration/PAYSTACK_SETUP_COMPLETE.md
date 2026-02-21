# 🚀 Paystack Setup Complete - Next Steps

## ✅ What's Been Done

1. **Added Paystack variables to `.env`**:
   - Location: `/backend/.env`
   - Variables added:
     - `PAYSTACK_PUBLIC_KEY`
     - `PAYSTACK_SECRET_KEY`
     - `PAYSTACK_WEBHOOK_SECRET`
     - `PAYSTACK_CALLBACK_SUCCESS`
     - `PAYSTACK_CALLBACK_CANCEL`
     - `PAYSTACK_CURRENCY=KES`
     - `PAYSTACK_TIMEOUT=30`

2. **Created local testing script**:
   - Location: `/backend/test_paystack_local.py`
   - Tests database connection
   - Tests payment initialization
   - Tests webhook verification

3. **Created setup guide**:
   - Location: `/PAYSTACK_LOCAL_TESTING.md`
   - Detailed steps for local testing
   - Test card credentials
   - Troubleshooting guide

## 📋 Your Next Steps

### Step 1: Add Your Paystack Credentials

1. Log in to [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to **Settings > Developers**
3. Copy your test credentials:
   - Copy **Public Key** (starts with `pk_test_`)
   - Copy **Secret Key** (starts with `sk_test_`)

4. Go to **Settings > Webhooks**
5. Copy the **Webhook Secret**

6. Update `/backend/.env`:
   ```env
   PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxx
   PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx
   PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```

### Step 2: Run Local Tests

```bash
# Activate virtual environment
source ~/venv/bin/activate

# Navigate to backend
cd /home/caleb/kiptoo/trybe/leAI/backend

# Run tests
python test_paystack_local.py
```

You should see:
```
✅ Database Connection ............................ PASSED
✅ Payment Initialization ......................... PASSED
✅ Webhook Verification ........................... PASSED

Total: 3/3 tests passed
```

### Step 3: Test in Browser

1. **Start backend**:
   ```bash
   source ~/venv/bin/activate
   cd /home/caleb/kiptoo/trybe/leAI/backend
   uvicorn main:app --reload --port 8000
   ```

2. **Start frontend** (new terminal):
   ```bash
   cd /home/caleb/kiptoo/trybe/leAI/frontend
   npm run dev
   ```

3. **Test payment flow**:
   - Go to http://localhost:3000/dashboard/subscription
   - Click "Subscribe" on any plan
   - Use test card: **4111111111111111**
   - Exp: **12/30**
   - CVV: **123**
   - Complete the payment

### Step 4: Verify Success

Check these locations:

- **Frontend**: Should redirect to success page
- **Backend logs**: Should show successful payment
- **Database**: 
  ```bash
  # Connect to PostgreSQL
  psql postgresql://postgres:postgres@localhost:5432/aditus
  
  # Check payment records
  SELECT * FROM paystack_payments ORDER BY created_at DESC LIMIT 5;
  SELECT * FROM paystack_transactions ORDER BY created_at DESC LIMIT 5;
  ```

## 🔑 Important Notes

### ⚠️ Security

- **Never commit credentials** to git (already in `.gitignore`)
- Keep `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` private
- These are sensitive - treat like passwords

### 🧪 Test vs Production

- **Test Keys** (pk_test_, sk_test_): For localhost development
  - No real charges
  - Use test cards above
  - Perfect for development

- **Live Keys** (pk_live_, sk_live_): For production only
  - Real charges
  - Use after Paystack approval
  - Switch when deploying

### 📱 Test Cards

| Type | Card Number | Exp | CVV |
|------|---|---|---|
| Visa | 4111111111111111 | 12/30 | 123 |
| Mastercard | 5399810000000015 | 12/30 | 123 |
| Failed Payment | 4000000000000002 | 12/30 | 123 |

## 🔗 Quick Links

- **Paystack Dashboard**: https://dashboard.paystack.com
- **API Documentation**: https://paystack.com/docs/api/
- **Test Environment**: https://checkout.paystack.com/pay/test
- **Webhook Testing**: Use [ngrok](https://ngrok.com/) for localhost

## ❓ If You Have Issues

1. Check `/PAYSTACK_LOCAL_TESTING.md` for detailed troubleshooting
2. Verify `.env` variables are set (no defaults like `your_key_here`)
3. Restart API server after updating `.env`
4. Check Paystack dashboard for any API errors
5. Enable backend debug logs if needed

## 📝 When Ready for Production

1. Switch to **Live Keys** in Paystack dashboard
2. Update `.env` with live credentials
3. Update callback URLs to production domain
4. Test fully in staging environment
5. Deploy to production

---

**All set! You're ready to test Paystack payments locally.** 🎉

