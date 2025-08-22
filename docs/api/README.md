# API Documentation - AJOB4AGENT

This document provides comprehensive API documentation for all AJOB4AGENT services.

## Service Overview

| Service | Base URL | Purpose | Port |
|---------|----------|---------|------|
| Agent Orchestrator | `http://localhost:8080` | Main orchestration and job processing | 8080 |
| LLM Service | `http://localhost:8000` | AI content generation and tailoring | 8000 |
| Dashboard Service | `http://localhost:3001` | Frontend and user management | 3001 |
| Monitoring Service | `http://localhost:8001` | System monitoring and metrics | 8001 |

## Authentication

All API endpoints (except health checks) require authentication via API key:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/endpoint
```

## Agent Orchestrator Service (Port 8080)

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "agent-orchestrator",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 12345.67
}
```

### Process Scraped Job
```http
POST /api/process-scraped-job
Content-Type: application/json

{
  "job_id": "job-123",
  "platform": "linkedin",
  "status": "discovered",
  "job_data": {
    "title": "Software Engineer",
    "company": "Tech Corp",
    "url": "https://linkedin.com/jobs/123",
    "description": "Job description here...",
    "location": "San Francisco, CA",
    "salary_range": "$100k-150k"
  }
}
```

**Response:**
```json
{
  "status": "received",
  "message": "Job processing initiated",
  "jobId": "job-123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Application Status
```http
GET /api/applications/{job_id}/status
```

**Response:**
```json
{
  "job_id": "job-123",
  "status": "applied",
  "platform": "linkedin",
  "applied_at": "2024-01-15T10:30:00Z",
  "application_data": {
    "resume_tailored": true,
    "cover_letter_generated": true,
    "outreach_sent": true
  }
}
```

### Webhook Endpoints (Stripe Integration)
```http
POST /api/stripe/webhook
Content-Type: application/json
Stripe-Signature: t=1234567890,v1=...

{
  "type": "payment.succeeded",
  "data": { ... }
}
```

## LLM Service (Port 8000)

### Health Check
```http
GET /health
```

### Tailor Resume and Content
```http
POST /tailor
Content-Type: application/json

{
  "job_data": {
    "job_id": "job-123",
    "platform": "linkedin",
    "job_url": "https://linkedin.com/jobs/123",
    "job_title": "Software Engineer",
    "company_name": "Tech Corp",
    "raw_description": "We are looking for a skilled software engineer...",
    "recruiter_info": {
      "name": "Jane Smith",
      "profile_url": "https://linkedin.com/in/janesmith"
    }
  },
  "user_profile": {
    "user_id": "user-456",
    "raw_master_resume": "Experienced software engineer with 5+ years...",
    "custom_preferences": {
      "location": "San Francisco",
      "salary_min": 100000,
      "remote_ok": true
    }
  }
}
```

**Response:**
```json
{
  "job_id": "job-123",
  "status": "success",
  "tailored_resume": "Tailored resume content optimized for the role...",
  "cover_letter": "Personalized cover letter for Tech Corp...",
  "outreach_message": "Hi Jane, I noticed the Software Engineer opportunity...",
  "confidence_score": 0.89,
  "processing_time_ms": 2345
}
```

### Batch Processing
```http
POST /tailor/batch
Content-Type: application/json

{
  "jobs": [
    {
      "job_data": { ... },
      "user_profile": { ... }
    },
    // ... more jobs
  ],
  "options": {
    "priority": "high",
    "async": true
  }
}
```

## Dashboard Service (Port 3001)

### Health Check
```http
GET /api/health
```

### User Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Dashboard Data
```http
GET /api/dashboard/stats
Authorization: Bearer JWT_TOKEN
```

**Response:**
```json
{
  "applications": {
    "total": 125,
    "pending": 23,
    "applied": 89,
    "rejected": 13
  },
  "success_rate": 0.71,
  "response_rate": 0.34,
  "recent_applications": [
    {
      "job_id": "job-123",
      "company": "Tech Corp",
      "title": "Software Engineer",
      "status": "applied",
      "applied_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Monitoring Service (Port 8001)

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "agent-monitoring-service",
  "version": "1.0.0",
  "timestamp": 1705320600.123,
  "components": {
    "database": "healthy",
    "message_queue": "healthy"
  }
}
```

### Metrics
```http
GET /metrics
```

**Response:**
```json
{
  "applications_processed_total": 1234,
  "applications_successful_total": 987,
  "applications_failed_total": 47,
  "queue_depth": 12,
  "average_processing_time_ms": 2345.67
}
```

## Error Responses

All services return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req-12345"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing authentication)
- `403` - Forbidden (insufficient permissions)  
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `502` - Bad Gateway (service unavailable)
- `503` - Service Unavailable

## Rate Limiting

API endpoints are rate limited:

- **General API**: 100 requests per 15 minutes per IP
- **Login endpoints**: 5 requests per minute per IP
- **LLM endpoints**: 50 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705321200
```

## Webhooks

### Job Status Updates
Configure webhook URL in dashboard to receive job status updates:

```http
POST https://your-webhook-url.com/job-status
Content-Type: application/json
X-AJOB4AGENT-Signature: sha256=...

{
  "event": "job.applied",
  "job_id": "job-123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "platform": "linkedin",
    "company": "Tech Corp",
    "title": "Software Engineer",
    "status": "applied"
  }
}
```

## SDK Examples

### Python SDK Usage
```python
import requests

# Initialize client
class AJOB4AGENTClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def process_job(self, job_data):
        response = requests.post(
            f'{self.base_url}/api/process-scraped-job',
            json=job_data,
            headers=self.headers
        )
        return response.json()
    
    def get_application_status(self, job_id):
        response = requests.get(
            f'{self.base_url}/api/applications/{job_id}/status',
            headers=self.headers
        )
        return response.json()

# Usage
client = AJOB4AGENTClient('http://localhost:8080', 'your-api-key')
status = client.get_application_status('job-123')
print(status)
```

### JavaScript SDK Usage
```javascript
class AJOB4AGENTClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async processJob(jobData) {
    const response = await fetch(`${this.baseUrl}/api/process-scraped-job`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(jobData)
    });
    return response.json();
  }

  async getApplicationStatus(jobId) {
    const response = await fetch(`${this.baseUrl}/api/applications/${jobId}/status`, {
      headers: this.headers
    });
    return response.json();
  }
}

// Usage
const client = new AJOB4AGENTClient('http://localhost:8080', 'your-api-key');
const status = await client.getApplicationStatus('job-123');
console.log(status);
```

## OpenAPI/Swagger Documentation

Interactive API documentation is available at:
- Agent Orchestrator: `http://localhost:8080/docs`
- LLM Service: `http://localhost:8000/docs`

These provide interactive testing capabilities and detailed schema information.