from pydantic import BaseModel
from typing import Dict, Optional

class RecruiterInfo(BaseModel):
    name: Optional[str] = None
    profile_url: Optional[str] = None

class ScrapedJobData(BaseModel):
    job_id: str
    platform: str
    job_url: str
    job_title: str
    company_name: str
    raw_description: str
    recruiter_info: Optional[RecruiterInfo] = None

class UserProfile(BaseModel):
    user_id: str
    raw_master_resume: str
    custom_preferences: Dict

class TailoringPayload(BaseModel):
    job_data: ScrapedJobData
    user_profile: UserProfile

class TailoredOutput(BaseModel):
    job_id: str
    status: str
    tailored_resume: str
    cover_letter: str
    outreach_message: str
    confidence_score: float