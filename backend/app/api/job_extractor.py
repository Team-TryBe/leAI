"""
Job Extraction API - The "Aditus Engine"
Multimodal job posting ingestion: URLs, Images, and Manual Text
"""

import os
import json
import httpx
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import ExtractedJobData, User, MasterProfile, JobApplication
from app.schemas import ApiResponse, ExtractedJobDataResponse
from app.api.users import get_current_user
from app.utils.profile_validator import is_master_profile_complete


router = APIRouter(prefix="/job-extractor", tags=["job-extractor"])
settings = get_settings()

# Configure Gemini API - get from settings instead of direct os.getenv
GEMINI_API_KEY = settings.GEMINI_API_KEY
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not configured. Please set it in your .env file.")

client = genai.Client(api_key=GEMINI_API_KEY)


# ============================================================================
# EXTRACTION PROMPT TEMPLATE
# ============================================================================

# ============================================================================
# EXTRACTION PROMPT TEMPLATE
# ============================================================================

EXTRACTION_PROMPT = """You are an expert job posting analyzer specialized in the Kenyan job market.
Your PRIMARY task is to extract ALL critical information from job postings with 100% accuracy.

⚠️ CRITICAL FIELDS (NEVER MISS THESE):
1. **DEADLINE** - This is CRITICAL. Search extensively:
   - Look for "Apply by", "Closing date", "Application deadline", "Closes", "Due by"
   - Check headers, footers, sidebars, bold text, highlighted boxes
   - Handle relative dates: "Next Friday" = calculate from context, "By EOD" = today
   - If NO deadline found: explicitly state "NO DEADLINE SPECIFIED"
   - Format: YYYY-MM-DD if possible, otherwise exact text from posting

2. **APPLICATION EMAIL** - Search everywhere:
   - Look for: "Send CV to:", "Apply via email:", "applications@", "hr@", "recruitment@"
   - Check for CC emails: "To: email1@... CC: email2@..." - CAPTURE BOTH
   - Emails might be hidden in body text or footer sections
   - If multiple emails, list as "email1@... (TO), email2@... (CC)"
   - If NO email found: explicitly state "NO EMAIL PROVIDED - check website for portal"

3. **LOCATION** - Be specific:
   - Look for: job location, office location, work location, "Based in", "Located in"
   - Include: City, region (e.g., "Nairobi CBD", "Mombasa", "Hybrid - Nairobi")
   - Remote/Hybrid status is critical
   - If multiple locations: list all

EXTRACTION PROCESS:
- Read the ENTIRE posting multiple times
- Pay special attention to: footers, sidebars, colored boxes, bold text, headers
- Kenyan job boards often hide deadline in small print - READ CAREFULLY
- If uncertain, indicate uncertainty: "Unclear - possibly [date]"

Extract ALL the following information in valid JSON format:

{
  "job_title": "string (exact title from posting)",
  "company_name": "string (exact company name)",
  "location": "string (e.g., 'Nairobi CBD, Kenya' or 'Remote' or 'Hybrid - Nairobi')",
  "job_description": "string (complete description)",
  "key_requirements": ["list of main/must-have requirements"],
  "preferred_skills": ["list of preferred/nice-to-have skills"],
  "job_level": "string (Junior, Mid-level, Senior, Lead, Executive, etc.)",
  "employment_type": "string (Full-time, Part-time, Contract, Internship, etc.)",
  "salary_range": "string or null (exactly as posted, e.g., '150,000 - 200,000 KES/month')",
  
  "application_deadline": "⚠️ CRITICAL: string (format: YYYY-MM-DD) OR 'NO DEADLINE SPECIFIED' if none found",
  "application_deadline_notes": "Additional deadline context (e.g., 'Closes Friday 5PM', relative dates, timezone info)",
  
  "application_email_to": "string (primary email address to send CV to) OR null if not provided",
  "application_email_cc": "string (CC emails if any) OR null",
  "application_method": "string (Email, Online portal, LinkedIn, WhatsApp, etc.)",
  "application_url": "string (link to application portal) OR null",
  
  "responsibilities": ["list of main job responsibilities"],
  "benefits": ["list of benefits/perks offered"],
  "company_description": "string or null (info about the company)",
  "company_industry": "string or null (e.g., 'Technology', 'Finance', 'Healthcare')",
  "company_size": "string or null (e.g., 'Startup', 'SME', 'Large Enterprise')"
}

IMPORTANT RULES:
✅ DO: Search every inch of the posting for deadline, email, and location
✅ DO: Include exact text if date format is unclear
✅ DO: List multiple emails if present (TO, CC, BCC)
✅ DO: Mark fields as "NOT PROVIDED" if genuinely missing, NOT null
✅ DO: Highlight when deadline might be urgent (e.g., "CLOSING THIS FRIDAY")

❌ DON'T: Return null for DEADLINE without searching thoroughly first
❌ DON'T: Miss emails hidden in body text or footer
❌ DON'T: Ignore CC/BCC recipients - they're important
❌ DON'T: Assume a location if not stated - mark as "NOT SPECIFIED"

KENYAN JOB BOARD SPECIFICS:
- BrighterMonday: Deadline often in red box at top right
- Fuzu: Check "How to apply" section carefully
- MyJobMag: Deadline might be in header or footer
- LinkedIn: Must read through job description fully
- WhatsApp forwards: Deadline often at the end

Your response MUST be valid JSON only, with no additional text before or after."""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def scrape_url_with_firecrawl(url: str) -> str:
    """
    Scrape URL using Firecrawl API to get clean markdown.
    Fallback to Jina AI Reader if Firecrawl fails.
    """
    firecrawl_api_key = os.getenv("FIRECRAWL_API_KEY")
    
    if firecrawl_api_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.firecrawl.dev/v0/scrape",
                    headers={"Authorization": f"Bearer {firecrawl_api_key}"},
                    json={"url": url, "formats": ["markdown"]}
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {}).get("markdown", "")
        except Exception as e:
            print(f"Firecrawl failed: {e}")
    
    # Fallback to Jina AI Reader (free, no API key needed)
    try:
        jina_url = f"https://r.jina.ai/{url}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(jina_url)
            if response.status_code == 200:
                content = response.text
                
                # Detect login/auth walls
                login_indicators = [
                    "sign in", "log in", "login", "sign up", "create account",
                    "authentication required", "please login", "session expired"
                ]
                content_lower = content.lower()
                if any(indicator in content_lower for indicator in login_indicators):
                    # Check if it's mostly login-related (not just a mention)
                    if len(content) < 2000 or content_lower.count("login") > 3:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="This URL requires authentication (login page detected). For LinkedIn jobs, try taking a screenshot instead or copy-paste the job description manually."
                        )
                
                return content
    except HTTPException:
        raise
    except Exception as e:
        print(f"Jina AI Reader failed: {e}")
    
    # Last fallback: simple HTTP request
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url)
            return response.text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch URL: {str(e)}"
        )


def extract_json_from_response(text: str) -> dict:
    """
    Extract JSON from Gemini response with robust error handling.
    Handles malformed JSON from AI responses including unescaped newlines in strings.
    """
    # Try to find JSON block in markdown
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()
    
    # Clean up common issues
    text = text.strip()
    
    # Remove trailing commas before closing braces/brackets (common AI mistake)
    import re
    text = re.sub(r',(\s*[}\]])', r'\1', text)
    
    # Fix common issues with missing commas after closing quotes
    text = re.sub(r'"\s*\n\s*"', '",\n"', text)
    
    # Try standard parsing first
    try:
        data = json.loads(text)
        data = validate_and_clean_extraction(data)
        return data
    except json.JSONDecodeError as e:
        print(f"⚠️ Initial JSON parse failed: {str(e)}")
        print(f"📄 Problematic text (first 500 chars): {text[:500]}")
        
        # Try to find and extract the JSON object with better extraction
        start = text.find("{")
        end = text.rfind("}") + 1
        
        if start != -1 and end > start:
            json_text = text[start:end]
            
            # Try again with the extracted portion
            try:
                json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
                data = json.loads(json_text)
                data = validate_and_clean_extraction(data)
                return data
            except json.JSONDecodeError as e2:
                print(f"⚠️ Second attempt failed: {str(e2)}")
                
                # Advanced recovery: Fix unescaped newlines in strings
                try:
                    # Strategy: Parse field by field to handle malformed strings
                    recovered_data = recover_json_with_unescaped_newlines(json_text)
                    if recovered_data:
                        recovered_data = validate_and_clean_extraction(recovered_data)
                        print("✅ JSON recovered after unescaped newline fix")
                        return recovered_data
                except Exception as recovery_error:
                    print(f"❌ Unescaped newline recovery failed: {recovery_error}")
                
                # Fallback: More aggressive character-level cleanup
                try:
                    # Remove control characters and invalid escape sequences
                    json_text = json_text.encode('utf-8', 'ignore').decode('utf-8')
                    
                    # Replace actual newlines with escaped newlines within quoted strings
                    json_text = fix_newlines_in_json_strings(json_text)
                    
                    # Remove comments (// or /* */)
                    json_text = re.sub(r'//.*?\n', '\n', json_text)
                    json_text = re.sub(r'/\*.*?\*/', '', json_text, flags=re.DOTALL)
                    
                    # Try parsing again
                    data = json.loads(json_text)
                    data = validate_and_clean_extraction(data)
                    print("✅ JSON recovered after aggressive cleanup")
                    return data
                except Exception as cleanup_error:
                    print(f"❌ Aggressive cleanup failed: {cleanup_error}")
                    pass
        
        # If all attempts fail, provide helpful error with context
        error_line = text.split('\n')[min(15, len(text.split('\n'))-1)] if '\n' in text else text[:100]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse AI response as JSON. Error: {str(e)}. Context: {error_line[:100]}"
        )


def fix_newlines_in_json_strings(json_text: str) -> str:
    """
    Fix unescaped newlines inside JSON string values.
    Converts actual newlines within quoted strings to escaped newlines.
    """
    result = []
    in_string = False
    i = 0
    
    while i < len(json_text):
        char = json_text[i]
        
        # Track if we're inside a string
        if char == '"' and (i == 0 or json_text[i-1] != '\\'):
            in_string = not in_string
            result.append(char)
        # Replace newlines inside strings with escaped newlines
        elif char == '\n' and in_string:
            result.append('\\n')
        # Replace tabs inside strings with escaped tabs
        elif char == '\t' and in_string:
            result.append('\\t')
        # Replace carriage returns inside strings
        elif char == '\r' and in_string:
            result.append('\\r')
        else:
            result.append(char)
        
        i += 1
    
    return ''.join(result)


def recover_json_with_unescaped_newlines(json_text: str) -> dict:
    """
    Attempt to recover JSON when strings contain unescaped newlines.
    Parses the JSON structure and fixes string values.
    """
    import re
    
    # Try to identify key-value pairs and fix them
    # Pattern: "key": "value with\npossible newlines"
    
    # First, let's try to find all quoted strings and properly escape them
    def escape_string_value(match):
        key_part = match.group(1)
        value_part = match.group(2)
        # Escape newlines, tabs, and other control characters
        value_part = value_part.replace('\n', '\\n').replace('\t', '\\t').replace('\r', '\\r')
        return f'"{key_part}": "{value_part}"'
    
    # Find patterns like "key": "value" and fix newlines in the value
    fixed = re.sub(
        r'"([^"]+)":\s*"([^"]*(?:\n[^"]*)*)"',
        escape_string_value,
        json_text
    )
    
    try:
        return json.loads(fixed)
    except:
        return None


def validate_and_clean_extraction(data: dict) -> dict:
    """
    Validate and clean extracted data to ensure proper types.
    Handles cases where AI returns "NOT PROVIDED" or other strings for list fields.
    """
    # List fields that should never be strings
    list_fields = [
        "key_requirements",
        "preferred_skills",
        "responsibilities",
        "benefits",
        "nice_to_have"
    ]
    
    for field in list_fields:
        if field in data:
            value = data[field]
            # If it's a string or None, convert to empty list
            if isinstance(value, str):
                # "NOT PROVIDED", "None", "N/A", etc. → empty list
                if value.upper() in ["NOT PROVIDED", "NONE", "N/A", "UNDEFINED", ""]:
                    data[field] = []
                else:
                    # If it's a string with actual content, wrap it in a list
                    data[field] = [value] if value.strip() else []
            elif value is None:
                data[field] = []
            elif not isinstance(value, list):
                # If it's any other type, try to convert to list
                data[field] = [str(value)] if value else []
    
    return data


# ============================================================================
# MAIN EXTRACTION ENDPOINT
# ============================================================================

@router.post("/extract", response_model=ApiResponse[ExtractedJobDataResponse])
async def extract_job(
    url: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Universal job extraction endpoint supporting:
    - URL scraping (Kenyan job boards, LinkedIn, etc.)
    - Image/Screenshot OCR (WhatsApp forwards, Instagram posts)
    - Manual text paste (physical posters, PDFs)
    """
    
    # ============================================================================
    # STEP 1: Verify Master Profile is Complete
    # ============================================================================
    stmt = select(MasterProfile).where(MasterProfile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "master_profile_incomplete",
                "message": "Please complete your Master Profile before extracting job postings",
                "missing_fields": [
                    "Full Name", "Email", "Phone Number", "Location",
                    "Personal Statement", "Education", "Work Experience", "Skills"
                ],
                "action_required": "Navigate to Master Profile page and fill in all required fields"
            }
        )
    
    is_complete, missing_fields = is_master_profile_complete(profile)
    
    if not is_complete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "master_profile_incomplete",
                "message": "Your Master Profile is incomplete. Please fill in all required fields before extracting job postings.",
                "missing_fields": missing_fields,
                "action_required": "Navigate to Master Profile page and complete the following fields"
            }
        )
    
    # ============================================================================
    # STEP 2: Proceed with Job Extraction
    # ============================================================================
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY not configured. Please set it in .env file."
        )
    
    if not any([url, image, raw_text]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either url, image, or raw_text"
        )
    
    try:
        content_to_analyze = None
        source_type = None
        original_url = url
        
        # Channel A: URL Ingestion
        if url:
            print(f"🌐 Extracting from URL: {url}")
            markdown_content = await scrape_url_with_firecrawl(url)
            content_to_analyze = f"{EXTRACTION_PROMPT}\n\nJob Posting Content:\n{markdown_content}"
            source_type = "url"
        
        # Channel B: Image/Screenshot Ingestion (Multimodal)
        elif image:
            print(f"📸 Extracting from image: {image.filename}")
            image_bytes = await image.read()
            
            # Gemini multimodal prompt with new API
            response = client.models.generate_content(
                model='models/gemini-2.5-flash',
                contents=[
                    EXTRACTION_PROMPT,
                    types.Part.from_bytes(data=image_bytes, mime_type=image.content_type or "image/jpeg")
                ]
            )
            
            print(f"🤖 AI Response (first 300 chars): {response.text[:300]}")
            extracted_data = extract_json_from_response(response.text)
            source_type = "image"
            original_url = f"uploaded:{image.filename}"
        
        # Channel C: Manual Text Input
        elif raw_text:
            print(f"📝 Extracting from manual text input")
            content_to_analyze = f"{EXTRACTION_PROMPT}\n\nJob Posting Content:\n{raw_text}"
            source_type = "manual"
            original_url = "manual_input"
        
        # Generate extraction for URL and Text modes
        if content_to_analyze:
            response = client.models.generate_content(
                model='models/gemini-2.5-flash',
                contents=content_to_analyze
            )
            print(f"🤖 AI Response (first 300 chars): {response.text[:300]}")
            extracted_data = extract_json_from_response(response.text)
        
        # Log the extracted data for debugging
        print(f"📊 Extracted data: {json.dumps(extracted_data, indent=2)}")
        
        # Validate required fields
        if not extracted_data.get("company_name") or not extracted_data.get("job_title"):
            print(f"⚠️ Missing required fields. AI Response: {response.text[:500]}")
            
            # Check if AI detected a login page
            if "login" in response.text.lower() or "sign in" in response.text.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract job data - the URL appears to be a login or authentication page. For LinkedIn jobs, please take a screenshot or copy-paste the job description manually."
                )
            
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not extract company name and job title from the content. Please ensure the URL contains a valid job posting, or try using a screenshot/manual text input instead."
            )
        
        # Save to database
        job_data = ExtractedJobData(
            job_url=original_url or "manual_input",
            company_name=extracted_data.get("company_name"),
            job_title=extracted_data.get("job_title"),
            location=extracted_data.get("location"),
            job_description=extracted_data.get("job_description"),
            key_requirements=extracted_data.get("key_requirements", []),
            preferred_skills=extracted_data.get("preferred_skills", []),
            job_level=extracted_data.get("job_level"),
            employment_type=extracted_data.get("employment_type"),
            salary_range=extracted_data.get("salary_range"),
            
            # CRITICAL: Deadline fields
            application_deadline=extracted_data.get("application_deadline"),
            application_deadline_notes=extracted_data.get("application_deadline_notes"),
            
            # CRITICAL: Email fields
            application_email_to=extracted_data.get("application_email_to"),
            application_email_cc=extracted_data.get("application_email_cc"),
            application_method=extracted_data.get("application_method"),
            application_url=extracted_data.get("application_url"),
            
            # Additional fields
            responsibilities=extracted_data.get("responsibilities", []),
            benefits=extracted_data.get("benefits", []),
            company_description=extracted_data.get("company_description"),
            company_industry=extracted_data.get("company_industry"),
            company_size=extracted_data.get("company_size"),
        )
        
        db.add(job_data)
        await db.commit()
        await db.refresh(job_data)
        
        return ApiResponse(
            success=True,
            message=f"Job extracted successfully! Redirecting to personalize your CV...",
            data=ExtractedJobDataResponse.model_validate(job_data)
        )
    
    except Exception as e:
        print(f"❌ Extraction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}"
        )




@router.get("/extracted/{job_id}", response_model=ApiResponse[ExtractedJobDataResponse])
async def get_extracted_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific extracted job by ID."""
    stmt = select(ExtractedJobData).where(ExtractedJobData.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extracted job data with ID {job_id} not found"
        )
    
    return ApiResponse(
        success=True,
        data=ExtractedJobDataResponse.model_validate(job)
    )


@router.get("/recent", response_model=ApiResponse[List[ExtractedJobDataResponse]])
async def get_recent_extractions(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recent job extractions for the current user."""
    # Get job extractions that the user has created applications from or viewed
    # Since extracted_job_data doesn't have user_id, we get them through job_applications
    stmt = (
        select(ExtractedJobData)
        .join(JobApplication, ExtractedJobData.id == JobApplication.extracted_job_id, isouter=True)
        .where(
            (JobApplication.user_id == current_user.id) |
            (JobApplication.extracted_job_id == ExtractedJobData.id)
        )
        .order_by(ExtractedJobData.created_at.desc())
        .distinct()
        .limit(limit)
    )
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(jobs)} recent job extractions",
        data=[ExtractedJobDataResponse.model_validate(job) for job in jobs]
    )


@router.get("/search", response_model=ApiResponse[List[ExtractedJobDataResponse]])
async def search_extractions(
    query: Optional[str] = None,
    company: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search and filter saved job extractions."""
    stmt = (
        select(ExtractedJobData)
        .join(JobApplication, ExtractedJobData.id == JobApplication.extracted_job_id, isouter=True)
        .where(JobApplication.user_id == current_user.id)
        .order_by(ExtractedJobData.created_at.desc())
    )
    
    if query:
        query_filter = f"%{query.lower()}%"
        from sqlalchemy import or_, func
        stmt = stmt.where(
            or_(
                func.lower(ExtractedJobData.job_title).ilike(query_filter),
                func.lower(ExtractedJobData.company_name).ilike(query_filter),
                func.lower(ExtractedJobData.location).ilike(query_filter)
            )
        )
    
    if company:
        from sqlalchemy import func
        stmt = stmt.where(func.lower(ExtractedJobData.company_name).ilike(f"%{company.lower()}%"))
    
    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    
    return ApiResponse(
        success=True,
        message=f"Found {len(jobs)} matching job extractions",
        data=[ExtractedJobDataResponse.model_validate(job) for job in jobs]
    )
