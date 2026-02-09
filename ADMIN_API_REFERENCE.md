# Admin API Reference

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All endpoints require JWT token in `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

## Users Management

### List Users (with pagination, search, filtering)
```
GET /admin/users
```

**Query Parameters:**
- `skip` (int, default: 0) - Number of items to skip
- `limit` (int, default: 20) - Number of items to return
- `search` (string, optional) - Search by name, email
- `admin_only` (bool, optional) - Filter admin users only
- `is_active` (bool, optional) - Filter by active status

**Response:**
```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "full_name": "John Doe",
        "location": "Nairobi",
        "is_active": true,
        "role": "candidate",
        "last_login_at": "2024-01-15T10:30:00",
        "last_login_ip": "192.168.1.1",
        "mfa_enabled": false,
        "created_at": "2024-01-10T09:00:00",
        "subscription": {
          "plan_type": "premium",
          "status": "active",
          "current_period_end": "2024-02-10"
        }
      }
    ],
    "total": 150,
    "skip": 0,
    "limit": 20
  }
}
```

### Update User Role
```
PATCH /admin/users/{user_id}/role
```

**Request Body:**
```json
{
  "role": "support_agent",
  "reason": "Promoted to support team member"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "role": "support_agent",
    "message": "Role updated successfully"
  }
}
```

**Audit Log Entry:**
- Action: `role_change`
- Target: User {user_id}
- Details: `{old_role: "candidate", new_role: "support_agent", reason: "..."}`

### Toggle User Active Status
```
PATCH /admin/users/{user_id}/active-status
```

**Request Body:**
```json
{
  "is_active": false,
  "reason": "Account flagged for suspicious activity"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "is_active": false,
    "message": "Status updated successfully"
  }
}
```

**Audit Log Entry:**
- Action: `status_change`
- Target: User {user_id}
- Details: `{status: "inactive", reason: "..."}`

### Delete User
```
DELETE /admin/users/{user_id}
```

**Request Body:**
```json
{
  "reason": "Account no longer needed - duplicate registration",
  "confirmation": "true"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "message": "User deleted successfully"
  }
}
```

**Audit Log Entry:**
- Action: `user_delete`
- Target: User {user_id}
- Details: `{reason: "..."}`

### Add User Credits
```
POST /admin/users/credit
```

**Request Body:**
```json
{
  "user_id": 1,
  "amount": 100,
  "reason": "Compensation for service outage on 2024-01-15"
}
```

**Response:**
```json
{
  "data": {
    "user_id": 1,
    "new_balance": 250,
    "amount_added": 100,
    "message": "Credits added successfully"
  }
}
```

**Audit Log Entry:**
- Action: `credit_adjustment`
- Target: User {user_id}
- Details: `{amount: 100, new_balance: 250, reason: "..."}`

### Impersonate User
```
POST /admin/users/{user_id}/impersonate
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": 1,
    "permissions": ["read-only"],
    "expires_in": 3600,
    "message": "Impersonation token created"
  }
}
```

**Audit Log Entry:**
- Action: `impersonate`
- Target: User {user_id}

**Token Restrictions:**
- Read-only access (no write operations)
- 1 hour expiration
- Cannot perform admin actions

## Applications Management

### List Applications (with filtering)
```
GET /admin/applications
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, default: 15) - Items per page
- `status` (string, optional) - Filter by status:
  - `review` - Queued for review
  - `sent` - Sent to employer
  - `waiting_response` - Awaiting response
  - `interview_scheduled` - Interview scheduled
  - `offer_negotiation` - Offer stage
  - `rejected` - Rejected
  - `archived` - Archived

**Response:**
```json
{
  "data": {
    "applications": [
      {
        "id": 123,
        "user_id": 1,
        "user_email": "user@example.com",
        "user_full_name": "John Doe",
        "job_title": "Senior Backend Engineer",
        "company_name": "Tech Corp Kenya",
        "location": "Nairobi",
        "status": "sent",
        "created_at": "2024-01-10T09:00:00",
        "submitted_at": "2024-01-11T14:30:00",
        "cv_pdf_path": "/pdfs/cv_123.pdf",
        "cover_letter_pdf_path": "/pdfs/letter_123.pdf"
      }
    ],
    "total": 450,
    "page": 1,
    "limit": 15,
    "total_pages": 30
  }
}
```

### Download Application PDF
```
GET /applications/{app_id}/pdf/{type}
```

**Path Parameters:**
- `app_id` (int) - Application ID
- `type` (string) - `cv` or `cover_letter`

**Response:**
- Binary PDF file with appropriate `Content-Disposition` header

## Admin Analytics

### Get Analytics Summary
```
GET /applications/analytics/summary
```

**Response:**
```json
{
  "data": {
    "total_applications": 450,
    "applications_by_status": {
      "review": 45,
      "sent": 180,
      "waiting_response": 120,
      "interview_scheduled": 85,
      "offer_negotiation": 15,
      "rejected": 5
    },
    "total_users": 150,
    "active_users": 145,
    "new_users_this_month": 23,
    "applications_sent_this_month": 156
  }
}
```

## Audit Logs

### List Admin Action Logs
```
GET /admin/audit-logs
```

**Query Parameters:**
- `skip` (int, default: 0) - Items to skip
- `limit` (int, default: 50) - Items to return
- `admin_user_id` (int, optional) - Filter by admin
- `action` (string, optional) - Filter by action type
- `target_type` (string, optional) - Filter by target type

**Response:**
```json
{
  "data": {
    "logs": [
      {
        "id": 1,
        "admin_user_id": 5,
        "admin_email": "admin@example.com",
        "action": "role_change",
        "target_type": "user",
        "target_id": 1,
        "details": {
          "old_role": "candidate",
          "new_role": "support_agent",
          "reason": "Team member promotion"
        },
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2024-01-15T10:30:00"
      }
    ],
    "total": 1250,
    "skip": 0,
    "limit": 50
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid status: 'unknown'"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "detail": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Failed to fetch applications"
}
```

## Rate Limiting
- No explicit rate limiting configured (can be added via FastAPI middleware)
- Recommended: 100 requests/minute per admin user

## Batch Operations (Future)
```
POST /admin/users/bulk-role-assignment
POST /admin/applications/bulk-status-update
POST /admin/users/bulk-deactivate
```

## Webhook Events (Future)
- `user.role_changed`
- `application.status_changed`
- `user.deleted`
- `admin.action_performed`

## Example Usage

### Get and Filter Users
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/admin/users?admin_only=true&is_active=true&limit=10"
```

### Change User Role with Reason
```bash
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "finance_admin",
    "reason": "Hired for financial operations team"
  }' \
  "http://localhost:8000/api/v1/admin/users/5/role"
```

### Get Applications by Status
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/admin/applications?status=interview_scheduled&limit=20"
```

### Download Application CV
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/applications/123/pdf/cv" \
  -o application_123_cv.pdf
```

## Admin Roles & Permissions

### SUPER_ADMIN
- Full system access
- Can modify any user or application
- Can view all audit logs
- Can delete any record
- Requires MFA enabled

### SUPPORT_AGENT
- View users
- View applications
- Cannot modify user roles
- Can add credits for compensation
- Can impersonate users for support
- Limited audit log access

### FINANCE_ADMIN
- View users and financial data
- Add/remove credits
- View financial analytics
- Cannot modify user roles
- Limited audit log access

### CONTENT_MANAGER
- View applications
- Modify application status
- View analytics
- Cannot modify users
- Cannot view financial data

### COMPLIANCE_OFFICER
- View all audit logs
- View user action history
- Cannot modify any records
- Read-only access to applications
- Cannot modify user roles

### RECRUITER
- View applications
- Filter by job title/company
- Download PDFs
- Cannot modify status
- Cannot view user data
- Cannot view financial data

### UNIVERSITY_VERIFIER
- View education-related data
- Cannot modify applications
- Limited user profile access
- Cannot view financial data

## Implementation Notes

1. **Reason Tracking:** All sensitive operations require `reason` parameter for audit accountability
2. **Audit Logging:** Every action is logged with admin ID, IP, user-agent, timestamp, and details
3. **Confirmation:** Destructive actions (delete, deactivate) require confirmation via modal
4. **Token Encryption:** Impersonation tokens are short-lived (1 hour) and read-only
5. **IP Logging:** All actions log the admin's IP for forensic analysis
6. **Search:** Full-text search on user name, email, phone number
7. **Pagination:** Server-side pagination prevents large data transfers
