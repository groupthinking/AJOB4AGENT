"""Resume tailoring service using OpenAI."""
import logging
import re
from typing import Optional

from src.models.resume import Resume
from src.models.job import (
    JobDescription,
    TailoringOptions,
    TailoredResume,
    TailoredExperience,
    TailorResumeResponse,
)
from src.services.openai_client import OpenAIClient, OpenAIClientError
from src.services.prompt_templates import (
    RESUME_TAILOR_SYSTEM_PROMPT,
    RESUME_TAILOR_USER_PROMPT,
    format_resume_for_prompt,
    format_job_for_prompt,
)

logger = logging.getLogger(__name__)


class ResumeTailorService:
    """Service for tailoring resumes to job descriptions."""
    
    def __init__(self, openai_client: Optional[OpenAIClient] = None):
        self.openai_client = openai_client or OpenAIClient()
    
    async def tailor_resume(
        self,
        resume: Resume,
        job_description: JobDescription,
        options: Optional[TailoringOptions] = None,
    ) -> TailorResumeResponse:
        """Tailor a resume for a specific job description.
        
        Args:
            resume: Original resume
            job_description: Target job description
            options: Tailoring options
            
        Returns:
            TailorResumeResponse with tailored content and suggestions
        """
        options = options or TailoringOptions()
        
        logger.info(
            "Starting resume tailoring",
            extra={
                "candidate": resume.name,
                "target_company": job_description.company,
                "target_role": job_description.title,
                "model": options.model,
            }
        )
        
        # Format inputs for the prompt
        resume_dict = resume.model_dump()
        resume_text = format_resume_for_prompt(resume_dict)
        company, title, description, requirements, preferred = format_job_for_prompt(
            job_description.model_dump()
        )
        
        # Build the user prompt
        user_prompt = RESUME_TAILOR_USER_PROMPT.format(
            resume_json=resume_text,
            company=company,
            job_title=title,
            job_description=description,
            requirements=requirements,
            preferred=preferred,
        )
        
        try:
            # Call OpenAI
            response_text, tokens_used = await self.openai_client.chat_completion(
                system_prompt=RESUME_TAILOR_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                model=options.model,
                json_response=True,
            )
            
            # Parse the response
            result = await self.openai_client.parse_json_response(response_text)
            
            # Extract and validate tailored resume
            tailored_data = result.get("tailored_resume", {})
            suggestions = result.get("suggestions", [])
            
            # Build tailored experience list
            tailored_experience = []
            for exp in tailored_data.get("experience", []):
                tailored_experience.append(TailoredExperience(
                    title=exp.get("title", ""),
                    company=exp.get("company", ""),
                    start_date=exp.get("start_date", ""),
                    end_date=exp.get("end_date"),
                    description=exp.get("description", ""),
                    highlights=exp.get("highlights", []),
                ))
            
            # Ensure fit_score is within bounds
            fit_score = tailored_data.get("fit_score", 50)
            fit_score = max(0, min(100, fit_score))
            
            tailored_resume = TailoredResume(
                summary=tailored_data.get("summary", resume.summary),
                experience=tailored_experience,
                skills_highlighted=tailored_data.get("skills_highlighted", resume.skills[:5]),
                keywords_matched=tailored_data.get("keywords_matched", []),
                fit_score=fit_score,
            )
            
            logger.info(
                "Resume tailoring completed",
                extra={
                    "fit_score": fit_score,
                    "tokens_used": tokens_used,
                    "suggestions_count": len(suggestions),
                }
            )
            
            return TailorResumeResponse(
                tailored_resume=tailored_resume,
                suggestions=suggestions,
                tokens_used=tokens_used,
                model=options.model,
            )
            
        except OpenAIClientError as e:
            logger.error(f"OpenAI error during tailoring: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during tailoring: {e}")
            raise OpenAIClientError(f"Failed to tailor resume: {e}") from e
    
    def calculate_fit_score(
        self,
        resume: Resume,
        job_description: JobDescription,
    ) -> int:
        """Calculate a fit score based on keyword matching.
        
        This is a fallback/supplementary method that doesn't require API calls.
        The main fit score comes from the LLM response.
        
        Args:
            resume: Candidate resume
            job_description: Target job
            
        Returns:
            Fit score 0-100
        """
        resume_text = " ".join([
            resume.summary,
            " ".join(resume.skills),
            " ".join([exp.description for exp in resume.experience]),
        ]).lower()
        
        # Count matched requirements
        requirements = job_description.requirements
        matched_required = 0
        for req in requirements:
            req_words = [w.strip().lower() for w in req.split() if len(w) > 3]
            for word in req_words:
                if word in resume_text:
                    matched_required += 1
                    break
        
        # Count matched preferred
        preferred = job_description.preferred or []
        matched_preferred = 0
        for pref in preferred:
            pref_words = [w.strip().lower() for w in pref.split() if len(w) > 3]
            for word in pref_words:
                if word in resume_text:
                    matched_preferred += 1
                    break
        
        # Calculate score
        req_score = (matched_required / len(requirements) * 60) if requirements else 30
        pref_score = (matched_preferred / len(preferred) * 30) if preferred else 15
        base_score = 10  # Base points for having a complete resume
        
        total_score = int(req_score + pref_score + base_score)
        return max(0, min(100, total_score))
    
    def extract_keywords(
        self,
        resume: Resume,
        job_description: JobDescription,
    ) -> list[str]:
        """Extract matching keywords between resume and job description.
        
        Args:
            resume: Candidate resume
            job_description: Target job
            
        Returns:
            List of matched keywords
        """
        # Combine all resume text
        resume_text = " ".join([
            resume.summary,
            " ".join(resume.skills),
            " ".join([exp.description for exp in resume.experience]),
            " ".join([" ".join(exp.highlights or []) for exp in resume.experience]),
        ]).lower()
        
        # Combine all job text
        job_text = " ".join([
            job_description.description,
            " ".join(job_description.requirements),
            " ".join(job_description.preferred or []),
        ]).lower()
        
        # Extract important keywords (words > 4 chars that appear in both)
        # Use word boundary matching to avoid false positives from substring matches
        job_words = set(word.strip(".,!?;:()[]{}") for word in job_text.split() if len(word) > 4)
        matched = []
        
        for word in job_words:
            # Use word boundary regex to match whole words only
            if word.isalpha() and re.search(r'\b' + re.escape(word) + r'\b', resume_text):
                matched.append(word)
        
        # Return unique keywords, sorted by length (longer = more specific)
        return sorted(list(set(matched)), key=len, reverse=True)[:20]
