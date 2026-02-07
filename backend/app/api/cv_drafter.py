"""
CV Drafting API - Generates ATS-optimized CVs tailored to specific job descriptions
Specialized for the Kenyan job market with local context awareness
"""

import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from google import genai

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import MasterProfile, ExtractedJobData, User
from app.schemas import ApiResponse
from app.api.users import get_current_user


router = APIRouter(prefix="/cv-drafter", tags=["cv-drafter"])
settings = get_settings()
logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class CVDraftRequest(BaseModel):
    """Request to draft a CV for a specific job."""
    job_id: int


class CVSection(BaseModel):
    """A structured section of the CV."""
    section_name: str
    content: str
    order: int


class ContactInfo(BaseModel):
    """Contact information for the drafted CV."""
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    other_links: list[str] = []
    
    class Config:
        from_attributes = True


class CVDraftResponse(BaseModel):
    """The drafted CV with structured sections."""
    full_name: str
    contact_info: ContactInfo
    professional_summary: str
    experience: list[Dict[str, Any]] = []
    education: list[Dict[str, Any]] = []
    skills: list[str] = []
    certifications: list[Dict[str, str]] = []
    projects: list[Dict[str, Any]] = []
    referees: list[Dict[str, str]] = []
    languages: list[Dict[str, str]] = []
    
    # Metadata
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    page_count: int = 1
    word_count: int = 0
    
    class Config:
        from_attributes = True


# ============================================================================
# CV DRAFTING PROMPT
# ============================================================================

CV_DRAFTING_PROMPT = """Act as a Senior Career Consultant specialized in the Kenyan job market.

**Inputs:**

Master CV Data:
{master_cv}

Job Description:
Title: {job_title}
Company: {company_name}
Location: {location}
Requirements: {requirements}
Preferred Skills: {preferred_skills}
Responsibilities: {responsibilities}
Job Level: {job_level}
Employment Type: {employment_type}

**Goal:**
Draft a 1-page, ATS-optimized CV tailored specifically to this job description for a Kenyan job market.

**Critical Rules:**

1. **Tone**: Professional and achievement-oriented. Use active verbs (Led, Developed, Spearheaded).

2. **Formatting**: 
   - Use clear section headers
   - Apply STAR method for experience bullets (Situation-Task-Action-Result)
   - Quantify achievements with numbers and percentages
   - Keep bullets concise (1-2 lines max)

3. **Kenyan Local Context**:
   - Preserve Kenyan education standards (KCSE results, Degree honors like "Second Class Upper")
   - Include professional bodies (ICPAK for accountants, EBK for engineers, LSK for lawyers, etc.)
   - Use local phone format (+254...)
   - Include at least 3 referees with full contact details
   - Respect Kenyan CV conventions (1-2 pages strictly)

4. **Links and Online Presence**:
   - ALWAYS include social links (LinkedIn, GitHub, Portfolio) if available in the master CV
   - Format links clearly and make them prominent in the contact section
   - For projects, ALWAYS include working links for proof/demos if available
   - For certifications, ALWAYS include credential links if available (for verification/proof)
   - Use full URLs, not shortened links (for ATS compatibility)
   - Ensure all links are valid and clickable

5. **ATS Optimization**:
   - Mirror keywords from the job description
   - Front-load important skills in the professional summary
   - Use standard section headers (Professional Experience, Education, Skills)
   - Avoid tables, graphics, or complex formatting

6. **Content Integrity**:
   - DO NOT hallucinate experiences or skills
   - If a skill gap exists, highlight transferable skills instead
   - Keep dates accurate
   - Maintain truthfulness
   - Include real links from master profile (do not invent URLs)

7. **Prioritization**:
   - Put most relevant experience first
   - Emphasize achievements that match JD requirements
   - De-emphasize or omit irrelevant roles if space is limited

**Output Format:**
Return ONLY a valid JSON object with this exact structure:

{{
  "full_name": "string",
  "contact_info": {{
    "email": "string",
    "phone": "string (in +254 format)",
    "location": "string",
    "linkedin": "string (full URL, e.g., https://linkedin.com/in/username)",
    "github": "string (full URL, e.g., https://github.com/username)",
    "portfolio": "string (full URL, e.g., https://yoursite.com)",
    "other_links": ["string (any other relevant professional links)"]
  }},
  "professional_summary": "string (3-4 sentences max, front-loaded with key skills)",
  "experience": [
    {{
      "company": "string",
      "position": "string",
      "duration": "string (e.g., Jan 2022 - Present)",
      "location": "string",
      "achievements": [
        "string (STAR format with quantification)",
        "string"
      ]
    }}
  ],
  "education": [
    {{
      "institution": "string",
      "degree": "string (e.g., Bachelor of Science)",
      "field": "string",
      "honors": "string (e.g., Second Class Upper, First Class)",
      "graduation_year": "string",
      "relevant_units": ["string"] (optional, for recent graduates)
    }}
  ],
  "skills": [
    "string (prioritize JD-matching skills first)"
  ],
  "certifications": [
    {{
      "name": "string",
      "issuer": "string",
      "date": "string",
      "credential_id": "string (optional)",
      "credential_url": "string (FULL URL for credential verification if available, e.g., https://verify.credly.com/...)"
    }}
  ],
  "projects": [
    {{
      "name": "string",
      "description": "string (1-2 sentences, achievement-focused)",
      "technologies": ["string"],
      "link": "string (FULL URL for live demo/repo - ALWAYS include if available)",
      "github_repo": "string (GitHub repository URL if different from link)"
    }}
  ],
  "referees": [
    {{
      "name": "string",
      "title": "string",
      "organization": "string",
      "email": "string",
      "phone": "string (in +254 format)"
    }}
  ],
  "languages": [
    {{
      "language": "string (e.g., English, Swahili)",
      "proficiency": "string (e.g., Fluent, Native)"
    }}
  ]
}}

**Important**: 
- Ensure the CV fits on 1 page (max 2 if absolutely necessary)
- Total word count should be 400-600 words
- Return ONLY the JSON, no markdown formatting or additional text
"""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def prepare_master_cv_context(profile: MasterProfile) -> Dict[str, Any]:
    """Convert MasterProfile to a structured context for the AI."""
    
    # Prepare social links (COMPULSORY - at least one must be present)
    social_links = []
    if profile.linkedin_url:
        social_links.append(f"LinkedIn: {profile.linkedin_url}")
    if profile.github_url:
        social_links.append(f"GitHub: {profile.github_url}")
    if profile.portfolio_url:
        social_links.append(f"Portfolio: {profile.portfolio_url}")
    if profile.twitter_url:
        social_links.append(f"Twitter: {profile.twitter_url}")
    if profile.medium_url:
        social_links.append(f"Medium: {profile.medium_url}")
    
    return {
        "full_name": profile.full_name or "Not provided",
        "email": profile.email or "Not provided",
        "phone": f"{profile.phone_country_code or ''}{profile.phone_number or ''}",
        "location": profile.location or "Kenya",
        "professional_summary": profile.professional_summary or profile.personal_statement or "",
        "education": profile.education or [],
        "education_level": profile.education_level or "Not specified",
        "field_of_study": profile.field_of_study or "Not specified",
        "experience": profile.work_experience or profile.experience or [],
        "technical_skills": profile.technical_skills or [],
        "soft_skills": profile.soft_skills or [],
        "skills": profile.skills or [],
        "projects": profile.projects or [],
        "certifications": profile.certifications or [],
        "referees": profile.referees or [],
        "languages": profile.languages or [{"language": "English", "proficiency": "Fluent"}],
        "linkedin_url": profile.linkedin_url,
        "github_url": profile.github_url,
        "portfolio_url": profile.portfolio_url,
        "twitter_url": profile.twitter_url,
        "medium_url": profile.medium_url,
        "social_links": social_links,  # Explicit list of social links for emphasis
    }


def extract_json_from_response(text: str) -> dict:
    """Extract JSON from AI response, handling markdown formatting."""
    # Try to find JSON block in markdown
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()
    
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse AI response as JSON"
        )


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/draft", response_model=ApiResponse[CVDraftResponse])
async def draft_cv(
    request: CVDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Draft an ATS-optimized CV tailored to a specific job description.
    
    Uses AI to create a structured CV that:
    - Matches job requirements
    - Follows Kenyan CV conventions
    - Is ATS-optimized
    - Highlights relevant achievements
    - Fits on 1-2 pages
    """
    
    # Load job data
    result = await db.execute(
        select(ExtractedJobData).where(ExtractedJobData.id == request.job_id)
    )
    job_data = result.scalar_one_or_none()
    
    if not job_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Load user's master profile
    result = await db.execute(
        select(MasterProfile).where(MasterProfile.user_id == current_user.id)
    )
    master_profile = result.scalar_one_or_none()
    
    if not master_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master profile not found. Please create your profile first."
        )
    
    # Prepare context
    master_cv_context = prepare_master_cv_context(master_profile)
    
    # Build the prompt
    prompt = CV_DRAFTING_PROMPT.format(
        master_cv=json.dumps(master_cv_context, indent=2),
        job_title=job_data.job_title,
        company_name=job_data.company_name,
        location=job_data.location or "Kenya",
        requirements=", ".join(job_data.key_requirements or []),
        preferred_skills=", ".join(job_data.preferred_skills or []),
        responsibilities=", ".join(job_data.responsibilities or []),
        job_level=job_data.job_level or "Not specified",
        employment_type=job_data.employment_type or "Full-time"
    )
    
    # Call Gemini AI
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt
        )
        
        # Parse the response
        cv_data = extract_json_from_response(response.text)
        
        # Calculate metadata
        total_text = json.dumps(cv_data)
        word_count = len(total_text.split())
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to draft CV: {error_msg}")
        
        # Check for quota/rate limit errors
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI service quota exceeded. Please try again later or contact support to upgrade your plan."
            )
        elif "401" in error_msg or "UNAUTHENTICATED" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service authentication failed. Please contact support."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to draft CV: {error_msg}"
            )
        
        # Estimate page count (rough: 400-500 words per page)
        page_count = max(1, (word_count // 450) + (1 if word_count % 450 > 0 else 0))
        
        # Add metadata
        cv_data["job_title"] = job_data.job_title
        cv_data["company_name"] = job_data.company_name
        cv_data["page_count"] = page_count
        cv_data["word_count"] = word_count
        
        return ApiResponse(
            success=True,
            message="CV drafted successfully",
            data=CVDraftResponse(**cv_data)
        )
        
    except Exception as e:
        print(f"❌ CV Drafting error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to draft CV: {str(e)}"
        )
