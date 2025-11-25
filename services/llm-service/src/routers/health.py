"""Health check router."""
from fastapi import APIRouter
from pydantic import BaseModel, Field
import time

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(default="healthy", description="Service health status")
    service: str = Field(default="llm-service", description="Service name")
    version: str = Field(default="1.0.0", description="Service version")
    timestamp: float = Field(default_factory=time.time, description="Response timestamp")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for service monitoring."""
    return HealthResponse(
        status="healthy",
        service="llm-service",
        version="1.0.0",
        timestamp=time.time(),
    )
