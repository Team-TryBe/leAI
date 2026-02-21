# Paystack Integration - Environment Configuration Template

Copy this to your `.env` file and fill in the actual values from your Paystack account.

## Paystack Configuration

### API Keys
```bash
# Get these from Paystack Dashboard → Settings → API Keys & Webhooks
PAYSTACK_PUBLIC_KEY=paystack_public_key_here
PAYSTACK_SECRET_KEY=paystack_secret_key_here
PAYSTACK_WEBHOOK_SECRET=paystack_webhook_secret_key_here
```

### Callback URLs
```bash
# URLs where Paystack redirects after payment
# These must match your domain exactly
PAYSTACK_CALLBACK_SUCCESS=https://your-domain.com/subscription/success
PAYSTACK_CALLBACK_CANCEL=https://your-domain.com/subscription/cancel

# For local development, use:
# PAYSTACK_CALLBACK_SUCCESS=http://localhost:3000/subscription/success
# PAYSTACK_CALLBACK_CANCEL=http://localhost:3000/subscription/cancel
```

### Paystack Settings
```bash
# Currency: KES for Kenya Shillings
PAYSTACK_CURRENCY=KES

# Timeout for API calls in seconds
PAYSTACK_TIMEOUT=30
```

---

## Complete Example Configuration

```bash
# ============================================================================
# PAYSTACK INTEGRATION
# ============================================================================

# TEST MODE (Use these to test the integration)

PAYSTACK_PUBLIC_KEY=paystack_public_key_here  # Use your Paystack public key
PAYSTACK_SECRET_KEY=paystack_secret_key_here  # Use your Paystack secret key
PAYSTACK_WEBHOOK_SECRET=paystack_webhook_secret_key_here
# PRODUCTION MODE (Use these for live payments)
# Uncomment these and comment out TEST MODE when going to production
# PAYSTACK_PUBLIC_KEY=paystack_live_public_key_here
# PAYSTACK_SECRET_KEY=paystack_live_secret_key_here
# PAYSTACK_WEBHOOK_SECRET=paystack_live_webhook_secret_here

# Callback URLs
PAYSTACK_CALLBACK_SUCCESS=https://aditus.co.ke/subscription/success
PAYSTACK_CALLBACK_CANCEL=https://aditus.co.ke/subscription/cancel

# Settings
PAYSTACK_CURRENCY=KES
PAYSTACK_TIMEOUT=30
```

---

## How to Get Your Paystack Credentials

### Step 1: Create Paystack Account
1. Go to https://paystack.com
2. Sign up with your email
3. Verify your email
4. Complete KYC verification

### Step 2: Access API Keys
1. Log in to Paystack Dashboard
2. Navigate to **Settings** → **API Keys & Webhooks**
3. You'll see:
   - **Public Key** (can be public, used by frontend)
   - **Secret Key** (KEEP SECRET, backend only)
   - **Webhook Secret** (for webhook verification)

### Step 3: Get Webhook Secret
1. In Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Scroll to **Webhook** section
3. Copy your Webhook Secret

### Step 4: Configure Webhook URL
1. In Paystack Dashboard, go to **Settings** → **Webhook Settings**
2. Set webhook URL to: `https://your-domain.com/api/v1/payments/webhook`
3. Important: Must be HTTPS! (Paystack won't send to HTTP in production)

---

## Test Mode vs Production Mode

### Test Mode
- Use Paystack test keys from your dashboard
- No real money transferred
- Test amount codes:
  - Ends in 15: Payment fails
  - Ends in 85: Payment succeeds
  - Ends in 00: Payment pending
- M-Pesa test number: 254790000000

### Production Mode
- Use Paystack live keys from your dashboard
- Real money transactions
- Webhook URL MUST be HTTPS
- Requires Paystack account verification
- SSL certificate required on your domain

---

## Environment Variable Reference

| Variable | Type | Required | Example | Notes |
|----------|------|----------|---------|-------|
| PAYSTACK_PUBLIC_KEY | String | Yes | paystack_public_key_here | Frontend can see this |
| PAYSTACK_SECRET_KEY | String | Yes | paystack_secret_key_here | Backend only, keep secret |
| PAYSTACK_WEBHOOK_SECRET | String | Yes | whsec_xxxxx | Used for webhook verification |
| PAYSTACK_CALLBACK_SUCCESS | String | Yes | https://domain.com/success | Redirect after successful payment |
| PAYSTACK_CALLBACK_CANCEL | String | Yes | https://domain.com/cancel | Redirect after cancelled payment |
| PAYSTACK_CURRENCY | String | No (default: KES) | KES | Currency code |
| PAYSTACK_TIMEOUT | Integer | No (default: 30) | 30 | API timeout in seconds |

---

## Verification Commands

After setting environment variables, verify they're loaded:

```bash
# Check if variables are loaded
python3 -c "from app.core.config import get_settings; s = get_settings(); print(f'Paystack Public Key configured: {bool(s.PAYSTACK_PUBLIC_KEY)}')"

# Check all Paystack settings
python3 << 'EOF'
from app.core.config import get_settings
s = get_settings()
print("Paystack Configuration:")
print(f"  Public Key: {'✓' if s.PAYSTACK_PUBLIC_KEY else '✗'}")
print(f"  Secret Key: {'✓' if s.PAYSTACK_SECRET_KEY else '✗'}")
print(f"  Webhook Secret: {'✓' if s.PAYSTACK_WEBHOOK_SECRET else '✗'}")
print(f"  Success Callback: {s.PAYSTACK_CALLBACK_SUCCESS}")
print(f"  Cancel Callback: {s.PAYSTACK_CALLBACK_CANCEL}")
print(f"  Currency: {s.PAYSTACK_CURRENCY}")
print(f"  Timeout: {s.PAYSTACK_TIMEOUT}s")
EOF
```

---

## Local Development Setup

For local development, use this `.env` configuration:

```bash
# ============================================================================
# LOCAL DEVELOPMENT - PAYSTACK TEST MODE
# ============================================================================

PAYSTACK_PUBLIC_KEY=paystack_test_public_key_here
PAYSTACK_SECRET_KEY=paystack_test_secret_key_here
PAYSTACK_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here

# Local callbacks
PAYSTACK_CALLBACK_SUCCESS=http://localhost:3000/subscription/success
PAYSTACK_CALLBACK_CANCEL=http://localhost:3000/subscription/cancel

PAYSTACK_CURRENCY=KES
PAYSTACK_TIMEOUT=30

# For webhook testing locally, use ngrok:
# ngrok http 8000
# Then update this to: http://your-ngrok-url/api/v1/payments/webhook
# And add to Paystack webhook settings
```

---

## Production Setup

For production deployment:

```bash
# ============================================================================
# PRODUCTION - PAYSTACK LIVE MODE
# ============================================================================

# Use LIVE keys only
PAYSTACK_PUBLIC_KEY=paystack_live_public_key_here
PAYSTACK_SECRET_KEY=paystack_live_secret_key_here
PAYSTACK_WEBHOOK_SECRET=whsec_live_your_webhook_secret_here

# Production callbacks (MUST be HTTPS)
PAYSTACK_CALLBACK_SUCCESS=https://aditus.co.ke/subscription/success
PAYSTACK_CALLBACK_CANCEL=https://aditus.co.ke/subscription/cancel

PAYSTACK_CURRENCY=KES
PAYSTACK_TIMEOUT=30

# Configure webhook in Paystack Dashboard:
# https://aditus.co.ke/api/v1/payments/webhook
```

---

## Security Best Practices

✅ **DO:**
- Store API keys in `.env` file (git-ignored)
- Use live secret key on backend only
- Rotate keys regularly
- Monitor Paystack security alerts
- Use HTTPS for all production URLs
- Keep SECRET_KEY secure

❌ **DON'T:**
- Commit API keys to Git
- Never expose live secret key in frontend
- Share `.env` file with anyone
- Log API keys anywhere
- Use test keys in production
- Hardcode keys in source code

---

## Troubleshooting

### "PAYSTACK_SECRET_KEY not configured"
```bash
# Check if .env file exists
ls -la .env

# Check if variable is set
cat .env | grep PAYSTACK_SECRET_KEY

# Verify backend reads it
python3 -c "import os; print(os.getenv('PAYSTACK_SECRET_KEY', 'NOT FOUND'))"
```

### "Webhook signature verification failed"
```bash
# Verify webhook secret is correct
python3 -c "from app.core.config import get_settings; print(get_settings().PAYSTACK_WEBHOOK_SECRET[:20])"

# Check if it matches Paystack Dashboard
# Settings → API Keys & Webhooks → Webhook
```

### "Payment initialization failed"
```bash
# Check if API keys are valid
python3 -c "from app.core.config import get_settings; s = get_settings(); print(f'Keys configured: {bool(s.PAYSTACK_PUBLIC_KEY and s.PAYSTACK_SECRET_KEY)}')"

# Check backend logs for specific error
# docker logs aditus-backend  (if using Docker)
```

---

## Next Steps

1. ✅ Get Paystack credentials
2. ✅ Update `.env` with values
3. ✅ Verify configuration with commands above
4. ✅ Run database migration
5. ✅ Start backend and test endpoints
6. ✅ Configure webhook URL in Paystack
7. ✅ Test payment flow

See [PAYSTACK_QUICK_REFERENCE.md](PAYSTACK_QUICK_REFERENCE.md) for next steps.

