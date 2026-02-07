"""
Cover Letter Generator API - Creates personalized cover letters for Kenyan job applications
Tailored to specific job requirements and company culture
"""

import json
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


router = APIRouter(prefix="/cover-letter", tags=["cover-letter"])
settings = get_settings()

client = genai.Client(api_key=settings.GEMINI_API_KEY)


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class CoverLetterRequest(BaseModel):
    """Request to generate a cover letter for a specific job."""
    job_id: int
    tone: Optional[str] = "professional"  # professional, enthusiastic, formal


class CoverLetterResponse(BaseModel):
    """The generated cover letter."""
    content: str
    word_count: int
    structure: Dict[str, str]  # {opening, body_1, body_2, body_3, closing}
    key_points: list[str]
    job_title: str
    company_name: str


# ============================================================================
# COVER LETTER GENERATION PROMPT
# ============================================================================

COVER_LETTER_PROMPT = """Act as a Senior Career Consultant specialized in the Kenyan job market.

**Inputs:**

Master Profile Data:
{master_profile}

Job Posting Details:
Title: {job_title}
Company: {company_name}
Location: {location}
Requirements: {requirements}
Responsibilities: {responsibilities}
Company Description: {company_description}
Job Level: {job_level}
Employment Type: {employment_type}
Application Email: {application_email}
Application Deadline: {deadline}

**Goal:**
Write a compelling, professional cover letter for a Kenyan job application that:
- Demonstrates genuine interest in the role and company
- Highlights relevant experience and achievements
- Shows cultural fit with Kenyan workplace norms
- Addresses key job requirements
- Is concise (250-400 words)

**Critical Rules:**

1. **Structure** (DO NOT DUPLICATE):
   - Opening: "Dear Hiring Manager," (ONLY ONCE at start)
   - Introduction: State the position and express enthusiasm (in first paragraph only)
   - Body Paragraphs (2-3): Match experience to job requirements with specific examples
   - Closing: Express availability, thank them, and include call to action
   - Sign-off: "Yours sincerely," (Kenyan convention) - ONLY ONCE at the very end
   - Signature: [Full Name], [Phone], [Email]

2. **Tone**: {tone} - Professional yet personable, confident but not arrogant

3. **Kenyan Context**:
   - Reference specific Kenyan industry knowledge if relevant
   - Use British English spelling (organisation, realise, etc.)
   - Show understanding of local market/company if applicable
   - Mention relevant professional bodies (ICPAK, EBK, etc.) if applicable
   - Include availability to start immediately or within notice period

4. **Content Strategy**:
   - Use STAR method for achievement examples
   - Quantify impact where possible (percentages, numbers)
   - Show enthusiasm but remain professional
   - Address any gaps or transitions positively
   - Demonstrate research about the company

5. **Key Requirements to Address**:
   - Must explicitly mention how you meet 3-5 key job requirements
   - Use keywords from the job description naturally
   - Show understanding of the role's challenges
   - Explain why you're interested in THIS company specifically

6. **What to AVOID**:
   - Generic templates or clichés
   - Repeating CV verbatim
   - Spelling/grammar errors
   - Being overly casual or formal
   - Making it about what company can do for you
   - Hallucinating experiences or skills
   - DUPLICATE greetings (only "Dear Hiring Manager," once)
   - DUPLICATE sign-offs (only "Yours sincerely," once)

7. **Length**: 250-400 words (3-4 paragraphs after opening)

**Output Format:**
Return ONLY a valid JSON object with this structure (NO DUPLICATES):

{{
  "opening": "Dear Hiring Manager,",
  "body_paragraph_1": "I am writing to apply for the [Job Title] position at [Company]. With [X] years of experience in...",
  "body_paragraph_2": "In my previous role at [Company], I [specific achievement relevant to job]. This demonstrates my ability to...",
  "body_paragraph_3": "I am particularly drawn to [Company] because [specific reason showing company research]. I am confident that my [specific skill/experience] would enable me to contribute meaningfully to your team.",
  "closing": "I would welcome the opportunity to discuss how my background aligns with your needs. I am available for an interview at your earliest convenience.",
  "signature": "Yours sincerely,\n\n[Full Name]\n[Phone]\n[Email]",
  "key_points_highlighted": [
    "Addressed requirement: [specific requirement]",
    "Demonstrated skill: [specific skill]",
    "Showed cultural fit: [how]"
  ],
  "subject_line": "Application for [Job Title] Position - [Your Name]"
}}

**CRITICAL REMINDERS**:
- Do NOT invent experiences not in the master profile
- Use actual data from the profile (companies, dates, achievements)
- Keep it authentic and genuine
- Make it specific to THIS job and company
- Ensure perfect grammar and spelling
- NO DUPLICATE GREETINGS
- NO DUPLICATE SIGN-OFFS
"""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def prepare_master_profile_context(profile: MasterProfile) -> Dict[str, Any]:
    """Convert MasterProfile to context for cover letter generation."""
    return {
        "full_name": profile.full_name or "Not provided",
        "email": profile.email or "Not provided",
        "phone": f"{profile.phone_country_code or ''}{profile.phone_number or ''}",
        "location": profile.location or "Kenya",
        "professional_summary": profile.professional_summary or profile.personal_statement or "",
        "experience": profile.work_experience or profile.experience or [],
        "education_level": profile.education_level or "Not specified",
        "field_of_study": profile.field_of_study or "Not specified",
        "technical_skills": profile.technical_skills or [],
        "soft_skills": profile.soft_skills or [],
        "key_achievements": [],  # Extract from experience
        "years_of_experience": len(profile.work_experience or profile.experience or []),
    }


def extract_json_from_response(text: str) -> dict:
    """Extract JSON from AI response."""
    import re
    
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
    text = re.sub(r',(\s*[}\]])', r'\1', text)  # Remove trailing commas
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse cover letter response: {str(e)}"
        )


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/generate", response_model=ApiResponse[CoverLetterResponse])
async def generate_cover_letter(
    request: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a personalized cover letter for a specific job application.
    
    Uses AI to create a compelling cover letter that:
    - Matches job requirements
    - Follows Kenyan conventions
    - Highlights relevant experience
    - Shows genuine interest
    - Is concise and professional
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
    profile_context = prepare_master_profile_context(master_profile)
    
    # Build the prompt
    prompt = COVER_LETTER_PROMPT.format(
        master_profile=json.dumps(profile_context, indent=2),
        job_title=job_data.job_title,
        company_name=job_data.company_name,
        location=job_data.location or "Kenya",
        requirements=", ".join(job_data.key_requirements or []),
        responsibilities=", ".join(job_data.responsibilities or []),
        company_description=job_data.company_description or "Leading organization",
        job_level=job_data.job_level or "Not specified",
        employment_type=job_data.employment_type or "Full-time",
        application_email=(
            job_data.application_email_to
            or job_data.application_email_cc
            or "Not provided"
        ),
        deadline=job_data.application_deadline or "Not specified",
        tone=request.tone
    )
    
    # Call Gemini AI
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt
        )
        
        # Parse the response
        cover_letter_data = extract_json_from_response(response.text)
        
        # Combine paragraphs into full content, preventing duplicates
        parts = []
        
        # Add opening (e.g., "Dear Hiring Manager,")
        opening = cover_letter_data.get("opening", "").strip()
        if opening:
            parts.append(opening)
        
        # Add body paragraphs
        for key in ["body_paragraph_1", "body_paragraph_2", "body_paragraph_3"]:
            paragraph = cover_letter_data.get(key, "").strip()
            if paragraph:
                parts.append(paragraph)
        
        # Add closing
        closing = cover_letter_data.get("closing", "").strip()
        if closing:
            parts.append(closing)
        
        # Add signature (which includes the sign-off like "Yours sincerely,")
        signature = cover_letter_data.get("signature", "").strip()
        if signature:
            parts.append(signature)
        
        # Join all parts with double newlines
        full_content = "\n\n".join(parts).strip()
        
        # Calculate word count
        word_count = len(full_content.split())
        
        return ApiResponse(
            success=True,
            message="Cover letter generated successfully",
            data=CoverLetterResponse(
                content=full_content,
                word_count=word_count,
                structure={
                    "opening": cover_letter_data.get("opening", ""),
                    "body_1": cover_letter_data.get("body_paragraph_1", ""),
                    "body_2": cover_letter_data.get("body_paragraph_2", ""),
                    "body_3": cover_letter_data.get("body_paragraph_3", ""),
                    "closing": cover_letter_data.get("closing", ""),
                    "signature": cover_letter_data.get("signature", ""),
                    "subject_line": cover_letter_data.get("subject_line", "")
                },
                key_points=cover_letter_data.get("key_points_highlighted", []),
                job_title=job_data.job_title,
                company_name=job_data.company_name
            )
        )
        
    except Exception as e:
        print(f"❌ Cover letter generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cover letter: {str(e)}"
        )
