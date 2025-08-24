from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/application-logs")
async def get_application_logs():
    # Mock data for testing
    return [
        {
            "id": 1,
            "job_id": "job_001",
            "platform": "LinkedIn",
            "status": "success",
            "created_at": "2024-01-20T10:30:00Z",
            "message": "Successfully applied to Software Engineer position"
        },
        {
            "id": 2,
            "job_id": "job_002", 
            "platform": "Glassdoor",
            "status": "pending",
            "created_at": "2024-01-20T09:15:00Z",
            "message": "Application submitted, waiting for response"
        },
        {
            "id": 3,
            "job_id": "job_003",
            "platform": "Wellfound",
            "status": "failed",
            "created_at": "2024-01-20T08:45:00Z",
            "message": "Failed to submit application - captcha required"
        }
    ]

@app.get("/health")
async def health_check():
    return {"status": "ok"}