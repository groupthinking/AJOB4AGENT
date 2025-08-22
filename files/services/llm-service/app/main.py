from fastapi import FastAPI, HTTPException
from .models import TailoringPayload, TailoredOutput
import random

app = FastAPI()

@app.post("/tailor", response_model=TailoredOutput)
async def tailor_resume(payload: TailoringPayload):
    """
    Receives job and user data, returns tailored application materials.
    This is the core AI-driven endpoint.
    """
    print(f"Received tailoring request for Job ID: {payload.job_data.job_id}")

    # --- Placeholder for Core LLM Logic ---
    # In a real implementation, this section would involve:
    # 1. Cleaning and parsing payload.job_data.raw_description.
    # 2. Generating embeddings for the job description and master resume.
    # 3. Calling an LLM (e.g., GPT-4) with a carefully crafted prompt
    #    to generate the resume, cover letter, and outreach message.
    # 4. Calculating a confidence score based on keyword matching or embedding similarity.
    try:
        tailored_resume = f"TAILORED RESUME for {payload.job_data.job_title} at {payload.job_data.company_name}."
        cover_letter = f"TAILORED COVER LETTER for {payload.job_data.company_name}."
        recruiter_name = payload.job_data.recruiter_info.name if payload.job_data.recruiter_info else "Hiring Team"
        outreach_message = f"Hi {recruiter_name}, I'm very interested in the {payload.job_data.job_title} role."
        confidence_score = round(random.uniform(0.75, 0.95), 2) # Simulate confidence
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM processing failed: {e}")
    # --- End Placeholder ---

    response = TailoredOutput(
        job_id=payload.job_data.job_id,
        status="success",
        tailored_resume=tailored_resume,
        cover_letter=cover_letter,
        outreach_message=outreach_message,
        confidence_score=confidence_score
    )
    
    return response

@app.get("/health")
async def health_check():
    return {"status": "ok"}