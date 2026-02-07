"""
Helper utilities for validating master profile completeness.
"""

from app.db.models import MasterProfile


def is_master_profile_complete(profile: MasterProfile) -> tuple[bool, list[str]]:
    """
    Check if master profile has minimum required fields to start job applications.
    
    Returns:
        tuple: (is_complete: bool, missing_fields: list[str])
    """
    missing_fields = []
    
    # Essential personal details
    if not profile.full_name or not profile.full_name.strip():
        missing_fields.append("Full Name")
    
    if not profile.email or not profile.email.strip():
        missing_fields.append("Email")
    
    if not profile.phone_number or not profile.phone_number.strip():
        missing_fields.append("Phone Number")
    
    if not profile.location or not profile.location.strip():
        missing_fields.append("Location")
    
    # Professional summary or personal statement
    if not profile.personal_statement or not profile.personal_statement.strip():
        if not profile.professional_summary or not profile.professional_summary.strip():
            missing_fields.append("Personal Statement or Professional Summary")
    
    # At least one education entry
    if not profile.education or len(profile.education) == 0:
        missing_fields.append("Education (at least one entry)")
    
    # At least one work experience OR one project
    has_experience = profile.experience and len(profile.experience) > 0
    has_work_experience = profile.work_experience and len(profile.work_experience) > 0
    has_projects = profile.projects and len(profile.projects) > 0
    
    if not (has_experience or has_work_experience or has_projects):
        missing_fields.append("Work Experience or Projects (at least one entry)")
    
    # At least some skills
    has_technical_skills = profile.technical_skills and len(profile.technical_skills) > 0
    has_skills = profile.skills and len(profile.skills) > 0
    
    if not (has_technical_skills or has_skills):
        missing_fields.append("Skills (at least one)")
    
    is_complete = len(missing_fields) == 0
    return is_complete, missing_fields
