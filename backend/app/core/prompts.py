"""
Modularized AI prompts for Aditus Career Workflow Agent.
All Gemini API prompts are centralized here for easy maintenance and A/B testing.
"""

# ============================================================================
# JOB EXTRACTION PROMPTS
# ============================================================================

JOB_EXTRACTION_SYSTEM_PROMPT = """You are an expert job posting analyst specializing in extracting structured data from job listings. 
Focus on accuracy and completeness. Always extract information in valid JSON format.
You are analyzing job postings from the Kenyan job market (BrighterMonday, LinkedIn, Fuzu, etc.)."""

JOB_EXTRACTION_USER_PROMPT = """Analyze the following job posting and extract structured information. Return ONLY valid JSON with no markdown formatting.

Job Posting:
{job_html}

Extract and return a JSON object with these exact fields:
{{
    "company_name": "string - the company's full name",
    "job_title": "string - the exact job title",
    "job_description": "string - full job description (keep it concise)",
    "key_requirements": ["list", "of", "critical", "requirements"],
    "preferred_skills": ["list", "of", "nice-to-have", "skills"],
    "nice_to_have": ["list", "of", "bonus", "qualifications"],
    "job_level": "string - Junior/Mid-level/Senior/Lead/Executive",
    "employment_type": "string - Full-time/Contract/Internship/Freelance",
    "salary_range": "string - e.g., '80,000 - 120,000 KES' or 'Competitive'",
    "location": "string - city and remote status if applicable",
    "application_deadline": "string - ISO date format or 'Not specified'",
    "hiring_manager_name": "string - if mentioned, else null",
    "hiring_manager_title": "string - if mentioned, else null",
    "company_tone": "string - formal/casual/innovative/friendly based on language used",
    "company_description": "string - brief company background",
    "company_industry": "string - industry sector",
    "company_size": "string - Startup/SME/Mid-size/Enterprise"
}}

Be thorough and accurate. For missing information, use null values."""


# ============================================================================
# CV TAILORING PROMPTS
# ============================================================================

CV_TAILORING_SYSTEM_PROMPT = """You are a professional CV writer specializing in tailoring documents for specific job applications.
You excel at highlighting relevant experience and skills that match job requirements.
You understand ATS (Applicant Tracking Systems) best practices for Kenyan job market standards."""

CV_TAILORING_USER_PROMPT = """Create a tailored CV in clean HTML format for a candidate applying to this job.

MASTER PROFILE (Candidate's Career Data):
{master_profile_json}

TARGET JOB DETAILS:
- Company: {company_name}
- Job Title: {job_title}
- Key Requirements: {key_requirements}
- Preferred Skills: {preferred_skills}
- Company Tone: {company_tone}

INSTRUCTIONS:
1. Keep the CV to 2 pages maximum (single-column format per Kenyan standards)
2. Reorder experience sections to highlight most relevant roles first
3. Use keywords from job requirements throughout
4. Emphasize achievements with quantifiable results (numbers, percentages, impact)
5. Tailor skills section to include job-required skills first
6. Remove irrelevant experience if space-constrained
7. Maintain professional HTML structure suitable for PDF conversion
8. Use clean, readable fonts (specify in CSS)

Return ONLY valid HTML with embedded CSS. No markdown formatting. Start with <!DOCTYPE html>"""


CV_TAILORING_FOLLOW_UP = """Additional Requirements:
- Format: Single column, ATS-friendly layout
- Color scheme: Professional (white background, dark text)
- Include sections: Contact Info, Professional Summary, Experience, Education, Skills, Certifications
- Highlight metrics and achievements
- Make it suitable for WeasyPrint PDF conversion
- Ensure the HTML is self-contained with embedded styles"""


# ============================================================================
# COVER LETTER GENERATION PROMPTS
# ============================================================================

COVER_LETTER_SYSTEM_PROMPT = """You are an expert cover letter writer who creates compelling, personalized letters that increase interview chances.
You adapt tone and content to match company culture and job requirements.
You specialize in Kenyan job market conventions."""

COVER_LETTER_USER_PROMPT = """Write a compelling cover letter for this job application.

CANDIDATE INFO:
Name: {full_name}
Email: {email}
Phone: {phone}
Professional Summary: {professional_summary}
Relevant Experience: {relevant_experience}

JOB DETAILS:
- Company: {company_name}
- Hiring Manager: {hiring_manager_name}
- Job Title: {job_title}
- Company Tone: {company_tone}
- Key Requirements: {key_requirements}
- About Company: {company_description}

INSTRUCTIONS:
1. Create a professional letter in HTML format (suitable for PDF)
2. Address to hiring manager by name if available
3. Open with a compelling hook related to the company/role
4. Highlight 2-3 strongest relevant achievements
5. Show understanding of company culture and values
6. Explain why this specific role excites you
7. Use company tone ({company_tone})
8. Close with a professional call to action
9. Keep it to 3-4 paragraphs
10. Include header with candidate contact info

Return ONLY valid HTML with embedded CSS. Start with <!DOCTYPE html>"""


# ============================================================================
# COLD OUTREACH PROMPTS
# ============================================================================

COLD_OUTREACH_EMAIL_SYSTEM_PROMPT = """You are an expert at writing concise, professional cold outreach emails that get responses.
Your emails are personal yet professional, showing genuine interest in the opportunity and company.
You understand the Kenyan professional culture and communication norms."""

COLD_OUTREACH_EMAIL_USER_PROMPT = """Write a short, compelling cold outreach email for this job.

CANDIDATE:
Name: {full_name}
Email: {email}
Phone: {phone}
Key Strengths: {key_strengths}

JOB & COMPANY:
- Company: {company_name}
- Job Title: {job_title}
- Hiring Manager: {hiring_manager_name}
- Company Description: {company_description}
- Company Tone: {company_tone}

REQUIREMENTS MATCH:
- Required: {key_requirements}
- Why Candidate Fits: {fit_explanation}

INSTRUCTIONS:
1. Email should be 4-6 sentences max
2. Start with personalization (mention something specific about company)
3. State interest in the role
4. Highlight 1-2 key relevant achievements
5. Show personality matching company tone
6. End with clear CTA (phone call, coffee chat, next steps)
7. Include signature with contact details
8. Professional but not robotic

Return the email as plain text (no HTML markdown)."""


COLD_OUTREACH_LINKEDIN_SYSTEM_PROMPT = """You are an expert at writing engaging LinkedIn connection requests and InMails.
Your messages are personalized, show research, and encourage positive responses.
You adapt to different professional communication styles."""

COLD_OUTREACH_LINKEDIN_USER_PROMPT = """Write a personalized LinkedIn outreach message for connecting with hiring manager.

CANDIDATE:
Name: {full_name}
LinkedIn Profile: {linkedin_url}
Current Role/Title: {current_title}
Key Achievements: {key_achievements}

HIRING MANAGER:
Name: {hiring_manager_name}
Title: {hiring_manager_title}
Company: {company_name}

JOB OPPORTUNITY:
- Job Title: {job_title}
- Why It's Perfect: {why_fit}

INSTRUCTIONS:
1. Message should be 3-4 sentences
2. Show you've researched the hiring manager (mention company/achievement)
3. Explain why you're interested in them/company specifically
4. Highlight relevant experience briefly
5. End with genuine CTA (review profile, discuss opportunity, share insights)
6. Friendly but professional tone
7. Character limit: ~250 characters for best performance

Return the message as plain text."""


# ============================================================================
# ANALYSIS & FEEDBACK PROMPTS
# ============================================================================

CV_QUALITY_CHECK_PROMPT = """Review this tailored CV for the following job and provide feedback.

TAILORED CV:
{cv_content}

JOB REQUIREMENTS:
{job_requirements}

FEEDBACK CRITERIA:
1. Does it highlight the most relevant experience?
2. Are key job requirements well-represented?
3. Is formatting ATS-friendly?
4. Are there quantifiable achievements/metrics?
5. Is it within 2 pages for Kenyan standards?
6. Any obvious gaps or concerns?

Provide constructive feedback in JSON format:
{{
    "overall_score": 1-10,
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"],
    "critical_issues": ["issue1"] or [],
    "ats_friendly": true/false,
    "summary": "brief overall assessment"
}}"""


COVER_LETTER_QUALITY_CHECK_PROMPT = """Review this cover letter for the target job.

COVER LETTER:
{cover_letter_content}

COMPANY TONE: {company_tone}
JOB DETAILS: {job_title} at {company_name}

EVALUATION:
1. Does it match the company tone?
2. Is it personalized to the company/role?
3. Does it show genuine interest?
4. Are achievements compelling?
5. Is there a clear call-to-action?
6. Professional and error-free?

Provide feedback in JSON:
{{
    "overall_score": 1-10,
    "tone_match": true/false,
    "personalization_level": "generic/adequate/excellent",
    "call_to_action_clarity": "weak/clear/very clear",
    "strengths": ["strength1"],
    "improvements": ["improvement1"],
    "ready_to_send": true/false
}}"""


# ============================================================================
# UTILITY PROMPTS
# ============================================================================

SKILL_MATCHING_PROMPT = """Analyze how well the candidate's skills match the job requirements.

CANDIDATE SKILLS:
{candidate_skills}

JOB REQUIREMENTS:
{job_requirements}

PREFERRED SKILLS:
{preferred_skills}

Provide matching analysis in JSON:
{{
    "match_score": 0-100,
    "required_skills_met": {{"matched": ["skill1"], "missing": ["skill1"]}},
    "preferred_skills_met": {{"matched": ["skill1"], "missing": ["skill1"]}},
    "recommendations": ["recommendation1"],
    "fit_assessment": "Poor/Fair/Good/Excellent"
}}"""


COMPANY_CULTURE_ANALYSIS_PROMPT = """Analyze the company's culture and tone from the job posting.

JOB POSTING:
{job_posting}

Identify and return:
{{
    "company_tone": "formal/casual/innovative/friendly/technical",
    "culture_indicators": ["indicator1", "indicator2"],
    "communication_style": "description of how to communicate with this company",
    "company_values": ["value1", "value2"],
    "suggested_approach": "how candidate should position themselves"
}}"""


def get_extraction_prompts() -> dict:
    """Get all job extraction prompts."""
    return {
        "system": JOB_EXTRACTION_SYSTEM_PROMPT,
        "user": JOB_EXTRACTION_USER_PROMPT
    }


def get_cv_tailoring_prompts() -> dict:
    """Get all CV tailoring prompts."""
    return {
        "system": CV_TAILORING_SYSTEM_PROMPT,
        "user": CV_TAILORING_USER_PROMPT,
        "follow_up": CV_TAILORING_FOLLOW_UP
    }


def get_cover_letter_prompts() -> dict:
    """Get all cover letter generation prompts."""
    return {
        "system": COVER_LETTER_SYSTEM_PROMPT,
        "user": COVER_LETTER_USER_PROMPT
    }


def get_outreach_prompts() -> dict:
    """Get all cold outreach prompts."""
    return {
        "email": {
            "system": COLD_OUTREACH_EMAIL_SYSTEM_PROMPT,
            "user": COLD_OUTREACH_EMAIL_USER_PROMPT
        },
        "linkedin": {
            "system": COLD_OUTREACH_LINKEDIN_SYSTEM_PROMPT,
            "user": COLD_OUTREACH_LINKEDIN_USER_PROMPT
        }
    }


def get_quality_check_prompts() -> dict:
    """Get all quality check prompts."""
    return {
        "cv": CV_QUALITY_CHECK_PROMPT,
        "cover_letter": COVER_LETTER_QUALITY_CHECK_PROMPT
    }
