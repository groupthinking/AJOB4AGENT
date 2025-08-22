from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from .models import TailoringPayload, TailoredOutput, HealthResponse
import logging
import structlog
import time
import random
import os
from contextlib import asynccontextmanager

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting LLM Service", service="llm-service", version="1.0.0")
    yield
    # Shutdown
    logger.info("Shutting down LLM Service")

app = FastAPI(
    title="LLM Service",
    description="AI-powered resume and content generation service",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,llm-service").split(",")
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    logger.info(
        "Request started",
        method=request.method,
        url=str(request.url),
        client_host=request.client.host if request.client else None
    )
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        logger.info(
            "Request completed",
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            process_time=round(process_time, 3)
        )
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            "Request failed",
            method=request.method,
            url=str(request.url),
            error=str(e),
            process_time=round(process_time, 3)
        )
        raise

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception",
        url=str(request.url),
        method=request.method,
        error=str(exc),
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error_id": f"llm-{int(time.time())}"
        }
    )

@app.post("/tailor", response_model=TailoredOutput)
async def tailor_resume(payload: TailoringPayload):
    """
    Receives job and user data, returns tailored application materials.
    This is the core AI-driven endpoint.
    """
    request_logger = logger.bind(
        job_id=payload.job_data.job_id,
        company=payload.job_data.company_name,
        job_title=payload.job_data.job_title
    )
    
    request_logger.info("Processing tailoring request")

    try:
        # --- Placeholder for Core LLM Logic ---
        # TODO: Replace with actual LLM implementation
        # 1. Cleaning and parsing payload.job_data.raw_description
        # 2. Generating embeddings for the job description and master resume  
        # 3. Calling an LLM (e.g., GPT-4) with a carefully crafted prompt
        # 4. Calculating confidence score based on keyword matching
        
        tailored_resume = f"TAILORED RESUME for {payload.job_data.job_title} at {payload.job_data.company_name}.\n\nGenerated with AI optimization for key requirements."
        cover_letter = f"Dear Hiring Manager,\n\nI am excited to apply for the {payload.job_data.job_title} position at {payload.job_data.company_name}."
        recruiter_name = payload.job_data.recruiter_info.name if payload.job_data.recruiter_info else "Hiring Team"
        outreach_message = f"Hi {recruiter_name},\n\nI noticed the {payload.job_data.job_title} opportunity at {payload.job_data.company_name} and I'm very interested in contributing to your team."
        confidence_score = round(random.uniform(0.75, 0.95), 2)  # Simulated confidence
        
        request_logger.info(
            "Successfully generated tailored content",
            confidence_score=confidence_score
        )
        
    except Exception as e:
        request_logger.error("LLM processing failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Content generation failed: {str(e)}"
        )

    response = TailoredOutput(
        job_id=payload.job_data.job_id,
        status="success",
        tailored_resume=tailored_resume,
        cover_letter=cover_letter,
        outreach_message=outreach_message,
        confidence_score=confidence_score
    )
    
    return response

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for container orchestration"""
    return HealthResponse(
        status="healthy",
        service="llm-service",
        version="1.0.0",
        timestamp=time.time()
    )