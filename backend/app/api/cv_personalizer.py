"""
CV Personalization API - The "Career Strategist" Engine
Analyzes job descriptions, performs gap analysis, and personalizes CVs for the Kenyan market
"""

import os
import re
from typing import List, Dict, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import MasterProfile, ExtractedJobData, User
from app.schemas import ApiResponse
from app.api.users import get_current_user


router = APIRouter(prefix="/cv-personalizer", tags=["cv-personalizer"])
settings = get_settings()

# Configure Gemini API
client = genai.Client(api_key=settings.GEMINI_API_KEY)


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class MatchScoreBreakdown(BaseModel):
    """Detailed breakdown of match score components."""
    keyword_match: float  # 0-40 points
    experience_match: float  # 0-30 points
    skills_match: float  # 0-20 points
    education_match: float  # 0-10 points
    total_score: float  # 0-100
    color_band: str  # "red", "yellow", "green"
    recommendations: List[str]


class GapAnalysis(BaseModel):
    """Gap analysis between user profile and job requirements."""
    direct_matches: List[str]  # Skills user has that match JD
    transferable_matches: List[Dict[str, str]]  # {"user_skill": "X", "jd_skill": "Y"}
    gaps: List[str]  # Skills in JD that user lacks
    priorities: List[str]  # Top 5 critical skills from JD


class PersonalizedSection(BaseModel):
    """A personalized CV section."""
    section_name: str
    original_content: Optional[str]
    personalized_content: str
    improvements: List[str]


class CVPersonalizationResponse(BaseModel):
    """Complete CV personalization response."""
    match_score: MatchScoreBreakdown
    gap_analysis: GapAnalysis
    personalized_sections: Dict[str, PersonalizedSection]
    ats_optimized_keywords: List[str]
    company_tone: str  # "formal", "energetic", "conservative"


class PersonalizeRequest(BaseModel):
    """Request to personalize CV for a job."""
    job_id: int  # ExtractedJobData ID


# ============================================================================
# MATCH SCORE ALGORITHM
# ============================================================================

def calculate_match_score(
    user_skills: List[str],
    user_experience: List[Dict],
    user_education: str,
    jd_requirements: List[str],
    jd_preferred_skills: List[str],
    jd_level: str
) -> MatchScoreBreakdown:
    """
    Calculate CV-JD match score (0-100) based on multiple factors.
    
    Scoring System:
    - Keyword Match: 40 points (critical skills from JD)
    - Experience Match: 30 points (work experience alignment)
    - Skills Match: 20 points (technical + soft skills)
    - Education Match: 10 points (degree requirements)
    
    Color Bands:
    - Red (0-40%): Needs significant improvement
    - Yellow (40-75%): Good, could be enhanced
    - Green (75-100%): Ready to submit
    """
    
    # Normalize all text for comparison
    user_skills_lower = [s.lower().strip() for s in user_skills]
    jd_requirements_lower = [r.lower().strip() for r in jd_requirements]
    jd_preferred_lower = [p.lower().strip() for p in jd_preferred_skills]
    
    # 1. KEYWORD MATCH (40 points)
    # Check how many JD keywords appear in user profile
    all_jd_keywords = set(jd_requirements_lower + jd_preferred_lower)
    user_keywords = set(user_skills_lower)
    
    # Extract keywords from experience
    exp_text = " ".join([exp.get("description", "") for exp in user_experience]).lower()
    
    keyword_matches = 0
    for keyword in all_jd_keywords:
        # Check if keyword in skills or experience
        if keyword in user_keywords or keyword in exp_text:
            keyword_matches += 1
    
    keyword_score = (keyword_matches / max(len(all_jd_keywords), 1)) * 40
    
    # 2. EXPERIENCE MATCH (30 points)
    # Check experience level and relevance
    experience_score = 0
    
    # Level matching
    level_map = {
        "junior": 1, "mid-level": 2, "senior": 3, "lead": 4, "executive": 5,
        "entry": 1, "intermediate": 2, "expert": 3
    }
    
    jd_level_num = level_map.get(jd_level.lower() if jd_level else "", 2)
    user_years = sum([exp.get("duration_years", 0) for exp in user_experience])
    
    if user_years >= jd_level_num:
        experience_score += 15
    elif user_years >= (jd_level_num - 1):
        experience_score += 10
    else:
        experience_score += 5
    
    # Relevance matching (do experiences mention JD keywords?)
    relevant_experiences = 0
    for exp in user_experience:
        exp_desc = exp.get("description", "").lower()
        if any(keyword in exp_desc for keyword in all_jd_keywords):
            relevant_experiences += 1
    
    if relevant_experiences > 0:
        experience_score += min(15, relevant_experiences * 5)
    
    experience_score = min(30, experience_score)
    
    # 3. SKILLS MATCH (20 points)
    # Prioritize must-have vs nice-to-have
    required_matches = sum(1 for req in jd_requirements_lower if req in user_keywords)
    preferred_matches = sum(1 for pref in jd_preferred_lower if pref in user_keywords)
    
    required_score = (required_matches / max(len(jd_requirements_lower), 1)) * 15
    preferred_score = (preferred_matches / max(len(jd_preferred_lower), 1)) * 5
    
    skills_score = min(20, required_score + preferred_score)
    
    # 4. EDUCATION MATCH (10 points)
    # Check if user education meets JD requirements
    education_score = 0
    education_keywords = ["bachelor", "degree", "bsc", "ba", "bcom", "masters", "mba", "phd"]
    
    user_edu_lower = user_education.lower() if user_education else ""
    jd_edu_mentioned = any(keyword in " ".join(jd_requirements_lower) for keyword in education_keywords)
    
    if jd_edu_mentioned:
        user_has_degree = any(keyword in user_edu_lower for keyword in education_keywords)
        education_score = 10 if user_has_degree else 5
    else:
        education_score = 10  # No specific requirement
    
    # CALCULATE TOTAL
    total_score = keyword_score + experience_score + skills_score + education_score
    
    # DETERMINE COLOR BAND
    if total_score >= 75:
        color_band = "green"
    elif total_score >= 40:
        color_band = "yellow"
    else:
        color_band = "red"
    
    # GENERATE RECOMMENDATIONS
    recommendations = []
    if keyword_score < 25:
        recommendations.append("Add more keywords from job description to your skills and experience")
    if experience_score < 20:
        recommendations.append("Highlight more relevant work experience or projects")
    if skills_score < 15:
        recommendations.append("Update your skills section to include required technical skills")
    if education_score < 8:
        recommendations.append("Add or update your education credentials")
    if total_score >= 75:
        recommendations.append("Your CV is well-matched to this job! Ready to submit.")
    
    return MatchScoreBreakdown(
        keyword_match=round(keyword_score, 1),
        experience_match=round(experience_score, 1),
        skills_match=round(skills_score, 1),
        education_match=round(education_score, 1),
        total_score=round(total_score, 1),
        color_band=color_band,
        recommendations=recommendations
    )


# ============================================================================
# GAP ANALYSIS
# ============================================================================

def perform_gap_analysis(
    user_skills: List[str],
    user_experience: List[Dict],
    jd_requirements: List[str],
    jd_preferred_skills: List[str]
) -> GapAnalysis:
    """
    Perform detailed gap analysis between user profile and job requirements.
    
    Returns:
    - Direct matches: Skills user has that exactly match JD
    - Transferable matches: Similar skills that can be rephrased
    - Gaps: Skills user lacks
    - Priorities: Top 5 critical skills from JD
    """
    
    user_skills_lower = {s.lower().strip(): s for s in user_skills}
    jd_requirements_lower = [r.lower().strip() for r in jd_requirements]
    jd_preferred_lower = [p.lower().strip() for p in jd_preferred_skills]
    
    # Extract experience keywords
    exp_text = " ".join([exp.get("description", "") for exp in user_experience]).lower()
    
    direct_matches = []
    transferable_matches = []
    gaps = []
    
    # Transferable skill mapping (Kenyan market context)
    transferable_map = {
        "quickbooks": ["xero", "sage", "accounting software", "cloud accounting"],
        "excel": ["google sheets", "spreadsheets", "data analysis"],
        "python": ["programming", "coding", "software development"],
        "javascript": ["web development", "frontend", "react", "node"],
        "project management": ["team leadership", "coordination", "agile"],
        "customer service": ["client relations", "support", "communication"],
    }
    
    # Analyze each JD requirement
    all_jd_skills = jd_requirements_lower + jd_preferred_lower
    
    for jd_skill in all_jd_skills:
        # Check for direct match
        if jd_skill in user_skills_lower or jd_skill in exp_text:
            direct_matches.append(jd_skill)
        else:
            # Check for transferable match
            found_transferable = False
            for key_skill, alternatives in transferable_map.items():
                if key_skill in jd_skill:
                    for alt in alternatives:
                        if alt in user_skills_lower or alt in exp_text:
                            transferable_matches.append({
                                "jd_skill": jd_skill,
                                "user_skill": alt,
                                "suggestion": f"Highlight {alt} experience as relevant to {jd_skill}"
                            })
                            found_transferable = True
                            break
                if found_transferable:
                    break
            
            # If no match found, it's a gap
            if not found_transferable:
                gaps.append(jd_skill)
    
    # Prioritize top 5 skills (required skills first)
    priorities = jd_requirements_lower[:5]
    if len(priorities) < 5:
        priorities.extend(jd_preferred_lower[:5 - len(priorities)])
    
    return GapAnalysis(
        direct_matches=direct_matches,
        transferable_matches=transferable_matches,
        gaps=gaps,
        priorities=priorities
    )


# ============================================================================
# AI PERSONALIZATION ENGINE
# ============================================================================

PERSONALIZATION_PROMPT = """You are an expert Career Strategist and Recruiter specializing in the Kenyan job market.

Your task is to personalize a CV section to match a specific job description while maintaining authenticity and professionalism.

CONTEXT:
- Company: {company_name}
- Position: {job_title}
- Company Tone: {company_tone}
- Location: {location}

JOB REQUIREMENTS (Top 5 Critical Skills):
{top_skills}

USER'S CURRENT CV SECTION ({section_name}):
{current_content}

PERSONALIZATION RULES:
1. Mirror JD Language: Use exact keywords from the job description
2. Quantify Everything: Turn vague statements into measurable achievements (e.g., "Increased efficiency by 25%")
3. STAR Method: Rewrite bullet points as Situation-Task-Action-Result
4. Active Verbs: Use power verbs (Spearheaded, Optimized, Coordinated, Implemented)
5. URL PRESERVATION (CRITICAL): ALWAYS preserve and include ALL URLs from the original content:
   - Certification verification links (e.g., "AWS Certified Solutions Architect - https://verify.aws.com/123")
   - Project links (e.g., "E-commerce Platform - https://github.com/user/project")
   - Portfolio links, credential IDs, or any web links
   - If URL exists in original, it MUST appear in personalized version
6. Tone Matching:
   - Startup/FinTech: Energetic, innovative, results-driven
   - Corporate/Parastatal: Formal, conservative, detail-oriented
   - NGO: Impact-focused, collaborative, mission-driven
7. NO HALLUCINATION: Only use information provided. If a skill is missing, focus on transferable experience.

OUTPUT FORMAT (JSON):
{{
  "personalized_content": "The rewritten section content",
  "improvements": ["List of specific improvements made"],
  "keywords_added": ["JD keywords incorporated"],
  "tone": "formal|energetic|conservative"
}}

Your response MUST be valid JSON only."""


async def personalize_section(
    section_name: str,
    current_content: str,
    job_data: ExtractedJobData,
    top_skills: List[str],
    company_tone: str
) -> PersonalizedSection:
    """Use Gemini to personalize a CV section for a specific job."""
    
    prompt = PERSONALIZATION_PROMPT.format(
        company_name=job_data.company_name,
        job_title=job_data.job_title,
        company_tone=company_tone,
        location=job_data.location,
        top_skills="\n".join([f"- {skill}" for skill in top_skills]),
        section_name=section_name,
        current_content=current_content
    )
    
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt
        )
        
        # Extract JSON from response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        
        # Find JSON object
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1
        
        if start_idx != -1 and end_idx > start_idx:
            import json
            result = json.loads(response_text[start_idx:end_idx])
            
            return PersonalizedSection(
                section_name=section_name,
                original_content=current_content,
                personalized_content=result.get("personalized_content", current_content),
                improvements=result.get("improvements", [])
            )
        else:
            raise ValueError("No JSON found in response")
            
    except Exception as e:
        print(f"❌ Personalization error for {section_name}: {e}")
        # Return original content if AI fails
        return PersonalizedSection(
            section_name=section_name,
            original_content=current_content,
            personalized_content=current_content,
            improvements=["AI personalization failed - using original content"]
        )


def detect_company_tone(company_name: str, job_description: str, company_description: str) -> str:
    """Detect company tone from job posting content."""
    
    combined_text = f"{company_name} {job_description} {company_description}".lower()
    
    # Startup/FinTech indicators
    startup_keywords = ["startup", "fintech", "innovation", "disruption", "agile", "fast-paced", "dynamic"]
    if any(keyword in combined_text for keyword in startup_keywords):
        return "energetic"
    
    # Formal/Corporate indicators
    formal_keywords = ["parastatal", "government", "bank", "insurance", "law firm", "established", "traditional"]
    if any(keyword in combined_text for keyword in formal_keywords):
        return "formal"
    
    # Default to professional
    return "professional"


# ============================================================================
# MAIN PERSONALIZATION ENDPOINT
# ============================================================================

@router.post("/personalize", response_model=ApiResponse[CVPersonalizationResponse])
async def personalize_cv_for_job(
    request: PersonalizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Personalize user's Master CV for a specific job posting.
    
    Process:
    1. Load user's Master Profile
    2. Load job data
    3. Perform gap analysis
    4. Calculate match score
    5. Personalize key sections using AI
    6. Return personalized CV with recommendations
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
    
    # Prepare user data - handle missing fields gracefully
    user_technical_skills = master_profile.technical_skills or []
    user_soft_skills = master_profile.soft_skills or []
    user_skills = user_technical_skills + user_soft_skills
    
    user_experience = master_profile.work_experience or master_profile.experience or []
    
    user_education = ""
    if master_profile.education_level or master_profile.field_of_study:
        parts = [master_profile.education_level, master_profile.field_of_study]
        user_education = " in ".join([p for p in parts if p])
    elif master_profile.education:
        if master_profile.education and len(master_profile.education) > 0:
            edu = master_profile.education[0]
            if isinstance(edu, dict):
                degree = edu.get("degree", "")
                field = edu.get("field", "")
                parts = [degree, field]
                user_education = " in ".join([p for p in parts if p])
    
    # Perform gap analysis
    gap_analysis = perform_gap_analysis(
        user_skills=user_skills,
        user_experience=user_experience,
        jd_requirements=job_data.key_requirements or [],
        jd_preferred_skills=job_data.preferred_skills or []
    )
    
    # Calculate match score
    match_score = calculate_match_score(
        user_skills=user_skills,
        user_experience=user_experience,
        user_education=user_education,
        jd_requirements=job_data.key_requirements or [],
        jd_preferred_skills=job_data.preferred_skills or [],
        jd_level=job_data.job_level or "Mid-level"
    )
    
    # Detect company tone
    company_tone = detect_company_tone(
        company_name=job_data.company_name,
        job_description=job_data.job_description or "",
        company_description=job_data.company_description or ""
    )
    
    # Personalize key sections
    personalized_sections = {}
    
    # Professional Summary
    if master_profile.professional_summary:
        summary_section = await personalize_section(
            section_name="Professional Summary",
            current_content=master_profile.professional_summary,
            job_data=job_data,
            top_skills=gap_analysis.priorities,
            company_tone=company_tone
        )
        personalized_sections["professional_summary"] = summary_section
    
    # Work Experience (personalize each entry)
    if user_experience:
        for idx, exp in enumerate(user_experience[:3]):  # Top 3 experiences
            exp_section = await personalize_section(
                section_name=f"Work Experience - {exp.get('title', 'Position')}",
                current_content=exp.get('description', ''),
                job_data=job_data,
                top_skills=gap_analysis.priorities,
                company_tone=company_tone
            )
            personalized_sections[f"experience_{idx}"] = exp_section
    
    # Certifications (preserve credential URLs)
    if master_profile.certifications:
        cert_content = "\n".join([
            f"{cert.get('name', '')} - {cert.get('issuer', '')} ({cert.get('date', '')})" +
            (f" - Credential: {cert.get('credential_url', cert.get('credential_id', ''))}" if cert.get('credential_url') or cert.get('credential_id') else "")
            for cert in master_profile.certifications
        ])
        if cert_content:
            cert_section = await personalize_section(
                section_name="Certifications",
                current_content=cert_content,
                job_data=job_data,
                top_skills=gap_analysis.priorities,
                company_tone=company_tone
            )
            personalized_sections["certifications"] = cert_section
    
    # Projects (preserve project links)
    if master_profile.projects:
        project_content = "\n\n".join([
            f"{proj.get('name', '')} - {proj.get('description', '')}" +
            (f"\nLink: {proj.get('link', '')}" if proj.get('link') else "")
            for proj in master_profile.projects[:3]  # Top 3 projects
        ])
        if project_content:
            proj_section = await personalize_section(
                section_name="Projects",
                current_content=project_content,
                job_data=job_data,
                top_skills=gap_analysis.priorities,
                company_tone=company_tone
            )
            personalized_sections["projects"] = proj_section
    
    # Extract ATS keywords
    ats_keywords = list(set(gap_analysis.direct_matches + [m.get("jd_skill", "") for m in gap_analysis.transferable_matches]))
    
    return ApiResponse(
        success=True,
        message="CV successfully personalized for this job",
        data=CVPersonalizationResponse(
            match_score=match_score,
            gap_analysis=gap_analysis,
            personalized_sections=personalized_sections,
            ats_optimized_keywords=ats_keywords[:15],  # Top 15 keywords
            company_tone=company_tone
        )
    )


@router.get("/match-score/{job_id}", response_model=ApiResponse[MatchScoreBreakdown])
async def get_match_score_only(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get just the match score without full personalization (faster)."""
    
    # Load job data
    result = await db.execute(
        select(ExtractedJobData).where(ExtractedJobData.id == job_id)
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
            detail="Master profile not found"
        )
    
    # Extract user skills - handle missing fields gracefully
    user_technical_skills = master_profile.technical_skills or []
    user_soft_skills = master_profile.soft_skills or []
    user_skills = user_technical_skills + user_soft_skills
    
    # Extract user experience
    user_experience = master_profile.work_experience or master_profile.experience or []
    
    # Extract user education
    user_education = ""
    if master_profile.education_level or master_profile.field_of_study:
        parts = [master_profile.education_level, master_profile.field_of_study]
        user_education = " in ".join([p for p in parts if p])
    elif master_profile.education:
        # Fallback to structured education data
        if master_profile.education and len(master_profile.education) > 0:
            edu = master_profile.education[0]
            if isinstance(edu, dict):
                degree = edu.get("degree", "")
                field = edu.get("field", "")
                parts = [degree, field]
                user_education = " in ".join([p for p in parts if p])
    
    match_score = calculate_match_score(
        user_skills=user_skills,
        user_experience=user_experience,
        user_education=user_education,
        jd_requirements=job_data.key_requirements or [],
        jd_preferred_skills=job_data.preferred_skills or [],
        jd_level=job_data.job_level or "Mid-level"
    )
    
    return ApiResponse(
        success=True,
        data=match_score
    )
