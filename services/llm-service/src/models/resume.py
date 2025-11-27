"""Resume Pydantic models."""
from typing import List, Optional
from pydantic import BaseModel, Field


class Experience(BaseModel):
    """Work experience entry."""
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    start_date: str = Field(..., description="Start date (e.g., '2020-01')")
    end_date: Optional[str] = Field(None, description="End date or None if current")
    description: str = Field(..., description="Role description and achievements")
    highlights: Optional[List[str]] = Field(default_factory=list, description="Key achievements")


class Education(BaseModel):
    """Education entry."""
    degree: str = Field(..., description="Degree name")
    institution: str = Field(..., description="School/University name")
    graduation_date: str = Field(..., description="Graduation date")
    gpa: Optional[float] = Field(None, description="GPA if applicable")
    highlights: Optional[List[str]] = Field(default_factory=list, description="Academic achievements")


class Resume(BaseModel):
    """Resume model with all sections."""
    name: str = Field(..., description="Candidate full name")
    email: str = Field(..., description="Contact email")
    phone: Optional[str] = Field(None, description="Contact phone")
    location: Optional[str] = Field(None, description="Location/City")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    summary: str = Field(..., description="Professional summary")
    experience: List[Experience] = Field(default_factory=list, description="Work experience")
    skills: List[str] = Field(default_factory=list, description="Technical and soft skills")
    education: List[Education] = Field(default_factory=list, description="Education history")
    certifications: Optional[List[str]] = Field(default_factory=list, description="Certifications")
    projects: Optional[List[str]] = Field(default_factory=list, description="Notable projects")
