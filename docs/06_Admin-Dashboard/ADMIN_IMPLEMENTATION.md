# Admin Dashboard Implementation Documentation

## Overview
Comprehensive admin panel with role-based access control (RBAC) for managing users, applications, and system analytics. Only accessible to users with admin privileges.

## Backend Implementation

### 1. Database Schema Updates

**User Model Additions** (`app/db/models.py`):
```python
is_admin = Column(Boolean, default=False, nullable=False)
is_active = Column(Boolean, default=True, nullable=False)
```

**Migration**:
- File: `migrations/add_admin_fields.py`
- Run: `python migrations/add_admin_fields.py`
- Adds `is_admin` and `is_active` columns to users table

### 2. Admin Authentication Middleware

**File**: `app/core/admin.py`

**Functions**:
- `get_current_admin_user()`: Dependency for admin-only routes
- `verify_admin_token()`: Alternative admin verification
- Returns 403 Forbidden if user is not admin or inactive

**Usage**:
```python
@router.get("/admin/endpoint")
async def admin_endpoint(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Admin-only logic here
    pass
```

### 3. Admin API Endpoints

**File**: `app/api/admin.py`  
**Prefix**: `/api/v1/admin`  
**Authentication**: Required (Bearer token + admin role)

#### Dashboard Analytics

**GET `/admin/stats/overview`**
- Returns comprehensive system statistics
- Response:
  ```json
  {
    "success": true,
    "data": {
      "users": {
        "total": 150,
        "active": 120,
        "new_this_week": 12,
        "growth_rate": 8.7
      },
      "applications": {
        "total": 500,
        "recent_24h": 25,
        "by_status": {
          "pending": 50,
          "sent": 200,
          "review": 100,
          "archived": 150
        }
      },
      "timestamp": "2026-02-02T10:30:00Z"
    }
  }
  ```

**GET `/admin/stats/growth`**
- Query Parameters:
  - `days`: Number of days to analyze (7-365, default: 30)
- Returns user and application growth over time
- Response includes daily counts for visualization

#### User Management

**GET `/admin/users`**
- Paginated user list with filters
- Query Parameters:
  - `skip`: Pagination offset (default: 0)
  - `limit`: Items per page (1-100, default: 50)
  - `search`: Search by name or email
  - `admin_only`: Filter admin users (true/false)
  - `is_active`: Filter by active status (true/false)

**GET `/admin/users/{user_id}`**
- Get detailed user information
- Includes application statistics

**PATCH `/admin/users/{user_id}/admin-status`**
- Toggle admin privileges
- Query Parameter: `make_admin` (boolean)
- Protection: Cannot modify own admin status

**PATCH `/admin/users/{user_id}/active-status`**
- Activate/deactivate user account
- Query Parameter: `is_active` (boolean)
- Protection: Cannot modify own account status

**DELETE `/admin/users/{user_id}`**
- Permanently delete user and all associated data
- Protection: Cannot delete own account
- Confirmation required on frontend

#### Application Management

**GET `/admin/applications`**
- Paginated application list with filters
- Query Parameters:
  - `skip`, `limit`: Pagination
  - `status`: Filter by JobApplicationStatus
  - `user_id`: Filter by specific user

**DELETE `/admin/applications/{application_id}`**
- Delete job application
- Admin-only access

#### System Settings

**GET `/admin/settings/system`**
- Get system-wide configuration
- Returns operational status, features, API version

## Frontend Implementation

### 1. Admin Layout Component

**File**: `components/admin/AdminLayout.tsx`

**Features**:
- Sidebar navigation with 5 sections
- Admin verification on mount (checks `is_admin` from user profile)
- Redirects non-admin users to regular dashboard
- Mobile-responsive with hamburger menu
- "Admin Mode" badge in header
- Exit button to return to user dashboard

**Navigation Items**:
1. Overview - `/admin`
2. Users - `/admin/users`
3. Applications - `/admin/applications`
4. Analytics - `/admin/analytics`
5. Settings - `/admin/settings`

### 2. Admin Overview Page

**File**: `app/admin/page.tsx`

**Features**:
- Real-time statistics dashboard
- 4 key metric cards:
  - Total Users
  - Active Users
  - Total Applications
  - Success Rate
- Application status breakdown with visual progress bars
- Quick action links to other admin sections
- System status indicator
- Auto-refresh every 30 seconds

### 3. User Management Page

**File**: `app/admin/users/page.tsx`

**Features**:
- Search users by name or email
- Filter by admin status and active status
- Paginated table (20 users per page)
- User actions:
  - Toggle active/inactive status
  - Grant/revoke admin privileges
  - Delete user account
- Confirmation dialogs for destructive actions
- Real-time table updates after actions

**Table Columns**:
- User (name + email)
- Location
- Status (Active/Inactive badge)
- Role (Admin/User badge)
- Joined date
- Actions (3 icon buttons)

### 4. Styling & Theme

**Consistent with LeAI Brand**:
- Colors: `#3010b2` (primary), dark backgrounds
- Card-based layout with `card-dark` class
- Gradient accents for stats and buttons
- Hover effects and smooth transitions
- Responsive grid layouts
- Status badges with semantic colors:
  - Green: Active/Success
  - Red: Inactive/Error
  - Blue: Admin/Info
  - Yellow: Pending/Warning

## Security Considerations

### Backend Security

1. **Role-Based Access Control**:
   - All admin endpoints protected by `get_current_admin_user()` dependency
   - Verifies JWT token validity
   - Checks `is_admin` flag on user
   - Checks `is_active` status

2. **Self-Protection**:
   - Users cannot modify their own admin status
   - Users cannot deactivate their own account
   - Users cannot delete themselves

3. **Error Handling**:
   - 401 Unauthorized: Invalid/missing token
   - 403 Forbidden: Valid token but insufficient permissions
   - 404 Not Found: Resource doesn't exist
   - Detailed error messages in responses

### Frontend Security

1. **Admin Verification**:
   - Checks user's `is_admin` status on every admin page load
   - Redirects non-admin users immediately
   - No admin UI visible to regular users

2. **Token Management**:
   - Uses `getAuthToken()` from cookies (not localStorage)
   - Token sent in Authorization header
   - Automatic redirect to login on 401 errors

3. **Confirmation Dialogs**:
   - Required for destructive actions (delete user)
   - Prevents accidental data loss

## Database Migration

**To add admin fields to existing database**:

```bash
cd backend
python migrations/add_admin_fields.py
```

**To create first admin user** (PostgreSQL):
```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'admin@tryleai.com';
```

Or via Python script:
```python
from app.db.database import get_db
from app.db.models import User
from sqlalchemy import select, update

async def make_user_admin(email: str):
    async for db in get_db():
        stmt = update(User).where(User.email == email).values(is_admin=True)
        await db.execute(stmt)
        await db.commit()
```

## API Routes Registration

**File**: `backend/main.py`

```python
from app.api import auth, users, admin

app.include_router(admin.router, prefix="/api/v1")
```

## Testing Admin Features

### 1. Create Admin User
```bash
# Option 1: Direct SQL
psql -U your_user -d aditus
UPDATE users SET is_admin = true WHERE email = 'your@email.com';

# Option 2: Via API (requires existing admin or direct DB access first)
```

### 2. Test Admin Endpoints
```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpass"}' \
  | jq -r '.data.token.access_token')

# Get overview stats
curl http://localhost:8000/api/v1/admin/stats/overview \
  -H "Authorization: Bearer $TOKEN"

# List users
curl http://localhost:8000/api/v1/admin/users?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Access Frontend Admin Panel
```
1. Login with admin account
2. Navigate to http://localhost:3000/admin
3. Should see admin dashboard
4. Non-admin users will be redirected to /dashboard
```

## Future Enhancements

### Phase 2 Features:
1. **Analytics Dashboard** (`/admin/analytics`):
   - Growth charts with Chart.js or Recharts
   - User engagement metrics
   - Application success rates
   - Geographic distribution

2. **Application Management** (`/admin/applications`):
   - View all user applications
   - Filter by status, date, user
   - Bulk actions (archive, delete)
   - Export to CSV

3. **Admin Settings** (`/admin/settings`):
   - System configuration
   - Feature flags
   - Maintenance mode toggle
   - Email template management
   - API rate limits

4. **Activity Logs**:
   - Track admin actions
   - Audit trail for changes
   - User login history
   - Failed login attempts

5. **Advanced User Management**:
   - Bulk user import/export
   - Email verification status
   - Password reset for users
   - Account suspension reasons

6. **Role Management**:
   - Multiple role types (super-admin, moderator, support)
   - Custom permission sets
   - Role-based UI visibility

## Troubleshooting

### Issue: 403 Forbidden on admin endpoints
**Solution**: Verify user has `is_admin=true` in database

### Issue: Frontend redirects to dashboard
**Solution**: Check browser console for errors, verify token validity, ensure backend migration ran

### Issue: Cannot see admin panel link
**Solution**: Admin panel is only accessible via direct URL `/admin`, no link in regular dashboard for security

### Issue: Changes not reflecting
**Solution**: Clear browser cache, check network tab for 200 responses, verify state updates in React DevTools

## File Structure

```
backend/
├── app/
│   ├── api/
│   │   └── admin.py          # Admin endpoints
│   ├── core/
│   │   └── admin.py          # Admin middleware
│   ├── db/
│   │   └── models.py         # Updated User model
│   └── schemas/
│       └── __init__.py       # Updated UserResponse
├── migrations/
│   └── add_admin_fields.py   # Database migration
└── main.py                    # Router registration

frontend/
├── src/
│   ├── app/
│   │   └── admin/
│   │       ├── page.tsx              # Overview
│   │       └── users/
│   │           └── page.tsx          # User management
│   └── components/
│       └── admin/
│           └── AdminLayout.tsx       # Admin layout wrapper
```

## Performance Considerations

1. **Pagination**: All list endpoints support pagination to prevent large data transfers
2. **Indexing**: Database indexes on `is_admin`, `is_active`, `email` for fast queries
3. **Caching**: Consider adding Redis cache for stats that don't change frequently
4. **Rate Limiting**: Implement rate limiting on admin endpoints to prevent abuse
5. **Lazy Loading**: Frontend loads data only when needed, not on initial page load

## Compliance & Privacy

1. **Data Deletion**: Admin delete action removes all user data permanently
2. **Audit Trail**: Consider logging all admin actions for compliance
3. **Access Logs**: Track who accessed admin panel and when
4. **GDPR**: Delete user functionality supports right to be forgotten
5. **Data Export**: Future feature for user data export (GDPR compliance)

---

**Documentation Version**: 1.0  
**Last Updated**: February 2, 2026  
**Author**: LeAI Development Team
