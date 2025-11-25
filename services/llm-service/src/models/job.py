"""Job description and tailoring models."""
from typing import List, Optional
from pydantic import BaseModel, Field
from src.models.resume import Experience


class JobDescription(BaseModel):
    """Job description model."""
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    description: str = Field(..., description="Full job description text")
    requirements: List[str] = Field(default_factory=list, description="Required qualifications")
    preferred: Optional[List[str]] = Field(default_factory=list, description="Preferred qualifications")
    location: Optional[str] = Field(None, description="Job location")
    salary_range: Optional[str] = Field(None, description="Salary range if provided")


class TailoringOptions(BaseModel):
    """Options for resume tailoring."""
    model: str = Field(default="gpt-4", description="OpenAI model to use")
    focus_areas: List[str] = Field(
        default_factory=lambda: ["summary", "experience", "skills"],
        description="Sections to focus on tailoring"
    )
    tone: str = Field(default="professional", description="Tone of the tailored content")


class TailorResumeRequest(BaseModel):
    """Request body for resume tailoring endpoint."""
    resume: "Resume" = Field(..., description="Original resume")
    job_description: JobDescription = Field(..., description="Target job description")
    options: Optional[TailoringOptions] = Field(
        default_factory=TailoringOptions,
        description="Tailoring options"
    )


class TailoredExperience(BaseModel):
    """Tailored experience entry."""
    title: str
    company: str
    start_date: str
    end_date: Optional[str] = None
    description: str
    highlights: List[str] = Field(default_factory=list)


class TailoredResume(BaseModel):
    """Tailored resume output."""
    summary: str = Field(..., description="Tailored professional summary")
    experience: List[TailoredExperience] = Field(default_factory=list, description="Tailored experience")
    skills_highlighted: List[str] = Field(default_factory=list, description="Prioritized skills")
    keywords_matched: List[str] = Field(default_factory=list, description="Keywords from job matched")
    fit_score: int = Field(..., ge=0, le=100, description="Resume-job fit score (0-100)")


class TailorResumeResponse(BaseModel):
    """Response from resume tailoring endpoint."""
    tailored_resume: TailoredResume = Field(..., description="Tailored resume content")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")
    tokens_used: int = Field(..., description="OpenAI tokens consumed")
    model: str = Field(..., description="Model used for tailoring")


# Required for forward reference
from src.models.resume import Resume
TailorResumeRequest.model_rebuild()
