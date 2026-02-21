# ⚡ Paystack Quick Setup - 5 Minute Checklist

## What's Ready ✅

- [x] `.env` file configured with Paystack placeholders
- [x] Test script created: `backend/test_paystack_local.py`
- [x] Full setup guide: `PAYSTACK_LOCAL_TESTING.md`
- [x] Paystack integration code already in place
- [x] Database models ready for payments

## What You Need To Do 🔧

### 1. Get Credentials (2 min)

```
Paystack Dashboard → Settings → Developers
├─ Copy: Public Key (pk_test_...)
├─ Copy: Secret Key (sk_test_...)
└─ Webhooks → Copy: Webhook Secret
```

### 2. Update .env (1 min)

Edit `/backend/.env`:
```env
PAYSTACK_PUBLIC_KEY=pk_test_paste_your_key_here
PAYSTACK_SECRET_KEY=sk_test_paste_your_key_here
PAYSTACK_WEBHOOK_SECRET=paste_your_webhook_secret_here
```

### 3. Test Locally (2 min)

```bash
cd /backend
source ~/venv/bin/activate
python test_paystack_local.py
```

Expected: ✅ 3/3 tests passed

### 4. Test in Browser

```bash
# Terminal 1: Backend
cd /backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd /frontend
npm run dev

# Terminal 3: Visit
http://localhost:3000/dashboard/subscription
```

Use test card: `4111111111111111` | Exp: `12/30` | CVV: `123`

## Test Card Numbers 🎫

| Purpose | Card | Exp | CVV |
|---------|------|-----|-----|
| ✅ Successful Payment | 4111111111111111 | 12/30 | 123 |
| ❌ Failed Payment | 4000000000000002 | 12/30 | 123 |
| 🔄 3D Secure | 4111111111111111* | 12/30 | 123 |

*Paystack may prompt for additional verification

## Files Created 📁

```
/backend/.env                    ← Updated with Paystack vars
/backend/test_paystack_local.py  ← Test script (run this!)
/PAYSTACK_LOCAL_TESTING.md       ← Full guide
/PAYSTACK_SETUP_COMPLETE.md      ← Setup summary
/PAYSTACK_QUICK_REFERENCE.md     ← This file!
```

## API Endpoints Ready 🔌

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/payments/initialize` | POST | Start payment |
| `/api/v1/payments/verify/{ref}` | GET | Check payment status |
| `/api/v1/payments/webhook` | POST | Receive Paystack events |
| `/api/v1/admin/paystack-logs` | GET | View transaction logs |

## Troubleshooting 🐛

### Payment Not Working?
1. Check `.env` has actual keys (not `your_key_here`)
2. Restart API server
3. Check internet connection
4. Run: `python test_paystack_local.py`

### Test Cards Not Working?
- Make sure you're using **test keys** (pk_test_, sk_test_)
- Card: 4111111111111111
- Exp: 12/30 (any future date works)
- CVV: 123 (any 3 digits)

### Webhook Issues?
- Use [ngrok](https://ngrok.com/) for localhost testing
- Or wait for production deployment

## When Ready for Production 🚀

1. In Paystack: Switch to **Live Keys**
2. Update `.env`:
   ```env
   PAYSTACK_PUBLIC_KEY=pk_live_your_real_key
   PAYSTACK_SECRET_KEY=sk_live_your_real_key
   ```
3. Update callback URLs to production domain
4. Deploy to production server

## Next Steps 📋

1. **Right now**: Add credentials to `.env`
2. **Then**: Run `python test_paystack_local.py`
3. **Then**: Test in browser at `/dashboard/subscription`
4. **Then**: Check transaction logs
5. **Finally**: Ready to deploy!

---

**Status**: Ready for local testing | Credentials needed: 2

Need help? → See `PAYSTACK_LOCAL_TESTING.md`
