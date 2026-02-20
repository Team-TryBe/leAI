# Gmail Integration API Reference

## Authentication Endpoints

### 1. Initiate Gmail Connection

**Endpoint:** `POST /api/v1/auth/gmail/connect`

**Authentication:** Bearer token required

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&state=..."
  }
}
```

**Frontend Usage:**
```typescript
const response = await fetch(`/api/v1/auth/gmail/connect`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await response.json();
window.location.href = data.auth_url;  // Redirect to Google
```

---

### 2. OAuth2 Callback Handler

**Endpoint:** `GET /api/v1/auth/gmail/callback`

**Query Parameters:**
- `code` (string): Authorization code from Google
- `state` (string): CSRF protection token

**Response:** Redirects to `/dashboard/settings?gmail_connected=true`

**Note:** This is called automatically by Google; no manual API call needed.

---

### 3. Store OAuth2 Tokens

**Endpoint:** `POST /api/v1/auth/gmail/store-tokens`

**Authentication:** Bearer token required

**Request:**
```json
{
  "code": "authorization_code_from_google",
  "state": "csrf_token"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Gmail connected successfully!"
  }
}
```

**Frontend Usage:**
```typescript
const response = await fetch(`/api/v1/auth/gmail/store-tokens`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ code, state })
});
```

---

### 4. Get Gmail Connection Status

**Endpoint:** `GET /api/v1/auth/gmail/status`

**Authentication:** Bearer token required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "gmail_connected": true,
    "connected_email": "user@gmail.com"
  }
}
```

**Frontend Usage:**
```typescript
const response = await fetch(`/api/v1/auth/gmail/status`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await response.json();
console.log(data.gmail_connected);  // true or false
```

---

### 5. Disconnect Gmail

**Endpoint:** `POST /api/v1/auth/gmail/disconnect`

**Authentication:** Bearer token required

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Gmail disconnected successfully"
  }
}
```

**Frontend Usage:**
```typescript
const response = await fetch(`/api/v1/auth/gmail/disconnect`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Application Sending Endpoints

### 1. Get Email Configuration

**Endpoint:** `GET /api/v1/applications/{app_id}/email-config`

**Authentication:** Bearer token required

**Path Parameters:**
- `app_id` (integer): Job application ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "app_id": 123,
    "job_title": "Senior Software Engineer",
    "company_name": "Google",
    "to_emails": ["hiring@google.com"],
    "cc_emails": ["recruiter@google.com"],
    "application_method": "Email",
    "gmail_connected": true
  }
}
```

**Frontend Usage:**
```typescript
const response = await fetch(
  `/api/v1/applications/${appId}/email-config`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const { data } = await response.json();
// Use data.to_emails and data.cc_emails to pre-fill the form
```

---

### 2. Send Application via Gmail

**Endpoint:** `POST /api/v1/applications/{app_id}/send`

**Authentication:** Bearer token required

**Path Parameters:**
- `app_id` (integer): Job application ID

**Request:**
```json
{
  "app_id": 123,
  "to_emails": ["hiring@google.com", "recruiter@google.com"],
  "cc_emails": ["director@google.com"],
  "custom_message": "I am very interested in this position..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Application sent successfully!",
    "application_id": 123,
    "status": "sent",
    "sent_at": "2024-02-04T10:30:45"
  }
}
```

**Error Response (400):**
```json
{
  "detail": "Gmail account not connected. Please connect Gmail in settings."
}
```

**Error Response (404):**
```json
{
  "detail": "Application not found"
}
```

**Frontend Usage:**
```typescript
const response = await fetch(
  `/api/v1/applications/${appId}/send`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      app_id: appId,
      to_emails: ["recipient@example.com"],
      cc_emails: ["cc@example.com"],
      custom_message: "Custom message here"
    })
  }
);

if (response.ok) {
  const { data } = await response.json();
  console.log("Email sent at:", data.sent_at);
  // Refresh applications list
} else {
  const error = await response.json();
  console.error("Failed to send:", error.detail);
}
```

---

## Email Service Details

### What Gets Sent

When an application is sent, the following email is generated:

**From:** User's Gmail account (e.g., `user@gmail.com`)

**To:** User-specified recipients

**CC:** Optional CC addresses

**Subject:** `Application for [Job Title] at [Company]`

**Body (HTML):**
```html
<html>
  <body>
    <p>Dear Hiring Manager,</p>
    <p>[Custom message or default message]</p>
    <p>I have attached my CV and cover letter for your review...</p>
    <p>Thank you for considering my application. I look forward to hearing from you.</p>
    <p>Best regards,<br/>[User Full Name]</p>
  </body>
</html>
```

**Attachments:**
1. `CV_[Full_Name].pdf` - Tailored CV
2. `CoverLetter_[Full_Name].pdf` - Tailored cover letter

---

## Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 400 | "Gmail account not connected" | User needs to connect Gmail first |
| 400 | "Please add at least one recipient email" | User must specify at least one recipient |
| 404 | "Application not found" | Application ID doesn't exist or not owned by user |
| 500 | "Failed to send email: ..." | Gmail API error (check logs) |
| 401 | "Unauthorized" | Bearer token expired or invalid |

### Token Refresh Errors

If access token is expired:
- Backend automatically refreshes using refresh token
- If refresh fails, user must disconnect and reconnect Gmail
- Error message: "Token exchange failed"

---

## Request/Response Examples

### Complete Flow Example

**1. Check Gmail Status**
```bash
curl -X GET http://localhost:8000/api/v1/auth/gmail/status \
  -H "Authorization: Bearer your_token"
```

Response:
```json
{
  "success": true,
  "data": {
    "gmail_connected": false,
    "connected_email": null
  }
}
```

**2. Initiate Connection**
```bash
curl -X POST http://localhost:8000/api/v1/auth/gmail/connect \
  -H "Authorization: Bearer your_token"
```

Response:
```json
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

**3. User clicks auth_url, gets redirected back**
- Google redirects to: `/api/v1/auth/gmail/callback?code=...&state=...`

**4. Store Tokens**
```bash
curl -X POST http://localhost:8000/api/v1/auth/gmail/store-tokens \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "code_from_google",
    "state": "state_from_google"
  }'
```

**5. Check Status Again**
```bash
curl -X GET http://localhost:8000/api/v1/auth/gmail/status \
  -H "Authorization: Bearer your_token"
```

Response:
```json
{
  "success": true,
  "data": {
    "gmail_connected": true,
    "connected_email": "user@gmail.com"
  }
}
```

**6. Get Email Config**
```bash
curl -X GET http://localhost:8000/api/v1/applications/123/email-config \
  -H "Authorization: Bearer your_token"
```

**7. Send Application**
```bash
curl -X POST http://localhost:8000/api/v1/applications/123/send \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": 123,
    "to_emails": ["hiring@company.com"],
    "cc_emails": ["recruiter@company.com"],
    "custom_message": "I am excited to apply for this role..."
  }'
```

---

## Rate Limiting

Currently no rate limiting is implemented, but recommended for production:

```python
# Suggested limits:
# - 5 applications per minute per user
# - 50 applications per day per user
# - 1000 applications per day total
```

---

## Security Notes

1. **Tokens are Encrypted**
   - All tokens in database are encrypted with Fernet (AES-256)
   - Only decrypted when sending email

2. **CSRF Protection**
   - State parameter used in OAuth2 flow
   - Should be verified on callback

3. **Scope Limitation**
   - Only `gmail.send` scope is requested
   - Cannot read, delete, or access other Gmail features

4. **HTTPS Required**
   - In production, all endpoints must use HTTPS
   - OAuth2 will not work over HTTP

5. **Token Management**
   - Refresh tokens never expire
   - Access tokens auto-refresh
   - Tokens deleted on disconnect

---

## Backend Implementation

### Files

**OAuth2 Endpoints:** `backend/app/api/auth.py`
- Lines: Implementation of all 5 endpoints

**Email Sending:** `backend/app/api/applications.py`
- Lines: Implementation of send and config endpoints

**Services:** `backend/app/services/`
- `gmail_service.py` - Gmail API integration
- `encryption_service.py` - Token encryption

**Database:** `backend/app/db/models.py`
- User model with Gmail columns

---

## Frontend Implementation

### Components

**GmailConnection:** `frontend/src/components/dashboard/GmailConnection.tsx`
- Connection management
- Status display
- OAuth2 flow

**SendEmailModal:** `frontend/src/components/dashboard/SendEmailModal.tsx`
- Email form
- Recipient management
- Send functionality

**Applications Page:** `frontend/src/app/dashboard/applications/page.tsx`
- Integration with modal
- Status checking
- Button handling

---

## Testing

### Unit Tests

```python
# Test encryption
def test_encrypt_decrypt():
    token = "test_token_12345"
    encrypted = encrypt_token(token)
    decrypted = decrypt_token(encrypted)
    assert token == decrypted

# Test Gmail service
@pytest.mark.asyncio
async def test_send_email():
    await GmailService.send_email(
        user_id=1,
        db=db,
        to_emails=["test@example.com"],
        subject="Test",
        body="Test body"
    )
    # Assert email was sent
```

### Integration Tests

```bash
# Test OAuth2 flow
pytest tests/test_oauth2_flow.py

# Test email sending
pytest tests/test_send_email.py

# Test error handling
pytest tests/test_error_handling.py
```

---

## Performance

- **OAuth2 Connection:** < 1 second (redirects to Google)
- **Token Storage:** < 100ms (database write)
- **Token Refresh:** < 500ms (API call to Google)
- **Email Send:** < 2 seconds (including file I/O and Gmail API)

---

## Support

For questions or issues:
- Check [`GMAIL_SETUP_INSTRUCTIONS.md`](GMAIL_SETUP_INSTRUCTIONS.md)
- Check [`docs/GMAIL_OAUTH2_INTEGRATION.md`](docs/GMAIL_OAUTH2_INTEGRATION.md)
- Check [`docs/GMAIL_OAUTH2_QUICK_SETUP.md`](docs/GMAIL_OAUTH2_QUICK_SETUP.md)
- Review error logs in backend

Happy sending! 🚀
