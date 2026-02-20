"""
Database models for Aditus Career Workflow Agent.
Uses SQLAlchemy with async support and PostgreSQL.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Enum as SQLEnum, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# ============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC) ENUMS
# ============================================================================

class UserRole(str, Enum):
    """
    Role-Based Access Control (RBAC) for Aditus Platform.
    Designed for the Kenyan market with accountability and least privilege principles.
    """
    # Internal Roles (Aditus Team)
    SUPER_ADMIN = "super_admin"  # God mode: Full system access, requires MFA
    SUPPORT_AGENT = "support_agent"  # Read-only helper, can view-as-user for debugging
    FINANCE_ADMIN = "finance_admin"  # Money manager: M-Pesa logs, reconciliation, reports
    CONTENT_MANAGER = "content_manager"  # Editor: Manage jobs, blog, career tips
    COMPLIANCE_OFFICER = "compliance_officer"  # Watchdog: Audit logs, GDPR/Data Protection Act
    
    # External Roles (Users & Partners)
    CANDIDATE = "candidate"  # Standard user: Create profile, generate CVs, apply
    RECRUITER = "recruiter"  # Pro: Post verified jobs, view applicants for their jobs
    UNIVERSITY_VERIFIER = "university_verifier"  # Trust layer: Verify education credentials


class PermissionScope(str, Enum):
    """Fine-grained permission scopes for RBAC enforcement."""
    # User Management
    USER_VIEW = "user:view"
    USER_EDIT = "user:edit"
    USER_DELETE = "user:delete"
    USER_IMPERSONATE = "user:impersonate"  # View-as-user for debugging
    
    # Financial Operations
    FINANCE_VIEW = "finance:view"
    FINANCE_RECONCILE = "finance:reconcile"
    FINANCE_REFUND = "finance:refund"
    FINANCE_REPORTS = "finance:reports"
    
    # Content Management
    CONTENT_VIEW = "content:view"
    CONTENT_EDIT = "content:edit"
    CONTENT_DELETE = "content:delete"
    CONTENT_PUBLISH = "content:publish"
    
    # Job Management
    JOB_VIEW = "job:view"
    JOB_CREATE = "job:create"
    JOB_EDIT = "job:edit"
    JOB_DELETE = "job:delete"
    JOB_VERIFY = "job:verify"  # Mark jobs as verified
    
    # Application Management
    APPLICATION_VIEW = "application:view"
    APPLICATION_CREATE = "application:create"
    APPLICATION_EDIT = "application:edit"
    APPLICATION_DELETE = "application:delete"
    
    # Education Verification
    EDUCATION_VERIFY = "education:verify"
    EDUCATION_REVOKE = "education:revoke"
    
    # Compliance & Audit
    AUDIT_VIEW = "audit:view"
    AUDIT_EXPORT = "audit:export"
    DATA_DELETE_COMPLIANCE = "data:delete_compliance"  # Right to be forgotten
    
    # System Administration
    SYSTEM_CONFIG = "system:config"
    SYSTEM_BAN_IP = "system:ban_ip"
    SYSTEM_MFA_ENFORCE = "system:mfa_enforce"


# ============================================================================
# APPLICATION STATUS ENUMS
# ============================================================================

class JobApplicationStatus(str, Enum):
    """Workflow statuses for job applications."""
    PENDING = "pending"
    EXTRACTING = "extracting"
    DRAFTING = "drafting"
    REVIEW = "review"
    SENT = "sent"
    WAITING_RESPONSE = "waiting_response"
    FEEDBACK_RECEIVED = "feedback_received"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    OFFER_NEGOTIATION = "offer_negotiation"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class TransactionStatus(str, Enum):
    """M-Pesa transaction statuses."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class User(Base):
    """User model for storing master career profiles."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    location = Column(String(255), nullable=True)  # Kenya-based
    professional_summary = Column(Text, nullable=True)
    
    # Role-Based Access Control
    role = Column(
        SQLEnum(
            UserRole,
            name="user_role",
            values_callable=lambda enum: [e.value for e in enum],
        ),
        default=UserRole.CANDIDATE,
        nullable=False,
        index=True,
    )
    mfa_enabled = Column(Boolean, default=False, nullable=False)  # Required for SUPER_ADMIN
    mfa_secret = Column(String(255), nullable=True)  # TOTP secret (encrypted)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(45), nullable=True)  # IPv4 or IPv6
    
    # Legacy admin flag (deprecated, use role instead)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    paygo_credits = Column(Integer, default=0, nullable=False)  # Pay-as-you-go application credits
    
    # Gmail OAuth2 Tokens (encrypted)
    gmail_refresh_token = Column(Text, nullable=True)  # Encrypted refresh token
    gmail_access_token = Column(Text, nullable=True)  # Encrypted access token
    gmail_token_expires_at = Column(DateTime, nullable=True)  # Token expiry timestamp
    gmail_connected = Column(Boolean, default=False, nullable=False)  # Flag to indicate if Gmail is connected

    # Auth & Verification
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verification_token_hash = Column(String(255), nullable=True, unique=True)
    email_verification_sent_at = Column(DateTime, nullable=True)
    password_reset_token_hash = Column(String(255), nullable=True, unique=True)
    password_reset_sent_at = Column(DateTime, nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    google_sub = Column(String(255), nullable=True, unique=True)
    
    # Referral System (Give 1, Get 1)
    referral_code = Column(String(8), unique=True, nullable=False, index=True)  # Unique code for sharing
    referred_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # User who referred this user
    referral_credits = Column(Integer, default=0, nullable=False)  # Free application credits earned via referrals
    has_earned_referral_reward = Column(Boolean, default=False, nullable=False)  # Can only earn once in lifetime
    referral_reward_earned_at = Column(DateTime, nullable=True)  # When the reward was earned
    signup_ip = Column(String(45), nullable=True)  # IP at signup time (for fraud detection)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    master_profile = relationship("MasterProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")
    admin_actions = relationship("AdminActionLog", back_populates="admin_user", cascade="all, delete-orphan")
    referred_users = relationship("User", foreign_keys=[referred_by], remote_side=[id], backref="referrer")


class MasterProfile(Base):
    """Master career profile used to tailor CVs and applications."""
    __tablename__ = "master_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Personal details
    full_name = Column(String(255), nullable=True)
    phone_country_code = Column(String(10), nullable=True)
    phone_number = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    
    # Professional profile
    personal_statement = Column(Text, nullable=True)
    professional_summary = Column(Text, nullable=True)
    
    # Education details
    education = Column(JSON, default=list)  # List of {institution, degree, field, graduation_year}
    education_level = Column(String(100), nullable=True)  # e.g., "Bachelor", "Master", "PhD"
    field_of_study = Column(String(255), nullable=True)  # e.g., "Computer Science"
    
    # Experience & Skills
    experience = Column(JSON, default=list)  # List of {company, title, duration, description, skills}
    work_experience = Column(JSON, default=list)  # Structured work history
    technical_skills = Column(JSON, default=list)  # List of technical skills
    soft_skills = Column(JSON, default=list)  # List of soft skills
    skills = Column(JSON, default=list)  # List of {skill, proficiency, endorsements}
    
    # Additional sections
    projects = Column(JSON, default=list)  # List of {name, description, technologies, link, date}
    certifications = Column(JSON, default=list)  # List of {name, issuer, date, credential_id}
    referees = Column(JSON, default=list)  # List of {name, title, company, email, phone}
    languages = Column(JSON, default=list)  # List of {language, proficiency}
    publications = Column(JSON, default=list)  # List of publications/articles
    volunteer_experience = Column(JSON, default=list)  # List of volunteer roles
    
    # Professional links
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    twitter_url = Column(String(500), nullable=True)
    medium_url = Column(String(500), nullable=True)
    
    # Career preferences
    preferred_job_titles = Column(JSON, default=list)
    preferred_industries = Column(JSON, default=list)
    preferred_company_sizes = Column(JSON, default=list)
    preferred_locations = Column(JSON, default=list)
    remote_preference = Column(String(50), nullable=True)  # "remote", "hybrid", "on-site"
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="master_profile")


class ExtractedJobData(Base):
    """Structured data extracted from job postings via LLM."""
    __tablename__ = "extracted_job_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_url = Column(String(500), nullable=False)
    
    # Core job information (required)
    company_name = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)  # REQUIRED - critical field
    
    # Job details
    job_description = Column(Text, nullable=True)
    key_requirements = Column(JSON, default=list)  # List of requirement strings
    preferred_skills = Column(JSON, default=list)  # List of skill strings
    job_level = Column(String(100), nullable=True)  # e.g., Junior, Senior, Lead
    employment_type = Column(String(100), nullable=True)  # e.g., Full-time, Contract
    salary_range = Column(String(255), nullable=True)  # e.g., "80k - 120k KES/month"
    
    # CRITICAL: Deadline fields
    application_deadline = Column(String(255), nullable=True)  # String for flexibility (YYYY-MM-DD or original text)
    application_deadline_notes = Column(Text, nullable=True)  # Additional context: "Closes Friday 5PM", etc.
    
    # CRITICAL: Application contact fields
    application_email_to = Column(String(255), nullable=True)  # Primary email to send CV
    application_email_cc = Column(String(255), nullable=True)  # CC emails if any
    application_method = Column(String(100), nullable=True)  # Email, Online portal, LinkedIn, WhatsApp, etc.
    application_url = Column(String(500), nullable=True)  # Application portal link
    
    # Additional job info
    responsibilities = Column(JSON, default=list)  # List of responsibilities
    benefits = Column(JSON, default=list)  # List of benefits
    company_description = Column(Text, nullable=True)
    company_industry = Column(String(255), nullable=True)
    company_size = Column(String(100), nullable=True)  # e.g., Startup, SME, Large Enterprise
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job_applications = relationship("JobApplication", back_populates="extracted_data")


class JobApplication(Base):
    """Main workflow entity tracking the entire application process."""
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    extracted_data_id = Column(Integer, ForeignKey("extracted_job_data.id"), nullable=True)
    
    # Application metadata
    job_url = Column(String(500), nullable=False)
    status = Column(SQLEnum(JobApplicationStatus), default=JobApplicationStatus.PENDING, nullable=False, index=True)
    
    # Generated materials
    tailored_cv = Column(Text, nullable=True)  # HTML content for PDF conversion
    tailored_cv_pdf_path = Column(String(500), nullable=True)  # Path to generated PDF
    cover_letter = Column(Text, nullable=True)  # HTML content for PDF conversion
    cover_letter_pdf_path = Column(String(500), nullable=True)
    cold_outreach_email = Column(Text, nullable=True)
    cold_outreach_linkedin = Column(Text, nullable=True)
    
    # Application tracking
    is_submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Processing info
    error_message = Column(Text, nullable=True)
    extraction_attempts = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    extraction_completed_at = Column(DateTime, nullable=True)
    drafting_completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="job_applications")
    extracted_data = relationship("ExtractedJobData", back_populates="job_applications")


class ApplicationReview(Base):
    """Review feedback for generated application materials."""
    __tablename__ = "application_reviews"

    id = Column(Integer, primary_key=True, index=True)
    job_application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False, index=True)
    
    cv_feedback = Column(Text, nullable=True)
    cv_approved = Column(Boolean, default=False)
    
    cover_letter_feedback = Column(Text, nullable=True)
    cover_letter_approved = Column(Boolean, default=False)
    
    outreach_feedback = Column(Text, nullable=True)
    outreach_approved = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ProcessingLog(Base):
    """Audit trail for background task processing."""
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    job_application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=False, index=True)
    
    task_type = Column(String(100), nullable=False)  # e.g., extraction, cv_generation, letter_generation
    status = Column(String(50), nullable=False)  # started, completed, failed
    error = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AdminActionLog(Base):
    """Audit trail for critical admin actions."""
    __tablename__ = "admin_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    action = Column(String(150), nullable=False)  # e.g., "toggle_admin", "delete_user"
    target_type = Column(String(100), nullable=True)  # e.g., "user", "subscription"
    target_id = Column(Integer, nullable=True)
    details = Column(JSON, default=dict)

    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    admin_user = relationship("User", back_populates="admin_actions")


class PlanType(str, Enum):
    """Subscription plan types."""
    FREEMIUM = "freemium"
    PAY_AS_YOU_GO = "paygo"
    PRO_MONTHLY = "pro"
    PRO_ANNUAL = "annual"


class Plan(Base):
    """Subscription plan definitions."""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_type = Column(SQLEnum(PlanType), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    price = Column(Integer, nullable=False)  # Price in KES (cents)
    period = Column(String(50), nullable=False)  # e.g., "monthly", "annual", "per_application"
    description = Column(Text, nullable=True)
    features = Column(JSON, default=list)  # List of feature strings
    max_applications = Column(Integer, nullable=True)  # NULL = unlimited
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")


class SubscriptionStatus(str, Enum):
    """Subscription status values."""
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"


class Subscription(Base):
    """User subscription tracking."""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    current_period_start = Column(DateTime, default=datetime.utcnow, nullable=False)
    current_period_end = Column(DateTime, nullable=True)  # Next billing date
    cancelled_at = Column(DateTime, nullable=True)
    
    auto_renew = Column(Boolean, default=True, nullable=False)
    cancellation_requested = Column(Boolean, default=False, nullable=False)
    
    # Payment tracking
    total_paid = Column(Integer, default=0, nullable=False)  # Total amount paid in KES (cents)
    payment_method = Column(String(100), nullable=True)  # e.g., "m-pesa", "credit_card"
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    plan = relationship("Plan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription", cascade="all, delete-orphan")


class PaymentStatus(str, Enum):
    """Payment status values."""
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    """Payment transaction tracking."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False, index=True)
    
    amount = Column(Integer, nullable=False)  # Amount in KES (cents)
    currency = Column(String(10), default="KES", nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    
    # Payment provider info
    payment_provider = Column(String(100), nullable=True)  # e.g., "mpesa", "stripe"
    transaction_id = Column(String(255), nullable=True, unique=True)
    payment_method = Column(String(100), nullable=True)
    
    paid_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payment", uselist=False)


class Invoice(Base):
    """Invoice generation and tracking."""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True, unique=True)
    
    invoice_number = Column(String(100), unique=True, nullable=False)
    amount = Column(Integer, nullable=False)  # Amount in KES (cents)
    
    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    
    pdf_path = Column(String(500), nullable=True)  # Path to generated PDF
    download_token = Column(String(255), unique=True, nullable=True)  # Secure download token
    
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    subscription = relationship("Subscription", back_populates="invoices")
    payment = relationship("Payment", back_populates="invoice")


class Transaction(Base):
    """M-Pesa payment transactions for tracking STK Push payments."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # M-Pesa identifiers
    merchant_request_id = Column(String(100), nullable=True, index=True)  # From Safaricom response
    checkout_request_id = Column(String(100), unique=True, nullable=False, index=True)  # Unique callback ID
    mpesa_receipt_number = Column(String(100), nullable=True, unique=True, index=True)  # M-Pesa confirmation code
    
    # Transaction details
    amount = Column(Integer, nullable=False)  # Amount in KES
    phone_number = Column(String(20), nullable=False)  # Format: 254XXXXXXXXX
    account_reference = Column(String(100), nullable=True)  # Plan type or reference
    transaction_desc = Column(String(255), nullable=True)  # Payment description
    
    # Status tracking
    status = Column(SQLEnum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False, index=True)
    result_code = Column(Integer, nullable=True)  # M-Pesa result code (0 = success)
    result_desc = Column(Text, nullable=True)  # M-Pesa result description
    
    # Metadata
    callback_payload = Column(JSON, nullable=True)  # Full callback data for debugging
    initiated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)  # When payment was confirmed
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="transactions")

class ReferralTransaction(Base):
    """Referral tracking table for "Give 1, Get 1" system."""
    __tablename__ = "referral_transactions"

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # User who shared code
    referred_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # New user
    
    # Status tracking
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, COMPLETED
    
    # Metadata
    referral_code = Column(String(8), nullable=False, index=True)  # Code used
    signup_ip = Column(String(45), nullable=True)  # IP address of referred user signup
    verified_at = Column(DateTime, nullable=True)  # When referred user verified email
    reward_granted_at = Column(DateTime, nullable=True)  # When referrer got the credit
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    referrer = relationship("User", foreign_keys=[referrer_id], backref="referrals_given")
    referred_user = relationship("User", foreign_keys=[referred_user_id], backref="referrals_received")


# ============================================================================
# AI PROVIDER CONFIGURATION
# ============================================================================

class AIProviderType(str, Enum):
    """Supported AI providers."""
    GEMINI = "gemini"
    OPENAI = "openai"
    CLAUDE = "claude"


class AIProviderConfig(Base):
    """AI provider configuration and credentials (encrypted)."""
    __tablename__ = "ai_provider_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider_type = Column(SQLEnum(AIProviderType), nullable=False, index=True)
    
    # Provider-specific details
    api_key_encrypted = Column(Text, nullable=False)  # Encrypted with Fernet
    model_name = Column(String(255), nullable=False)  # e.g., "gpt-4o-mini", "claude-3-5-sonnet-20241022"
    
    # Configuration
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_default = Column(Boolean, default=False, nullable=False)  # Only one default per type
    
    # Task-specific routing
    default_for_extraction = Column(Boolean, default=False, nullable=False)
    default_for_cv_draft = Column(Boolean, default=False, nullable=False)
    default_for_cover_letter = Column(Boolean, default=False, nullable=False)
    default_for_validation = Column(Boolean, default=False, nullable=False)
    
    # Metadata
    display_name = Column(String(255), nullable=True)  # e.g., "GPT-4 Standard"
    description = Column(Text, nullable=True)
    
    # Usage limits (optional)
    daily_token_limit = Column(Integer, nullable=True)  # None = unlimited
    monthly_token_limit = Column(Integer, nullable=True)
    
    # Status
    last_tested_at = Column(DateTime, nullable=True)
    last_test_success = Column(Boolean, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], backref="provider_configs_created")


class AIProviderUsageLog(Base):
    """Log AI provider API calls for monitoring and cost tracking."""
    __tablename__ = "ai_provider_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider_config_id = Column(Integer, ForeignKey("ai_provider_configs.id"), nullable=False, index=True)
    
    # Task information
    task_type = Column(String(50), nullable=False)  # extraction, cv_draft, cover_letter, validation
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    
    # Cost tracking
    estimated_cost_usd = Column(Integer, nullable=True, default=0)  # In cents
    
    # Status
    status = Column(String(20), default="success")  # success, error, timeout
    error_message = Column(Text, nullable=True)
    
    # Timing
    latency_ms = Column(Integer, nullable=True)  # Response time in milliseconds
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", backref="provider_usage_logs")
    provider_config = relationship("AIProviderConfig", backref="usage_logs")


class AICache(Base):
    """
    Intelligent cache storage for AI operations.
    
    Supports three-tier caching:
    1. System Cache: Permanent, shared (CV rules, formatting templates)
    2. Session Cache: 30-120 min TTL, per-user (job descriptions, profiles)
    3. Content Cache: Task-specific TTL, per-user (generated CVs, cover letters)
    
    Plan-based TTL:
    - Free: No caching
    - Pro Monthly: 30-60 min TTL
    - Pro Annual: 60-120 min TTL
    - Enterprise: 120-240 min TTL
    """
    __tablename__ = "ai_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(255), nullable=False, index=True)
    cache_type = Column(String(50), nullable=False)  # system, session, content, extraction
    cache_data = Column(Text, nullable=False)  # JSON-serialized data
    
    # Optional user association (None for system caches)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Expiration (None = never expires, for system caches)
    expires_at = Column(DateTime, nullable=True, index=True)
    
    # Metadata for tracking and analysis (renamed to avoid SQLAlchemy conflict)
    cache_metadata = Column(JSON, default={}, nullable=True)
    
    # Access tracking for metrics
    access_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    last_accessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", backref="cache_entries")


# ============================================================================
# PAYSTACK PAYMENT & BILLING MODELS
# ============================================================================

class PaystackPayment(Base):
    """
    Paystack payment records for subscription purchases.
    
    Tracks all payment attempts via Paystack (M-Pesa, Card, etc).
    Each payment is linked to a plan and user.
    """
    __tablename__ = "paystack_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User Reference
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Payment Details
    reference = Column(String(255), nullable=False, unique=True, index=True)  # Paystack reference
    access_code = Column(String(255), nullable=True)  # Access code from Paystack
    authorization_url = Column(Text, nullable=True)  # Checkout URL
    
    # Amount Information
    amount = Column(Integer, nullable=False)  # In KES cents (e.g., 9900 = 99.00)
    currency = Column(String(3), default="KES", nullable=False)
    
    # Payment Method
    payment_method = Column(String(50), nullable=True)  # mpesa, card, bank_transfer
    payer_phone = Column(String(20), nullable=True)  # M-Pesa phone (07xxxxxxxx)
    
    # Status Tracking
    status = Column(String(50), nullable=False, default="pending", index=True)
    failure_reason = Column(Text, nullable=True)
    
    # Linked Records
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    
    # Metadata (renamed to avoid SQLAlchemy conflict)
    payment_metadata = Column(JSON, default={}, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    initiated_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)  # Payment expires after 24h
    
    # Relationships
    user = relationship("User", backref="paystack_payments")
    plan = relationship("Plan", backref="paystack_payment_records")


class PaystackTransaction(Base):
    """
    Detailed transaction records for each Paystack payment.
    
    Stores Paystack's complete response for audit trail and debugging.
    One payment can have multiple transaction attempts.
    """
    __tablename__ = "paystack_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Payment Reference
    paystack_payment_id = Column(Integer, ForeignKey("paystack_payments.id"), nullable=False, index=True)
    
    # Transaction Details
    transaction_id = Column(String(255), nullable=True)  # Paystack transaction ID
    receipt_number = Column(String(255), nullable=True)  # M-Pesa receipt/reference
    
    # Status
    status = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    
    # Timing
    timestamp = Column(DateTime, nullable=True)
    
    # Raw Response (Full Paystack response for debugging)
    raw_response = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    paystack_payment = relationship("PaystackPayment", backref="transactions")


class PaystackLog(Base):
    """
    Audit log for Paystack payment operations.
    
    Tracks all payment events: initialization, verification, webhook receipt, etc.
    Used for debugging and compliance.
    """
    __tablename__ = "paystack_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Payment Reference
    paystack_payment_id = Column(Integer, ForeignKey("paystack_payments.id"), nullable=True, index=True)
    
    # Event Information
    event_type = Column(String(50), nullable=False, index=True)
    message = Column(Text, nullable=True)
    
    # Technical Details
    request_data = Column(JSON, nullable=True)
    response_data = Column(JSON, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    paystack_payment = relationship("PaystackPayment", backref="logs")
