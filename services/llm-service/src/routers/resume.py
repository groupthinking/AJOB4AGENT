"""Resume tailoring router."""
import logging
from fastapi import APIRouter, HTTPException, status

from src.models.job import TailorResumeRequest, TailorResumeResponse
from src.services.resume_tailor import ResumeTailorService
from src.services.openai_client import OpenAIClientError

router = APIRouter(prefix="/resume", tags=["resume"])
logger = logging.getLogger(__name__)


@router.post("/tailor", response_model=TailorResumeResponse)
async def tailor_resume(request: TailorResumeRequest) -> TailorResumeResponse:
    """Tailor a resume for a specific job description.
    
    This endpoint takes a resume and job description, then uses AI to:
    - Rewrite the professional summary to align with the role
    - Highlight relevant experience and achievements
    - Prioritize skills that match job requirements
    - Calculate a fit score (0-100)
    - Provide actionable improvement suggestions
    
    Args:
        request: TailorResumeRequest containing resume, job_description, and options
        
    Returns:
        TailorResumeResponse with tailored content, suggestions, and metadata
        
    Raises:
        HTTPException: If tailoring fails due to API errors or invalid input
    """
    try:
        service = ResumeTailorService()
        
        logger.info(
            "Received tailoring request",
            extra={
                "candidate": request.resume.name,
                "company": request.job_description.company,
                "role": request.job_description.title,
            }
        )
        
        response = await service.tailor_resume(
            resume=request.resume,
            job_description=request.job_description,
            options=request.options,
        )
        
        logger.info(
            "Tailoring completed successfully",
            extra={
                "fit_score": response.tailored_resume.fit_score,
                "tokens_used": response.tokens_used,
            }
        )
        
        return response
        
    except OpenAIClientError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI service temporarily unavailable",
                "message": str(e),
            }
        )
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "Invalid input",
                "message": str(e),
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error during tailoring: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred during resume tailoring",
            }
        )
