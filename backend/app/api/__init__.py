"""API package for Aditus."""
# Import routers here so they can be easily accessed
from . import (
    auth, users, master_profile, admin, job_extractor, cv_personalizer,
    cv_drafter, cover_letter, applications, subscriptions, payments,
    super_admin, referral, provider_admin
)

__all__ = [
    "auth", "users", "master_profile", "admin", "job_extractor",
    "cv_personalizer", "cv_drafter", "cover_letter", "applications",
    "subscriptions", "payments", "super_admin", "referral", "provider_admin"
]