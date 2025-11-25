# LLM Service - Resume Tailoring API

AI-powered resume tailoring service that uses OpenAI to optimize resumes for specific job descriptions.

## Features

- **Resume Tailoring**: Intelligently tailors resumes to match job descriptions
- **Fit Score Calculation**: Provides a 0-100 score indicating resume-job alignment
- **Keyword Matching**: Identifies matching keywords between resume and job
- **Improvement Suggestions**: Provides actionable suggestions for resume improvement
- **Async API**: Fully asynchronous FastAPI implementation
- **Retry Logic**: Automatic retries with exponential backoff for API failures
- **Token Tracking**: Reports API token usage for cost monitoring

## Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key

### Installation

1. **Clone and navigate to the service**
   ```bash
   cd services/llm-service
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

5. **Run the service**
   ```bash
   # Development mode with hot reload
   uvicorn src.main:app --reload --port 8002
   
   # Or using Python directly
   python -m src.main
   ```

### Using Docker

```bash
# Build and run
docker-compose up --build

# Or with the main project docker-compose
docker-compose -f ../../docker-compose.yml up llm-service
```

## API Documentation

Once running, access the interactive API documentation at:
- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

### Endpoints

#### POST `/api/v1/resume/tailor`

Tailor a resume for a specific job description.

**Request Body:**
```json
{
  "resume": {
    "name": "John Doe",
    "email": "john@example.com",
    "summary": "Senior software engineer with 8 years experience...",
    "experience": [
      {
        "title": "Senior Software Engineer",
        "company": "TechCorp",
        "start_date": "2020-01",
        "end_date": null,
        "description": "Lead development of microservices...",
        "highlights": ["Reduced latency by 40%", "Mentored 5 engineers"]
      }
    ],
    "skills": ["Python", "TypeScript", "AWS"],
    "education": [
      {
        "degree": "B.S. Computer Science",
        "institution": "UC Berkeley",
        "graduation_date": "2016"
      }
    ]
  },
  "job_description": {
    "title": "Staff Software Engineer",
    "company": "TechCorp",
    "description": "We are looking for a Staff Engineer...",
    "requirements": ["5+ years experience", "Python expertise"],
    "preferred": ["AWS experience", "Leadership skills"]
  },
  "options": {
    "model": "gpt-4",
    "focus_areas": ["summary", "experience", "skills"],
    "tone": "professional"
  }
}
```

**Response:**
```json
{
  "tailored_resume": {
    "summary": "Results-driven Staff Software Engineer...",
    "experience": [...],
    "skills_highlighted": ["Python", "AWS", "Team Leadership"],
    "keywords_matched": ["scalable systems", "cross-functional"],
    "fit_score": 87
  },
  "suggestions": [
    "Consider adding specific metrics for your AWS projects",
    "Emphasize leadership experience to match 'Team Lead' requirement"
  ],
  "tokens_used": 1250,
  "model": "gpt-4"
}
```

#### GET `/health`

Health check endpoint for service monitoring.

**Response:**
```json
{
  "status": "healthy",
  "service": "llm-service",
  "version": "1.0.0",
  "timestamp": 1699900000.0
}
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `OPENAI_MODEL` | Model to use for tailoring | `gpt-4` |
| `OPENAI_MAX_TOKENS` | Max tokens per request | `2000` |
| `OPENAI_TEMPERATURE` | Response creativity (0-1) | `0.7` |
| `LLM_SERVICE_PORT` | Service port | `8002` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `MAX_RETRIES` | API retry attempts | `3` |
| `RETRY_DELAY` | Base retry delay (seconds) | `1.0` |

## Fit Score Algorithm

The fit score (0-100) is calculated based on:

1. **Required Skills Match (60%)**: How many required qualifications match the resume
2. **Preferred Skills Match (30%)**: How many preferred qualifications match
3. **Base Score (10%)**: Points for having a complete resume with all sections

The LLM provides the primary fit score based on semantic understanding, while the service includes a fallback algorithm for offline scoring.

## Demo Script

```python
import httpx
import asyncio

async def demo_resume_tailoring():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8002/api/v1/resume/tailor",
            json={
                "resume": {
                    "name": "John Doe",
                    "email": "john@example.com",
                    "summary": "Senior engineer with Python expertise",
                    "experience": [],
                    "skills": ["Python", "AWS", "Docker"],
                    "education": []
                },
                "job_description": {
                    "title": "Staff Engineer",
                    "company": "TechCorp",
                    "description": "Looking for a senior Python developer",
                    "requirements": ["Python", "5+ years experience"],
                    "preferred": ["AWS", "Docker"]
                }
            },
            timeout=60.0
        )
        result = response.json()
        print(f"Fit Score: {result['tailored_resume']['fit_score']}")
        print(f"Suggestions: {result['suggestions']}")
        print(f"Tokens Used: {result['tokens_used']}")

asyncio.run(demo_resume_tailoring())
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_resume_tailor.py -v
```

## Error Handling

The service handles the following error cases:

- **422 Unprocessable Entity**: Invalid input data
- **503 Service Unavailable**: OpenAI API temporarily unavailable (rate limits, connection issues)
- **500 Internal Server Error**: Unexpected errors

All errors include an `error_id` for tracking and debugging.

## Architecture

```
src/
├── main.py                    # FastAPI application entry
├── config.py                  # Configuration management
├── routers/
│   ├── resume.py              # Resume tailoring endpoints
│   └── health.py              # Health check endpoint
├── services/
│   ├── openai_client.py       # OpenAI API wrapper with retry logic
│   ├── resume_tailor.py       # Resume tailoring business logic
│   └── prompt_templates.py    # Prompt engineering templates
└── models/
    ├── resume.py              # Resume Pydantic models
    └── job.py                 # Job description models
```

## Security Notes

- The OpenAI API key is never logged or exposed in responses
- All sensitive configuration is loaded from environment variables
- The service runs as a non-root user in Docker
- CORS is configured to only allow specified origins

## License

MIT License - See the root LICENSE file for details.
