"""
Cover Letter Generator API - Creates personalized cover letters for Kenyan job applications
Tailored to specific job requirements and company culture
"""

import json
import re
import hashlib
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import MasterProfile, ExtractedJobData, User
from app.schemas import ApiResponse
from app.api.users import get_current_user
from app.services.ai_orchestrator import AIOrchestrator
from app.services.quota_manager import QuotaManager, QuotaError
from app.services.cache_manager import CacheManager, CacheType


router = APIRouter(prefix="/cover-letter", tags=["cover-letter"])
settings = get_settings()


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
Write ONLY the body paragraphs (no greeting, no sign-off, no signature) for a professional Kenyan cover letter that:
- Demonstrates genuine interest in the role and company
- Highlights relevant experience and achievements
- Shows cultural fit with Kenyan workplace norms
- Addresses key job requirements
- Is concise (250-400 words)

**Critical Rules:**

1. **Structure** (BODY ONLY):
    - Do NOT include any greeting (e.g., "Dear Hiring Manager")
    - Do NOT include any sign-off or signature (e.g., "Yours sincerely", name, phone, email)
    - Return 3 concise body paragraphs only

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

7. **Length**: 220-320 words (3 body paragraphs)

**Output Format:**
Return ONLY a valid JSON object with this structure (BODY ONLY):

{{
    "body_paragraph_1": "I am writing to apply for the [Job Title] position at [Company]. With [X] years of experience in...",
    "body_paragraph_2": "In my previous role at [Company], I [specific achievement relevant to job]. This demonstrates my ability to...",
    "body_paragraph_3": "I am particularly drawn to [Company] because [specific reason showing company research]. I am confident that my [specific skill/experience] would enable me to contribute meaningfully to your team.",
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
- NO GREETINGS
- NO SIGN-OFFS
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
    """
    Extract JSON from AI response, handling markdown formatting and edge cases.
    
    Handles:
    - JSON wrapped in markdown code blocks (```json...```)
    - Plain JSON objects
    - JSON with extra text before/after
    - Trailing commas and formatting issues
    """
    import re
    
    if not text or not isinstance(text, str):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid response: expected string, got {type(text)}"
        )
    
    original_text = text
    extracted_via_markdown = False
    
    # Strategy 1: Try to extract markdown code block (```json...```)
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        if end > start:
            text = text[start:end].strip()
            extracted_via_markdown = True
            logger.debug(f"Extracted JSON from markdown code block (```json)")
    elif "```" in text:
        # Generic code block without 'json' specifier
        start = text.find("```") + 3
        end = text.find("```", start)
        if end > start:
            text = text[start:end].strip()
            extracted_via_markdown = True
            logger.debug(f"Extracted JSON from markdown code block (generic ```)")
    
    text = text.strip()
    text = re.sub(r',(\s*[}\]])', r'\1', text)  # Remove trailing commas
    
    # Strategy 2: Try direct JSON parse
    try:
        result = json.loads(text)
        if extracted_via_markdown:
            logger.info(f"Successfully parsed JSON from markdown code block")
        else:
            logger.info(f"Successfully parsed JSON directly")
        return result
    except json.JSONDecodeError as e:
        logger.debug(f"Direct JSON parse failed: {e}")
    
    # Strategy 3: Find and extract the JSON object (between first { and last })
    start = text.find("{")
    end = text.rfind("}")
    
    if start != -1 and end > start:
        json_text = text[start:end + 1]
        try:
            result = json.loads(json_text)
            logger.info(f"Successfully extracted JSON from position {start}-{end}")
            return result
        except json.JSONDecodeError as e:
            logger.debug(f"Extracted JSON parse failed: {e}")
    
    # Strategy 4: Try to find valid JSON by matching braces
    brace_stack = []
    for i, char in enumerate(text):
        if char == "{":
            if not brace_stack:
                start = i
            brace_stack.append(i)
        elif char == "}":
            if brace_stack:
                brace_stack.pop()
                if not brace_stack:
                    end = i + 1
                    try:
                        result = json.loads(text[start:end])
                        logger.info(f"Successfully extracted JSON using brace matching: {start}-{end}")
                        return result
                    except json.JSONDecodeError:
                        pass
    
    # All strategies failed - log details and raise error
    logger.error(f"Failed to extract JSON from response")
    logger.error(f"Response length: {len(original_text)} chars")
    logger.error(f"Response preview: {original_text[:500]}...")
    logger.error(f"Response ending: ...{original_text[-200:]}")
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to parse AI response as valid JSON. Response may be incomplete or malformed."
    )


def _strip_duplicate_greeting(text: str) -> str:
    """Remove greeting if present at the start of a paragraph."""
    if not text:
        return text
    return re.sub(r'^\s*dear\s+[^\n,]*,?\s*\n*', '', text, flags=re.IGNORECASE).strip()


def _strip_duplicate_signoff(text: str) -> str:
    """Remove sign-off if present at the start of a paragraph."""
    if not text:
        return text
    return re.sub(
        r'^\s*(yours sincerely|yours faithfully|sincerely|best regards|kind regards)[,]*\s*\n*',
        '',
        text,
        flags=re.IGNORECASE,
    ).strip()


def _normalize_opening(text: str) -> str:
    """Keep only the first greeting line in the opening."""
    if not text:
        return text
    match = re.search(r'(dear\s+[^\n,]*,?)', text, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return text.strip()


def _normalize_signature(text: str) -> str:
    """Keep a single sign-off line in signature; remove duplicates."""
    if not text:
        return text
    # Split lines and keep the first sign-off if multiple appear
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return text.strip()
    signoff_pattern = re.compile(r'^(yours sincerely|yours faithfully|sincerely|best regards|kind regards)\b', re.IGNORECASE)
    normalized_lines = []
    seen_signoff = False
    for line in lines:
        if signoff_pattern.match(line):
            if seen_signoff:
                continue
            seen_signoff = True
        normalized_lines.append(line)
    return "\n\n".join(normalized_lines).strip()


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
    
    # ============================================================================
    # Check Quota
    # ============================================================================
    
    try:
        quota_mgr = QuotaManager(db=db)
        await quota_mgr.check_quota(
            user_id=current_user.id,
            task_type="cover_letter",
            estimated_tokens=1536
        )
    except QuotaError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "quota_exceeded",
                "message": str(e),
                "quota_status": await quota_mgr.get_quota_status(current_user.id)
            }
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
    
    # Use orchestrator for cover letter generation (with caching)
    try:
        # Create cache key from job_id, user_id, and tone
        cache_key = hashlib.sha256(f"{current_user.id}_{request.job_id}_{request.tone}".encode()).hexdigest()
        cache_mgr = CacheManager(db=db)
        
        # Check cache first
        cached = await cache_mgr.get_cache(cache_key, user_id=current_user.id)
        
        if cached:
            print(f"✅ Cache hit for cover letter: job_id={request.job_id}, tone={request.tone}")
            cover_letter_data = cached.get("data", {})
        else:
            # Not cached, generate
            orchestrator = AIOrchestrator(db=db)
            response_text = await orchestrator.generate(
                user_id=current_user.id,
                task="cover_letter",
                prompt=prompt,
                max_tokens=6144,  # Increased from default 4096 to handle complete cover letter
            )
            
            # Parse the response
            logger.debug(f"Raw AI response length: {len(response_text)} characters")
            cover_letter_data = extract_json_from_response(response_text)
            logger.info(f"Successfully parsed cover letter data from AI response")
            
            # Cache the cover letter
            await cache_mgr.set_cache(
                key=cache_key,
                content=cover_letter_data,
                cache_type=CacheType.CONTENT,
                user_id=current_user.id,
                ttl_minutes=120  # Cache cover letters for 2 hours
            )
            print(f"💾 Cached cover letter: job_id={request.job_id}, tone={request.tone}")
        
        # Combine paragraphs into full content, preventing duplicates
        parts = []

        body_1 = cover_letter_data.get("body_paragraph_1", "").strip()
        body_2 = cover_letter_data.get("body_paragraph_2", "").strip()
        body_3 = cover_letter_data.get("body_paragraph_3", "").strip()

        # Ensure no greetings/sign-offs are included in body
        body_1 = _strip_duplicate_signoff(_strip_duplicate_greeting(body_1))
        body_2 = _strip_duplicate_signoff(_strip_duplicate_greeting(body_2))
        body_3 = _strip_duplicate_signoff(_strip_duplicate_greeting(body_3))

        # Add body paragraphs only
        for paragraph in [body_1, body_2, body_3]:
            if paragraph:
                parts.append(paragraph)
        
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
                    "opening": "",
                    "body_1": cover_letter_data.get("body_paragraph_1", ""),
                    "body_2": cover_letter_data.get("body_paragraph_2", ""),
                    "body_3": cover_letter_data.get("body_paragraph_3", ""),
                    "closing": "",
                    "signature": "",
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
