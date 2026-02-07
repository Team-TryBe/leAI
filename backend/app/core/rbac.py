"""
Role-Based Access Control (RBAC) System for Aditus
Implements fine-grained permissions with least privilege principles
Tailored for the Kenyan market with accountability and compliance features
"""

from typing import Set, Dict, List
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, UserRole, PermissionScope
from app.db.database import get_db


# ============================================================================
# ROLE-PERMISSION MATRIX
# ============================================================================

ROLE_PERMISSIONS: Dict[UserRole, Set[PermissionScope]] = {
    # ========================================================================
    # SUPER ADMIN - God Mode (MFA Required)
    # ========================================================================
    UserRole.SUPER_ADMIN: {
        # Full system access
        PermissionScope.USER_VIEW,
        PermissionScope.USER_EDIT,
        PermissionScope.USER_DELETE,
        PermissionScope.USER_IMPERSONATE,
        PermissionScope.FINANCE_VIEW,
        PermissionScope.FINANCE_RECONCILE,
        PermissionScope.FINANCE_REFUND,
        PermissionScope.FINANCE_REPORTS,
        PermissionScope.CONTENT_VIEW,
        PermissionScope.CONTENT_EDIT,
        PermissionScope.CONTENT_DELETE,
        PermissionScope.CONTENT_PUBLISH,
        PermissionScope.JOB_VIEW,
        PermissionScope.JOB_CREATE,
        PermissionScope.JOB_EDIT,
        PermissionScope.JOB_DELETE,
        PermissionScope.JOB_VERIFY,
        PermissionScope.APPLICATION_VIEW,
        PermissionScope.APPLICATION_CREATE,
        PermissionScope.APPLICATION_EDIT,
        PermissionScope.APPLICATION_DELETE,
        PermissionScope.EDUCATION_VERIFY,
        PermissionScope.EDUCATION_REVOKE,
        PermissionScope.AUDIT_VIEW,
        PermissionScope.AUDIT_EXPORT,
        PermissionScope.DATA_DELETE_COMPLIANCE,
        PermissionScope.SYSTEM_CONFIG,
        PermissionScope.SYSTEM_BAN_IP,
        PermissionScope.SYSTEM_MFA_ENFORCE,
    },
    
    # ========================================================================
    # SUPPORT AGENT - Read-Only Helper
    # Constraint: Cannot see full phone numbers/IDs unless necessary
    # ========================================================================
    UserRole.SUPPORT_AGENT: {
        PermissionScope.USER_VIEW,
        PermissionScope.USER_IMPERSONATE,  # View-as-user for debugging
        PermissionScope.FINANCE_VIEW,  # View credit history (read-only)
        PermissionScope.CONTENT_VIEW,
        PermissionScope.JOB_VIEW,
        PermissionScope.APPLICATION_VIEW,
        # CANNOT: Delete, Edit, or access sensitive financial operations
    },
    
    # ========================================================================
    # FINANCE ADMIN - Money Manager
    # Constraint: Can initiate refunds but cannot edit user profiles or view CVs
    # ========================================================================
    UserRole.FINANCE_ADMIN: {
        PermissionScope.FINANCE_VIEW,
        PermissionScope.FINANCE_RECONCILE,  # Reconcile orphaned M-Pesa payments
        PermissionScope.FINANCE_REFUND,
        PermissionScope.FINANCE_REPORTS,  # Generate revenue reports
        PermissionScope.AUDIT_VIEW,  # View financial audit logs
        # CANNOT: Access user profiles, CVs, or content management
    },
    
    # ========================================================================
    # CONTENT MANAGER - Editor
    # Constraint: No access to user data or financials
    # ========================================================================
    UserRole.CONTENT_MANAGER: {
        PermissionScope.CONTENT_VIEW,
        PermissionScope.CONTENT_EDIT,
        PermissionScope.CONTENT_DELETE,
        PermissionScope.CONTENT_PUBLISH,
        PermissionScope.JOB_VIEW,
        PermissionScope.JOB_EDIT,  # Approve/reject scraped jobs
        PermissionScope.JOB_DELETE,
        # CANNOT: Access user data, financials, or applications
    },
    
    # ========================================================================
    # COMPLIANCE OFFICER - Watchdog
    # Constraint: Can delete data only for compliance requests (Data Protection Act)
    # ========================================================================
    UserRole.COMPLIANCE_OFFICER: {
        PermissionScope.AUDIT_VIEW,
        PermissionScope.AUDIT_EXPORT,
        PermissionScope.DATA_DELETE_COMPLIANCE,  # Right to be forgotten
        PermissionScope.USER_VIEW,  # View user data for compliance requests
        # CANNOT: Edit users, access financials, or manage content
    },
    
    # ========================================================================
    # CANDIDATE - Standard User
    # ========================================================================
    UserRole.CANDIDATE: {
        PermissionScope.APPLICATION_VIEW,  # Own applications only
        PermissionScope.APPLICATION_CREATE,
        PermissionScope.APPLICATION_EDIT,
        PermissionScope.APPLICATION_DELETE,
        # CANNOT: Access other users' data or admin features
    },
    
    # ========================================================================
    # RECRUITER - Pro User
    # Constraint: Can only view applicants for their own jobs
    # ========================================================================
    UserRole.RECRUITER: {
        PermissionScope.JOB_VIEW,  # Own jobs only
        PermissionScope.JOB_CREATE,  # Post verified jobs (paid feature)
        PermissionScope.JOB_EDIT,
        PermissionScope.JOB_DELETE,
        PermissionScope.APPLICATION_VIEW,  # Applicants for their jobs only
        # CANNOT: Access full user database unless user applies
    },
    
    # ========================================================================
    # UNIVERSITY VERIFIER - Trust Layer
    # Example: UoN, Strathmore, JKUAT registrars
    # ========================================================================
    UserRole.UNIVERSITY_VERIFIER: {
        PermissionScope.EDUCATION_VERIFY,  # Verify education credentials
        PermissionScope.EDUCATION_REVOKE,  # Revoke if fraudulent
        PermissionScope.USER_VIEW,  # Limited: Only education section
        # CANNOT: Access full profile, financials, or applications
    },
}


# ============================================================================
# PERMISSION CHECKING FUNCTIONS
# ============================================================================

def has_permission(user: User, permission: PermissionScope) -> bool:
    """
    Check if a user has a specific permission based on their role.
    
    Args:
        user: User object with role attribute
        permission: Permission to check
        
    Returns:
        bool: True if user has permission, False otherwise
    """
    if not user.is_active:
        return False
    
    # Get permissions for user's role
    role_permissions = ROLE_PERMISSIONS.get(user.role, set())
    return permission in role_permissions


def require_permission(permission: PermissionScope):
    """
    Decorator to enforce permission checks on API endpoints.
    
    Usage:
        @router.get("/admin/users")
        @require_permission(PermissionScope.USER_VIEW)
        async def get_users(current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func):
        async def wrapper(*args, current_user: User = None, **kwargs):
            if current_user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {permission.value}"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


def require_mfa(user: User) -> None:
    """
    Enforce MFA requirement for SUPER_ADMIN role.
    Raises HTTPException if MFA is not enabled.
    """
    if user.role == UserRole.SUPER_ADMIN and not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Multi-Factor Authentication (MFA) is required for Super Admin access. Please enable MFA in settings."
        )


def get_user_permissions(user: User) -> List[str]:
    """
    Get list of all permissions for a user based on their role.
    Useful for frontend permission checks.
    
    Returns:
        List of permission strings (e.g., ["user:view", "user:edit"])
    """
    role_permissions = ROLE_PERMISSIONS.get(user.role, set())
    return [perm.value for perm in role_permissions]


# ============================================================================
# ROLE-SPECIFIC DEPENDENCY INJECTORS
# ============================================================================

def require_super_admin(current_user: User = Depends(lambda: None)):
    """Require SUPER_ADMIN role with MFA."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    require_mfa(current_user)
    return current_user


def require_finance_admin(current_user: User = Depends(lambda: None)):
    """Require FINANCE_ADMIN or SUPER_ADMIN role."""
    allowed_roles = {UserRole.FINANCE_ADMIN, UserRole.SUPER_ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance Admin access required"
        )
    return current_user


def require_staff(current_user: User = Depends(lambda: None)):
    """Require any internal staff role (not CANDIDATE/RECRUITER/UNIVERSITY_VERIFIER)."""
    staff_roles = {
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
        UserRole.FINANCE_ADMIN,
        UserRole.CONTENT_MANAGER,
        UserRole.COMPLIANCE_OFFICER
    }
    if current_user.role not in staff_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )
    return current_user


# ============================================================================
# AUDIT LOGGING HELPERS
# ============================================================================

async def log_sensitive_action(
    db: AsyncSession,
    user: User,
    action: str,
    target_user_id: int = None,
    details: dict = None,
    ip_address: str = None
):
    """
    Log sensitive actions for compliance and audit trails.
    Required for SUPER_ADMIN, FINANCE_ADMIN, and COMPLIANCE_OFFICER actions.
    
    Examples:
        - User deletion
        - Financial refunds
        - Data export for compliance
        - Impersonation (view-as-user)
    """
    from app.db.models import AdminActionLog
    
    log_entry = AdminActionLog(
        admin_user_id=user.id,
        action=action,
        target_user_id=target_user_id,
        details=details or {},
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
    
    db.add(log_entry)
    await db.commit()


# ============================================================================
# DATA MASKING FOR SUPPORT AGENTS
# ============================================================================

def mask_sensitive_data(data: dict, user_role: UserRole) -> dict:
    """
    Mask sensitive data based on user role.
    Support Agents cannot see full phone numbers or national IDs.
    
    Args:
        data: User data dictionary
        user_role: Role of the user accessing the data
        
    Returns:
        Masked data dictionary
    """
    if user_role == UserRole.SUPPORT_AGENT:
        # Mask phone numbers: +254712345678 -> +254*****678
        if 'phone' in data and data['phone']:
            phone = data['phone']
            data['phone'] = phone[:5] + '*' * (len(phone) - 8) + phone[-3:] if len(phone) > 8 else '*' * len(phone)
        
        # Mask national ID: 12345678 -> 12***678
        if 'national_id' in data and data['national_id']:
            nid = str(data['national_id'])
            data['national_id'] = nid[:2] + '*' * (len(nid) - 5) + nid[-3:] if len(nid) > 5 else '*' * len(nid)
    
    return data
