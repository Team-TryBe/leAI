# Gmail OAuth2 Integration - Quick Setup Guide

## 5-Minute Quick Start

### 1. Get Google Credentials (5 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Aditus"
3. Enable Gmail API
4. Create OAuth 2.0 Web Application credentials
5. Add origins/redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:8000/api/v1/auth/gmail/callback`

### 2. Add to .env

```env
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### 3. Database Migration

Add columns to `users` table:

```sql
ALTER TABLE users ADD COLUMN gmail_refresh_token TEXT;
ALTER TABLE users ADD COLUMN gmail_access_token TEXT;
ALTER TABLE users ADD COLUMN gmail_token_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN gmail_connected BOOLEAN DEFAULT FALSE;
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Done!

- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev`
- Navigate to Applications → Select app → "Send via Gmail"

---

## Files Added/Modified

**New Files:**
- `backend/app/services/encryption_service.py`
- `backend/app/services/gmail_service.py`
- `frontend/src/components/dashboard/GmailConnection.tsx`
- `frontend/src/components/dashboard/SendEmailModal.tsx`
- `docs/GMAIL_OAUTH2_INTEGRATION.md` (detailed guide)

**Modified Files:**
- `backend/app/db/models.py` (User model + 4 new columns)
- `backend/app/api/auth.py` (5 new OAuth2 endpoints)
- `backend/app/api/applications.py` (2 new send endpoints)
- `backend/app/core/config.py` (Google OAuth2 settings)
- `backend/requirements.txt` (Gmail & crypto libraries)
- `frontend/src/app/dashboard/applications/page.tsx` (SendEmailModal integration)

---

## Key Features

✅ **OAuth2 Authorization Code Flow**
- Secure token exchange with Google
- CSRF protection via state parameter

✅ **Encrypted Token Storage**
- Tokens encrypted with app secret key
- Never stored in plain text

✅ **Automatic Token Refresh**
- Access tokens refreshed when expired
- Refresh tokens stored indefinitely

✅ **Email with Attachments**
- Automatically attaches CV PDF
- Automatically attaches Cover Letter PDF
- Supports custom email body

✅ **Email Configuration**
- Pre-filled recipient emails from job posting
- Support for CC emails
- Manual email entry/editing

✅ **User-Friendly UI**
- Gmail connection status in settings
- Modal for email configuration
- Error handling and validation

---

## Usage

1. **Connect Gmail** (one-time)
   - Settings → "Connect Gmail Account"
   - Authorize with Google
   - Tokens automatically stored

2. **Send Application**
   - Applications → Select app in "Review" status
   - Click "Send via Gmail"
   - Confirm/edit recipients
   - Click "Send Application"
   - Email sent to recruiters with PDFs

3. **Disconnect Gmail** (optional)
   - Settings → "Disconnect Gmail"
   - Tokens removed from database

---

## Tech Stack

**Backend:**
- FastAPI + SQLAlchemy (async)
- PostgreSQL database
- Google OAuth2 + Gmail API
- Cryptography (Fernet)

**Frontend:**
- Next.js + TypeScript
- React hooks for state management
- TailwindCSS for styling

**Security:**
- CSRF protection (state parameter)
- Token encryption (Fernet)
- OAuth2 scoped to `gmail.send` only
- No email reading/deletion capabilities

---

## Troubleshooting

**"Gmail not connected"**
→ Go to Settings, click "Connect Gmail Account", complete OAuth2 flow

**"Invalid credentials"**
→ Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in .env

**"Invalid redirect URI"**
→ Ensure URIs in Google Cloud Console match your local URLs

**"Token expired"**
→ Tokens auto-refresh; if still issues, disconnect and reconnect Gmail

---

## Documentation

For detailed implementation info, see: [`docs/GMAIL_OAUTH2_INTEGRATION.md`](./GMAIL_OAUTH2_INTEGRATION.md)

Covers:
- Complete architecture diagram
- Step-by-step implementation
- Security considerations
- User flow walkthrough
- Troubleshooting guide
- Future enhancements

---

## Next Steps

1. ✅ Set up Google credentials
2. ✅ Add .env variables
3. ✅ Run database migration
4. ✅ Install dependencies
5. ✅ Test OAuth2 flow
6. ✅ Test email sending
7. (Optional) Customize email templates in `applications.py`
8. (Optional) Add delivery tracking

Happy emailing! 🚀
