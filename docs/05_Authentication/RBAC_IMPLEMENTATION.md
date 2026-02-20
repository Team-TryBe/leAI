# Role-Based Access Control (RBAC) Implementation

## Overview
Comprehensive RBAC system tailored for the Kenyan market with accountability, least privilege principles, and compliance features.

## 🎭 Role Structure

### Internal Roles (Aditus Team)

#### 1. **SUPER_ADMIN** - God Mode
- **Access**: Full system control
- **Constraints**: 
  - ⚠️ MFA (Multi-Factor Auth) **MANDATORY**
  - Only 2 people should have this role
- **Permissions**:
  - Delete users, refund payments
  - Change system configs, ban IPs
  - Access all data and features
- **Best For**: Founders / CTO

#### 2. **SUPPORT_AGENT** - The Helper
- **Access**: Read-only debugging & support
- **Constraints**:
  - Cannot see full phone numbers/IDs (masked)
  - Cannot delete anything
  - Read-only on sensitive data
- **Permissions**:
  - View user profiles ("View as User")
  - View credit history
  - View applications and jobs
- **Best For**: Customer Support

#### 3. **FINANCE_ADMIN** - Money Manager
- **Access**: Financial operations only
- **Constraints**:
  - Cannot edit user profiles
  - Cannot view CVs or application content
  - Can initiate refunds but not edit users
- **Permissions**:
  - View M-Pesa transaction logs
  - Reconcile orphaned payments
  - Generate revenue reports
  - View financial audit logs
- **Best For**: Accountant / FinOps

#### 4. **CONTENT_MANAGER** - The Editor
- **Access**: Content and job management
- **Constraints**:
  - No access to user data or financials
  - Cannot view applications
- **Permissions**:
  - Approve/reject scraped jobs
  - Edit blog posts
  - Manage "Master Career Tips" database
- **Best For**: Marketing / SEO Team

#### 5. **COMPLIANCE_OFFICER** - The Watchdog
- **Access**: Audit logs and data protection
- **Constraints**:
  - Can delete data ONLY for compliance requests
  - Cannot edit users or access financials
- **Permissions**:
  - View audit logs (who accessed what)
  - Handle "Right to be Forgotten" requests
  - Export compliance reports
- **Best For**: Legal / Data Protection Officer

### External Roles (Users & Partners)

#### 6. **CANDIDATE** - Standard User
- **Access**: Own profile and applications
- **Permissions**:
  - Create and manage profile
  - Generate CVs and cover letters
  - Apply to jobs
  - Owns their data

#### 7. **RECRUITER** - Pro User
- **Access**: Job posting and applicant management
- **Constraints**:
  - Can only view applicants for their own jobs
  - Cannot access full user database unless user applies
- **Permissions**:
  - Post "Verified Jobs" (paid feature)
  - View applicants for their jobs
  - Manage own job postings

#### 8. **UNIVERSITY_VERIFIER** - Trust Layer
- **Access**: Education verification only
- **Example**: UoN, Strathmore, JKUAT registrars
- **Permissions**:
  - Verify education credentials
  - Add "Verified Education" badge to CVs
  - Revoke verification if fraudulent
- **Constraint**: Can only view education section, not full profile

## 🔐 Security Features

### MFA Enforcement
- **Mandatory** for SUPER_ADMIN role
- System will block access if MFA not enabled
- Setup endpoint: `/api/v1/auth/mfa/setup` (TODO)

### Audit Logging
- All sensitive actions logged with:
  - Admin user ID
  - Action type
  - Target user ID
  - IP address
  - Timestamp
  - Detailed reason
- Queryable via `/api/v1/super-admin/audit-logs`

### Data Masking
- Support Agents see masked sensitive data:
  - Phone: `+254*****678` (instead of full number)
  - National ID: `12***678` (instead of full ID)
- Implemented in `app/core/rbac.py::mask_sensitive_data()`

### Last Login Tracking
- IP address stored for all logins
- Timestamp of last successful login
- Useful for security monitoring

## 📊 Permission Scopes

30+ fine-grained permissions grouped by domain:

### User Management
- `user:view`, `user:edit`, `user:delete`, `user:impersonate`

### Financial Operations
- `finance:view`, `finance:reconcile`, `finance:refund`, `finance:reports`

### Content Management
- `content:view`, `content:edit`, `content:delete`, `content:publish`

### Job Management
- `job:view`, `job:create`, `job:edit`, `job:delete`, `job:verify`

### Application Management
- `application:view`, `application:create`, `application:edit`, `application:delete`

### Education Verification
- `education:verify`, `education:revoke`

### Compliance & Audit
- `audit:view`, `audit:export`, `data:delete_compliance`

### System Administration
- `system:config`, `system:ban_ip`, `system:mfa_enforce`

## 🛠️ API Endpoints

### Super Admin Dashboard
**Base URL**: `/api/v1/super-admin`
**Auth**: Requires SUPER_ADMIN + MFA

#### GET `/dashboard`
System-wide statistics:
- Total users, active users
- Applications count
- Users by role
- Registration trends (today/week/month)
- MFA adoption rate

#### GET `/users`
List all users with filtering:
- Query params: `skip`, `limit`, `role`, `search`
- Returns: User summary with application counts

#### PUT `/users/role`
Update user role:
```json
{
  "user_id": 123,
  "new_role": "finance_admin",
  "reason": "Promoted to Finance Admin"
}
```

#### POST `/users/ban`
Ban/deactivate user:
```json
{
  "user_id": 123,
  "reason": "Terms of service violation",
  "permanent": true
}
```

#### DELETE `/users/{user_id}`
Permanently delete user (⚠️ dangerous):
- Query param: `reason` (required for audit)
- Cascades to all user data

#### GET `/audit-logs`
View audit trail:
- Query params: `skip`, `limit`, `admin_user_id`, `action`
- Returns: Timestamped log entries with details

## 💻 Usage Examples

### Check Permission in Code
```python
from app.core.rbac import has_permission, PermissionScope

if has_permission(current_user, PermissionScope.USER_DELETE):
    # User can delete other users
    pass
```

### Enforce Permission on Endpoint
```python
from app.core.rbac import require_super_admin

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    # Only SUPER_ADMIN with MFA can access this
    pass
```

### Log Sensitive Action
```python
from app.core.rbac import log_sensitive_action

await log_sensitive_action(
    db=db,
    user=current_user,
    action="DELETE_USER",
    target_user_id=deleted_user_id,
    details={"reason": "GDPR compliance request"},
    ip_address=request.client.host
)
```

### Get User Permissions (for frontend)
```python
from app.core.rbac import get_user_permissions

permissions = get_user_permissions(current_user)
# Returns: ["user:view", "user:edit", ...]
```

## 📝 Database Schema

### User Table Additions
```sql
-- Role column
role user_role DEFAULT 'candidate' NOT NULL

-- MFA columns
mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL
mfa_secret VARCHAR(255)

-- Audit tracking
last_login_at TIMESTAMP
last_login_ip VARCHAR(45)
```

### AdminActionLog Table (already exists)
```python
class AdminActionLog(Base):
    id: int
    admin_user_id: int  # FK to users
    action: str
    target_user_id: int (optional)
    details: JSON
    ip_address: str
    timestamp: datetime
```

## 🚀 Next Steps

### Phase 1: Finance Admin (Next)
- [ ] Create Finance Admin dashboard API
- [ ] M-Pesa transaction viewer
- [ ] Payment reconciliation tools
- [ ] Revenue reports generator

### Phase 2: Support Features
- [ ] MFA setup endpoint (`/api/v1/auth/mfa/setup`)
- [ ] QR code generation for TOTP
- [ ] MFA verification endpoint
- [ ] Support Agent "View as User" mode

### Phase 3: Content & Compliance
- [ ] Content Manager dashboard
- [ ] Job approval workflow
- [ ] Compliance Officer tools
- [ ] Data export for GDPR requests

### Phase 4: External Roles
- [ ] Recruiter dashboard
- [ ] Job posting interface
- [ ] University Verifier portal
- [ ] Education verification workflow

### Phase 5: Frontend RBAC
- [ ] Role-based UI components
- [ ] Permission-aware navigation
- [ ] Admin dashboards (Super Admin, Finance, etc.)
- [ ] MFA setup flow

## 🔒 Security Best Practices

1. **MFA Enforcement**: Always check `require_mfa()` for SUPER_ADMIN
2. **Audit Everything**: Log all sensitive actions with reasons
3. **Least Privilege**: Only grant minimum necessary permissions
4. **IP Tracking**: Record IP addresses for security monitoring
5. **Data Masking**: Mask sensitive data for support agents
6. **Regular Reviews**: Periodically audit role assignments

## 📚 Key Files

- **Models**: `backend/app/db/models.py` - UserRole, PermissionScope enums
- **RBAC Logic**: `backend/app/core/rbac.py` - Permission checking
- **Super Admin API**: `backend/app/api/super_admin.py` - Dashboard endpoints
- **Migration**: `backend/migrations/add_rbac_roles.py` - DB setup

## 🎯 Kenyan Market Considerations

1. **Accountability**: All actions traceable for compliance
2. **Data Protection Act**: Compliance Officer role for GDPR-like requests
3. **University Trust**: Dedicated verifier role for Kenyan universities
4. **Local Context**: Phone number masking respects Kenyan privacy concerns
5. **Recruiter Access**: Controlled to prevent spam/misuse

## ✅ Migration Status

- ✅ Database schema updated
- ✅ Existing admin users migrated to SUPER_ADMIN
- ✅ Indexes created on role column
- ⚠️ MFA setup required for existing SUPER_ADMINs

**Current Distribution**:
- `candidate`: 1 user
- `super_admin`: 1 user

---

**Version**: 1.0.0
**Last Updated**: February 8, 2026
**Status**: Phase 1 Complete (Super Admin implemented)
