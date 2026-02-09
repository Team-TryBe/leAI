"""
Pydantic schemas for request/response validation and serialization.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Generic, TypeVar
from enum import Enum
from pydantic import BaseModel, EmailStr, HttpUrl, Field, constr

T = TypeVar("T")


# ============================================================================
# ENUMS
# ============================================================================

class JobApplicationStatusEnum(str, Enum):
    """Job application workflow statuses."""
    PENDING = "pending"
    EXTRACTING = "extracting"
    DRAFTING = "drafting"
    REVIEW = "review"
    SENT = "sent"
    ARCHIVED = "archived"


# ==========================================================================
# GENERIC API RESPONSE SCHEMAS
# ==========================================================================

class ApiResponse(BaseModel, Generic[T]):
    """Standard API response envelope for consistent typing."""
    success: bool = True
    data: Optional[T] = None
    error: Optional["ErrorResponse"] = None
    request_id: Optional[str] = None


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    location: Optional[str] = None
    professional_summary: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    professional_summary: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    role: Optional[str] = None
    mfa_enabled: bool = False
    is_admin: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# MASTER PROFILE SCHEMAS
# ============================================================================

class EducationItem(BaseModel):
    """Education entry in master profile."""
    institution: str
    degree: str
    field: str
    graduation_year: int
    details: Optional[str] = None


class ExperienceItem(BaseModel):
    """Work experience entry in master profile."""
    company: str
    title: str
    start_date: str  # YYYY-MM
    end_date: Optional[str] = None  # YYYY-MM or "Present"
    description: str
    skills: List[str] = []
    achievements: List[str] = []


class SkillItem(BaseModel):
    """Skill entry in master profile."""
    skill: str
    proficiency: str  # Beginner, Intermediate, Advanced, Expert
    years_of_experience: Optional[float] = None
    endorsements: int = 0


class ProjectItem(BaseModel):
    """Project entry in master profile."""
    name: str
    description: str
    technologies: List[str]
    link: Optional[HttpUrl] = None
    date: str  # YYYY-MM
    role: Optional[str] = None


class CertificationItem(BaseModel):
    """Certification entry in master profile."""
    name: str
    issuer: str
    date: str  # YYYY-MM
    credential_id: Optional[str] = None
    credential_url: Optional[HttpUrl] = None
    file_path: Optional[str] = None


class RefereeItem(BaseModel):
    """Referee entry for master profile with international phone support."""
    full_name: str = Field(..., min_length=2, max_length=120)
    designation: str = Field(..., min_length=2, max_length=120)
    organization: str = Field(..., min_length=2, max_length=150)
    country_code: Optional[str] = Field(None, description="Country code e.g., +254, +256, +255")
    phone: Optional[constr(pattern=r"^\d{9,15}$")] = Field(
        None,
        description="Phone number without country code (9-15 digits)"
    )
    email: EmailStr
    
    @property
    def full_phone(self) -> Optional[str]:
        """Return full phone number with country code."""
        if self.country_code and self.phone:
            return f"{self.country_code}{self.phone}"
        return None


class MasterProfileBase(BaseModel):
    """Base master profile schema."""
    # Personal details
    full_name: Optional[str] = None
    phone_country_code: Optional[str] = Field(None, description="Country code e.g., +254")
    phone_number: Optional[constr(pattern=r"^\d{9,15}$")] = Field(None, description="Phone digits only (9-15)")
    email: Optional[EmailStr] = None
    location: Optional[str] = None
    
    # Professional profile
    personal_statement: Optional[str] = None
    professional_summary: Optional[str] = None
    
    # Education details
    education: List[EducationItem] = []
    education_level: Optional[str] = Field(None, description="e.g., Bachelor, Master, PhD")
    field_of_study: Optional[str] = Field(None, description="e.g., Computer Science")
    
    # Experience & Skills
    experience: List[ExperienceItem] = []
    work_experience: List[Dict[str, Any]] = []
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    skills: List[SkillItem] = []
    
    # Additional sections
    projects: List[ProjectItem] = []
    certifications: List[CertificationItem] = []
    referees: List[RefereeItem] = []
    languages: List[Dict[str, str]] = Field(default=[], description="List of {language, proficiency}")
    publications: List[Dict[str, str]] = Field(default=[], description="List of publications")
    volunteer_experience: List[Dict[str, Any]] = Field(default=[], description="List of volunteer roles")
    
    # Professional links
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    github_url: Optional[str] = Field(None, description="GitHub profile URL")
    portfolio_url: Optional[str] = Field(None, description="Personal portfolio URL")
    twitter_url: Optional[str] = Field(None, description="Twitter/X profile URL")
    medium_url: Optional[str] = Field(None, description="Medium blog URL")
    
    # Career preferences
    preferred_job_titles: List[str] = []
    preferred_industries: List[str] = []
    preferred_company_sizes: List[str] = []
    preferred_locations: List[str] = []
    remote_preference: Optional[str] = Field(None, description="remote, hybrid, or on-site")


class MasterProfileUpdate(MasterProfileBase):
    """Schema for updating master profile."""
    pass


class MasterProfileResponse(MasterProfileBase):
    """Schema for master profile response."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# JOB EXTRACTION SCHEMAS
# ============================================================================

class ExtractedJobDataBase(BaseModel):
    """Base extracted job data schema."""
    company_name: str
    job_title: str
    location: str  # Required - critical field
    job_description: Optional[str] = None
    key_requirements: List[str] = []
    preferred_skills: List[str] = []
    job_level: Optional[str] = None
    employment_type: Optional[str] = None
    salary_range: Optional[str] = None
    
    # Critical deadline fields
    application_deadline: Optional[str] = None  # String format for flexibility
    application_deadline_notes: Optional[str] = None  # Additional deadline context
    
    # Critical email fields
    application_email_to: Optional[str] = None  # Primary email to send CV
    application_email_cc: Optional[str] = None  # CC emails if any
    application_method: Optional[str] = None  # Email, portal, LinkedIn, etc.
    application_url: Optional[str] = None  # Application portal link
    
    # Additional fields
    responsibilities: List[str] = []
    benefits: List[str] = []
    company_description: Optional[str] = None
    company_industry: Optional[str] = None
    company_size: Optional[str] = None


class ExtractedJobDataResponse(ExtractedJobDataBase):
    """Schema for extracted job data response."""
    id: int
    job_url: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# JOB APPLICATION SCHEMAS
# ============================================================================

class JobApplicationCreate(BaseModel):
    """Schema for creating a new job application from URL."""
    job_url: HttpUrl = Field(..., description="URL of the job posting")
    notes: Optional[str] = None


class JobApplicationUpdate(BaseModel):
    """Schema for updating job application."""
    status: Optional[JobApplicationStatusEnum] = None
    notes: Optional[str] = None
    is_submitted: Optional[bool] = None


class JobApplicationResponse(BaseModel):
    """Schema for job application response."""
    id: int
    user_id: int
    job_url: str
    status: JobApplicationStatusEnum
    
    tailored_cv: Optional[str] = None
    cover_letter: Optional[str] = None
    cold_outreach_email: Optional[str] = None
    cold_outreach_linkedin: Optional[str] = None
    
    is_submitted: bool
    submitted_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    extraction_completed_at: Optional[datetime] = None
    drafting_completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobApplicationDetailedResponse(JobApplicationResponse):
    """Detailed job application response with extracted data."""
    extracted_data: Optional[ExtractedJobDataResponse] = None


class JobApplicationCreateResponse(BaseModel):
    """Lightweight response after submitting a job URL."""
    id: int
    status: JobApplicationStatusEnum
    message: Optional[str] = None


class JobApplicationStatusResponse(BaseModel):
    """Polling response for UI status updates."""
    id: int
    status: JobApplicationStatusEnum
    extraction_completed_at: Optional[datetime] = None
    drafting_completed_at: Optional[datetime] = None
    updated_at: datetime


# ============================================================================
# APPLICATION REVIEW SCHEMAS
# ============================================================================

class ApplicationReviewCreate(BaseModel):
    """Schema for creating review feedback."""
    cv_feedback: Optional[str] = None
    cv_approved: bool = False
    
    cover_letter_feedback: Optional[str] = None
    cover_letter_approved: bool = False
    
    outreach_feedback: Optional[str] = None
    outreach_approved: bool = False


class ApplicationReviewResponse(ApplicationReviewCreate):
    """Schema for review response."""
    id: int
    job_application_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# AI GENERATION SCHEMAS
# ============================================================================

class CVGenerationRequest(BaseModel):
    """Schema for CV generation request."""
    job_application_id: int


class CVGenerationResponse(BaseModel):
    """Schema for CV generation response."""
    job_application_id: int
    cv_html: str
    status: str  # success, error
    message: Optional[str] = None


class CoverLetterGenerationRequest(BaseModel):
    """Schema for cover letter generation request."""
    job_application_id: int


class CoverLetterGenerationResponse(BaseModel):
    """Schema for cover letter generation response."""
    job_application_id: int
    cover_letter_html: str
    status: str  # success, error
    message: Optional[str] = None


class OutreachGenerationRequest(BaseModel):
    """Schema for outreach generation request."""
    job_application_id: int
    include_email: bool = True
    include_linkedin: bool = True


class OutreachGenerationResponse(BaseModel):
    """Schema for outreach generation response."""
    job_application_id: int
    email: Optional[str] = None
    linkedin_message: Optional[str] = None
    status: str  # success, error
    message: Optional[str] = None


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response schema."""
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ValidationErrorResponse(BaseModel):
    """Validation error response schema."""
    detail: List[Dict[str, Any]]
    error_code: str = "VALIDATION_ERROR"


# Rebuild forward references for generic responses
ApiResponse.model_rebuild()
