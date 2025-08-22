from pydantic import BaseModel, Field
from typing import Dict, Optional
import time

class RecruiterInfo(BaseModel):
    name: Optional[str] = None
    profile_url: Optional[str] = None

class ScrapedJobData(BaseModel):
    job_id: str = Field(..., description="Unique identifier for the job")
    platform: str = Field(..., description="Job platform (linkedin, glassdoor, wellfound)")
    job_url: str = Field(..., description="URL to the job posting")
    job_title: str = Field(..., description="Title of the job position")
    company_name: str = Field(..., description="Name of the hiring company")
    raw_description: str = Field(..., description="Raw job description text")
    recruiter_info: Optional[RecruiterInfo] = None

class UserProfile(BaseModel):
    user_id: str = Field(..., description="Unique user identifier")
    raw_master_resume: str = Field(..., description="User's master resume content")
    custom_preferences: Dict = Field(default_factory=dict, description="User job preferences")

class TailoringPayload(BaseModel):
    job_data: ScrapedJobData
    user_profile: UserProfile

class TailoredOutput(BaseModel):
    job_id: str
    status: str = Field(..., description="Processing status (success, error)")
    tailored_resume: str = Field(..., description="AI-tailored resume content")
    cover_letter: str = Field(..., description="Generated cover letter")
    outreach_message: str = Field(..., description="Personalized outreach message")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="AI confidence score")

class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Service health status")
    service: str = Field(default="llm-service", description="Service name")
    version: str = Field(default="1.0.0", description="Service version")
    timestamp: float = Field(default_factory=time.time, description="Response timestamp")