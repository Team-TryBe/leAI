"""
Aditus Gemini AI Service Module
Handles all interactions with Google Generative AI (Gemini API)
"""

import json
import logging
from typing import Optional, Dict, Any
import google.generativeai as genai

from app.core.config import get_settings
from app.core.prompts import (
    get_extraction_prompts,
    get_cv_tailoring_prompts,
    get_cover_letter_prompts,
    get_outreach_prompts,
)

logger = logging.getLogger(__name__)


class GeminiService:
    """Service for interacting with Gemini API."""
    
    def __init__(self):
        """Initialize Gemini service with API key and model settings."""
        settings = get_settings()
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL
        self.temperature = settings.GEMINI_TEMPERATURE
        self.client = genai.Client()
    
    def _get_model(self):
        """Get the configured generative model."""
        return genai.GenerativeModel(
            self.model_name,
            generation_config=genai.types.GenerationConfig(
                temperature=self.temperature,
                max_output_tokens=4096,
            )
        )
    
    async def extract_job_data(self, job_html: str) -> Dict[str, Any]:
        """
        Extract structured job data from HTML using LLM.
        
        Args:
            job_html: Raw HTML content of job posting
            
        Returns:
            Dictionary with extracted job data
        """
        try:
            logger.info("Starting job extraction with Gemini API")
            
            prompts = get_extraction_prompts()
            model = self._get_model()
            
            # Create the prompt with job HTML
            user_prompt = prompts["user"].format(job_html=job_html[:8000])  # Limit input size
            
            # Generate response
            response = model.generate_content([
                {"role": "user", "parts": [
                    {"text": prompts["system"]},
                    {"text": user_prompt}
                ]}
            ])
            
            # Parse response
            response_text = response.text.strip()
            
            # Try to extract JSON from response
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text
            
            extracted_data = json.loads(json_str)
            logger.info(f"✅ Successfully extracted job data for {extracted_data.get('company_name', 'Unknown')}")
            
            return {
                "success": True,
                "data": extracted_data
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            return {
                "success": False,
                "error": f"Invalid JSON response from API: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Job extraction failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_tailored_cv(
        self,
        master_profile: Dict[str, Any],
        job_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a CV tailored to specific job using LLM.
        
        Args:
            master_profile: User's master career profile
            job_details: Extracted job details
            
        Returns:
            Dictionary with tailored CV HTML
        """
        try:
            logger.info(f"Generating tailored CV for {job_details.get('job_title', 'Unknown Job')}")
            
            prompts = get_cv_tailoring_prompts()
            model = self._get_model()
            
            # Format the prompt
            user_prompt = prompts["user"].format(
                master_profile_json=json.dumps(master_profile, indent=2),
                company_name=job_details.get("company_name", "Unknown"),
                job_title=job_details.get("job_title", "Unknown"),
                key_requirements=", ".join(job_details.get("key_requirements", [])),
                preferred_skills=", ".join(job_details.get("preferred_skills", [])),
                company_tone=job_details.get("company_tone", "professional")
            )
            
            # Generate response
            response = model.generate_content([
                {"role": "user", "parts": [
                    {"text": prompts["system"]},
                    {"text": user_prompt},
                    {"text": prompts["follow_up"]}
                ]}
            ])
            
            cv_html = response.text.strip()
            logger.info("✅ CV generation completed successfully")
            
            return {
                "success": True,
                "cv_html": cv_html
            }
            
        except Exception as e:
            logger.error(f"CV generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_cover_letter(
        self,
        candidate_info: Dict[str, Any],
        job_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a tailored cover letter using LLM.
        
        Args:
            candidate_info: Candidate's profile information
            job_details: Extracted job details
            
        Returns:
            Dictionary with cover letter HTML
        """
        try:
            logger.info(f"Generating cover letter for {job_details.get('company_name', 'Unknown')}")
            
            prompts = get_cover_letter_prompts()
            model = self._get_model()
            
            # Format the prompt
            user_prompt = prompts["user"].format(
                full_name=candidate_info.get("full_name", ""),
                email=candidate_info.get("email", ""),
                phone=candidate_info.get("phone", ""),
                professional_summary=candidate_info.get("professional_summary", ""),
                relevant_experience=json.dumps(candidate_info.get("experience", [])[:2], indent=2),
                company_name=job_details.get("company_name", "Unknown"),
                hiring_manager_name=job_details.get("hiring_manager_name", "Hiring Manager"),
                job_title=job_details.get("job_title", "Unknown"),
                company_tone=job_details.get("company_tone", "professional"),
                key_requirements=", ".join(job_details.get("key_requirements", [])),
                company_description=job_details.get("company_description", "")
            )
            
            # Generate response
            response = model.generate_content([
                {"role": "user", "parts": [
                    {"text": prompts["system"]},
                    {"text": user_prompt}
                ]}
            ])
            
            cover_letter_html = response.text.strip()
            logger.info("✅ Cover letter generation completed successfully")
            
            return {
                "success": True,
                "cover_letter_html": cover_letter_html
            }
            
        except Exception as e:
            logger.error(f"Cover letter generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_cold_outreach(
        self,
        candidate_info: Dict[str, Any],
        job_details: Dict[str, Any],
        include_email: bool = True,
        include_linkedin: bool = True
    ) -> Dict[str, Any]:
        """
        Generate cold outreach email and LinkedIn message.
        
        Args:
            candidate_info: Candidate's profile information
            job_details: Extracted job details
            include_email: Whether to generate email
            include_linkedin: Whether to generate LinkedIn message
            
        Returns:
            Dictionary with outreach messages
        """
        try:
            logger.info(f"Generating cold outreach for {job_details.get('company_name', 'Unknown')}")
            
            result = {"success": True, "email": None, "linkedin": None}
            prompts = get_outreach_prompts()
            model = self._get_model()
            
            # Generate email
            if include_email:
                email_prompt = prompts["email"]["user"].format(
                    full_name=candidate_info.get("full_name", ""),
                    email=candidate_info.get("email", ""),
                    phone=candidate_info.get("phone", ""),
                    key_strengths=", ".join(candidate_info.get("skills", [])[:5]),
                    company_name=job_details.get("company_name", ""),
                    job_title=job_details.get("job_title", ""),
                    hiring_manager_name=job_details.get("hiring_manager_name", "Hiring Manager"),
                    company_description=job_details.get("company_description", ""),
                    company_tone=job_details.get("company_tone", "professional"),
                    key_requirements=", ".join(job_details.get("key_requirements", [])[:3]),
                    fit_explanation=f"Strong background in {', '.join(candidate_info.get('skills', [])[:3])}"
                )
                
                response = model.generate_content([
                    {"role": "user", "parts": [
                        {"text": prompts["email"]["system"]},
                        {"text": email_prompt}
                    ]}
                ])
                result["email"] = response.text.strip()
                logger.info("✅ Email generation completed")
            
            # Generate LinkedIn message
            if include_linkedin:
                linkedin_prompt = prompts["linkedin"]["user"].format(
                    full_name=candidate_info.get("full_name", ""),
                    linkedin_url=candidate_info.get("linkedin_url", ""),
                    current_title=candidate_info.get("current_title", ""),
                    key_achievements=", ".join(candidate_info.get("projects", [])[:2]) if candidate_info.get("projects") else "Multiple projects",
                    hiring_manager_name=job_details.get("hiring_manager_name", ""),
                    hiring_manager_title=job_details.get("hiring_manager_title", ""),
                    company_name=job_details.get("company_name", ""),
                    job_title=job_details.get("job_title", ""),
                    why_fit="Aligned experience and skills match"
                )
                
                response = model.generate_content([
                    {"role": "user", "parts": [
                        {"text": prompts["linkedin"]["system"]},
                        {"text": linkedin_prompt}
                    ]}
                ])
                result["linkedin"] = response.text.strip()
                logger.info("✅ LinkedIn message generation completed")
            
            return result
            
        except Exception as e:
            logger.error(f"Cold outreach generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Get or create Gemini service singleton."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
