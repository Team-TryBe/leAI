# Gmail OAuth2 Integration - Complete Implementation Guide

## Overview

This document provides a complete walkthrough of the Gmail OAuth2 integration for the Aditus application, enabling users to send job applications directly via Gmail with CV and cover letter attachments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│  1. GmailConnection Component  → Connect/Disconnect Gmail       │
│  2. Applications Page          → Send via Gmail button           │
│  3. SendEmailModal Component   → Email recipients & message     │
└──────────────────────┬──────────────────────────────────────────┘
                       │ OAuth2 Flow + API Calls
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    Backend (FastAPI)                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Auth Endpoints:                                             │
│     - POST /api/v1/auth/gmail/connect     → Get OAuth2 URL     │
│     - GET /api/v1/auth/gmail/callback      → Google redirect   │
│     - POST /api/v1/auth/gmail/store-tokens → Save tokens       │
│     - GET /api/v1/auth/gmail/status        → Check connection  │
│     - POST /api/v1/auth/gmail/disconnect   → Remove tokens     │
│                                                                  │
│  2. Application Endpoints:                                      │
│     - POST /api/v1/applications/{id}/send          → Send email │
│     - GET /api/v1/applications/{id}/email-config   → Get emails │
│                                                                  │
│  3. Services:                                                   │
│     - GmailService     → Send emails via Gmail API             │
│     - EncryptionService → Encrypt/decrypt tokens               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ API Calls
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│           External Services & Database                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Google OAuth2 Services                                      │
│     - accounts.google.com/o/oauth2/v2/auth    (authorization)  │
│     - oauth2.googleapis.com/token              (token exchange) │
│                                                                  │
│  2. Gmail API                                                   │
│     - gmail.googleapis.com/gmail/v1/...        (send emails)   │
│                                                                  │
│  3. PostgreSQL Database                                         │
│     - user.gmail_refresh_token     (encrypted)                 │
│     - user.gmail_access_token      (encrypted)                 │
│     - user.gmail_connected         (boolean flag)              │
│     - user.gmail_token_expires_at  (timestamp)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Google Cloud Console Setup

Before coding, configure your app in Google Cloud Console:

1. **Create a Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project

2. **Enable APIs**
   - Search for "Gmail API"
   - Click "Enable"

3. **Configure OAuth Consent Screen**
   - Go to "OAuth consent screen"
   - Set User Type: "External"
   - Add Scopes: `https://www.googleapis.com/auth/gmail.send`
   - Add test users (your email)

4. **Create OAuth 2.0 Credentials**
   - Go to "Credentials"
   - Create OAuth 2.0 Client ID → Web Application
   - Authorized JavaScript Origins: `http://localhost:3000`
   - Authorized Redirect URIs: `http://localhost:8000/api/v1/auth/gmail/callback`
   - Download credentials and save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Step 2: Backend Database Changes

**File: `backend/app/db/models.py`**

Added to User model:
```python
# Gmail OAuth2 Tokens (encrypted)
gmail_refresh_token = Column(Text, nullable=True)       # Encrypted
gmail_access_token = Column(Text, nullable=True)        # Encrypted
gmail_token_expires_at = Column(DateTime, nullable=True)
gmail_connected = Column(Boolean, default=False, nullable=False)
```

**Why?**
- Store refresh token for long-term access (never expires)
- Cache access token for performance (expires in ~1 hour)
- Track expiration to know when to refresh
- Boolean flag for quick connection status checks

### Step 3: Backend Configuration

**File: `backend/app/core/config.py`**

Added settings:
```python
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
API_URL: str = os.getenv("API_URL", "http://localhost:8000")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
```

### Step 4: Backend Services

**File: `backend/app/services/encryption_service.py`**

Service for encrypting/decrypting sensitive tokens:
```python
def encrypt_token(token: str) -> str:
    """Encrypt a token for secure storage."""
    
def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a token from storage."""
```

**Why encryption?**
- OAuth2 tokens are sensitive credentials
- Should never be stored as plain text
- Fernet (symmetric encryption) is simple and secure for this use case
- Uses your app's SECRET_KEY to encrypt/decrypt

**File: `backend/app/services/gmail_service.py`**

Core Gmail service with two main methods:

```python
async def refresh_access_token(refresh_token: str) -> dict:
    """
    Refresh expired access token using refresh token.
    Called when access token expires (every ~1 hour).
    """
    
async def send_email(
    user_id: int,
    db: AsyncSession,
    to_emails: list[str],
    cc_emails: list[str] | None = None,
    subject: str = "",
    body: str = "",
    attachments: dict[str, bytes] | None = None,
) -> dict:
    """
    Send email via Gmail API.
    - Fetches encrypted tokens from database
    - Refreshes access token if expired
    - Composes MIME message with attachments
    - Sends via Gmail API
    """
```

### Step 5: Backend OAuth2 Endpoints

**File: `backend/app/api/auth.py`**

**Endpoint 1: Initiate Connection**
```python
@router.post("/gmail/connect")
async def initiate_gmail_connect() -> ApiResponse[GmailConnectResponse]:
    """
    Step 1 of OAuth2 Flow: Frontend calls this to get the Google auth URL
    
    Returns:
        auth_url: URL user clicks to authorize with Google
        
    Process:
    1. Generate random 'state' for CSRF protection
    2. Build Google authorization URL with proper scopes
    3. Return URL to frontend
    """
```

**Endpoint 2: OAuth2 Callback**
```python
@router.get("/gmail/callback")
async def gmail_oauth_callback(code: str, state: str):
    """
    Step 2 of OAuth2 Flow: Google redirects here after user authorizes
    
    Process:
    1. Receive authorization code from Google
    2. (Optionally verify state parameter for CSRF)
    3. Redirect to dashboard (frontend handles token storage)
    """
```

**Endpoint 3: Store Tokens**
```python
@router.post("/gmail/store-tokens")
async def store_gmail_tokens(req: GmailTokenRequest) -> ApiResponse:
    """
    Step 3 of OAuth2 Flow: Frontend posts auth code to store tokens securely
    
    Process:
    1. Exchange auth code for access_token + refresh_token
    2. Encrypt both tokens
    3. Store in database linked to user
    4. Set gmail_connected = True
    """
```

**Endpoint 4: Check Status**
```python
@router.get("/gmail/status")
async def get_gmail_status(current_user: User) -> ApiResponse:
    """
    Get Gmail connection status
    
    Returns:
        gmail_connected: Boolean
        connected_email: Email address
    """
```

**Endpoint 5: Disconnect**
```python
@router.post("/gmail/disconnect")
async def disconnect_gmail(current_user: User) -> ApiResponse:
    """
    Remove all Gmail tokens from database
    User will need to reconnect to send emails again
    """
```

### Step 6: Application Send Endpoint

**File: `backend/app/api/applications.py`**

**Main Send Endpoint:**
```python
@router.post("/applications/{app_id}/send")
async def send_application_via_gmail(
    app_id: int,
    request: SendApplicationRequest,
) -> ApiResponse:
    """
    Step 4 of Flow: Actually send the application
    
    Request:
        to_emails: List of recipient emails (required)
        cc_emails: List of CC emails (optional)
        custom_message: Custom email body (optional)
    
    Process:
    1. Fetch application and job data
    2. Validate Gmail is connected
    3. Read CV and cover letter PDFs from disk
    4. Call GmailService.send_email()
    5. Update application status to "sent"
    
    Returns:
        Success message with Gmail message ID
    """
```

**Email Configuration Endpoint:**
```python
@router.get("/applications/{app_id}/email-config")
async def get_email_config(app_id: int) -> ApiResponse:
    """
    Get pre-filled email configuration
    
    Returns:
        to_emails: From job posting (extracted)
        cc_emails: From job posting (extracted)
        application_method: How to apply (email, portal, etc.)
        gmail_connected: Whether Gmail is connected
    """
```

### Step 7: Frontend Components

**File: `frontend/src/components/dashboard/GmailConnection.tsx`**

Component for managing Gmail connection:
- Check if Gmail is connected
- Show "Connect Gmail" button if not connected
- Show "Disconnect Gmail" button if connected
- Handle OAuth2 flow by redirecting to `POST /auth/gmail/connect`

**File: `frontend/src/components/dashboard/SendEmailModal.tsx`**

Modal for sending applications:
- Show pre-filled recipient emails from job posting
- Allow users to add/remove email addresses
- Support CC emails
- Optional custom message field
- Call `POST /applications/{id}/send` when sending

**File: `frontend/src/app/dashboard/applications/page.tsx`**

Updated applications page:
- Check Gmail connection status
- Show "Send via Gmail" button for review status apps
- Open SendEmailModal when button clicked
- Refresh application after sending

---

## Security Considerations

### 1. Encryption

**Problem:** OAuth2 tokens are sensitive credentials.

**Solution:** Use `cryptography.fernet` to encrypt tokens before storage.

```python
# Encryption in database
encrypted_token = encrypt_token(refresh_token)  # Stored in DB

# Decryption when needed
refresh_token = decrypt_token(encrypted_token)  # Retrieved from DB
```

### 2. CSRF Protection

**Problem:** Attackers could initiate OAuth2 flow for themselves.

**Solution:** Use `state` parameter in OAuth2 flow.

```python
state = secrets.token_urlsafe(32)  # Random string
# Include in auth URL
# Verify it when receiving callback (optional but recommended)
```

### 3. Token Refresh

**Problem:** Access tokens expire; need automatic refresh.

**Solution:** Check expiry time before each send operation.

```python
if datetime.utcnow() < user.gmail_token_expires_at:
    use_existing_access_token()
else:
    refresh_access_token()
```

### 4. Scope Limitation

**Gmail Scope:**
- Using: `https://www.googleapis.com/auth/gmail.send`
- This scope **only** allows sending emails
- Cannot read emails, delete emails, or access other Gmail features
- Most restrictive scope for email sending

---

## Environment Variables

Add these to `.env`:

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id_from_google
GOOGLE_CLIENT_SECRET=your_client_secret_from_google

# URLs
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies:
- `google-auth==2.25.2`
- `google-auth-oauthlib==1.2.0`
- `google-api-python-client==2.107.0`
- `cryptography==41.0.7`

### 2. Database Migration

Run the migration to add new columns to `users` table:

```bash
# Using Alembic (if set up)
alembic upgrade head

# OR manually in PostgreSQL:
ALTER TABLE users ADD COLUMN gmail_refresh_token TEXT;
ALTER TABLE users ADD COLUMN gmail_access_token TEXT;
ALTER TABLE users ADD COLUMN gmail_token_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN gmail_connected BOOLEAN DEFAULT FALSE;
```

### 3. Restart Backend

```bash
uvicorn app.main:app --reload
```

---

## User Flow Walkthrough

### Scenario: Sending a Job Application

1. **User is on Applications page**
   - Sees list of applications in "review" status
   - Clicks on an application to view details

2. **User clicks "Send via Gmail"**
   - If Gmail not connected, shows error message
   - If Gmail connected, opens SendEmailModal

3. **SendEmailModal shows pre-filled emails**
   - Fetches `GET /api/v1/applications/{id}/email-config`
   - Shows recipient emails from job posting
   - Shows CC emails if any
   - User can add/remove/modify emails

4. **User enters custom message (optional)**
   - Can add personal touch to default email template

5. **User clicks "Send Application"**
   - Calls `POST /api/v1/applications/{id}/send`
   - Backend:
     - Gets user's encrypted tokens
     - Reads CV PDF and Cover Letter PDF
     - Sends email via Gmail API
     - Updates application status to "sent"
   - Frontend refreshes application list

6. **Email is sent to recruiters**
   - From: User's Gmail address
   - To: Recipients specified
   - CC: Any CC'd addresses
   - Subject: "Application for [Job Title] at [Company]"
   - Body: Custom message or default template
   - Attachments: CV.pdf, CoverLetter.pdf

---

## File Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── auth.py          ✅ OAuth2 endpoints
│   │   └── applications.py  ✅ Send email endpoints
│   ├── core/
│   │   └── config.py        ✅ Google credentials config
│   ├── db/
│   │   └── models.py        ✅ Gmail fields on User model
│   └── services/
│       ├── encryption_service.py  ✅ NEW - Token encryption
│       └── gmail_service.py       ✅ NEW - Gmail API service
└── requirements.txt         ✅ Gmail dependencies

frontend/
└── src/
    ├── app/
    │   └── dashboard/
    │       └── applications/
    │           └── page.tsx  ✅ Updated with modal & Gmail support
    └── components/
        └── dashboard/
            ├── GmailConnection.tsx   ✅ NEW - Gmail settings component
            └── SendEmailModal.tsx    ✅ NEW - Email sending modal
```

---

## Troubleshooting

### "Gmail not connected" error

**Cause:** User hasn't completed OAuth2 flow

**Solution:**
1. Go to Dashboard → Settings
2. Click "Connect Gmail Account"
3. Follow Google authorization flow
4. Tokens are automatically stored

### "Failed to send email" error

**Causes:**
- Email addresses are invalid
- User's token expired and refresh failed
- Gmail API returned an error

**Debug:**
- Check backend logs for specific error
- Verify email addresses are valid
- Try disconnecting and reconnecting Gmail

### "Token exchange failed"

**Cause:** Google OAuth2 response is invalid

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
2. Verify redirect URI matches in Google Cloud Console
3. Check network logs for exact error from Google

---

## Future Enhancements

1. **Draft Email Preview**
   - Show email preview before sending
   - Let users customize subject line

2. **Retry Logic**
   - Retry failed sends
   - Exponential backoff

3. **Email Templates**
   - Store user-preferred email templates
   - Multiple templates for different scenarios

4. **Delivery Tracking**
   - Log which emails were sent
   - Track delivery status

5. **Multiple Gmail Accounts**
   - Allow users to connect multiple Gmail accounts
   - Choose which account to send from

---

## References

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Python Cryptography Library](https://cryptography.io/)
- [FastAPI OAuth2 Patterns](https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/)

---

## Summary

The Gmail integration enables:
- ✅ Secure OAuth2 connection to Gmail
- ✅ Encrypted token storage
- ✅ Easy sending of applications with attachments
- ✅ User-friendly modal for email configuration
- ✅ Support for CC emails
- ✅ Optional custom messages
- ✅ Automatic token refresh

All with security best practices in place!
