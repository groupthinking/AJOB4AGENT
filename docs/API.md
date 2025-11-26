# API Documentation - AJOB4AGENT

Comprehensive API documentation for all AJOB4AGENT services.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [LLM Service (Port 8000)](#llm-service-port-8000)
- [Agent Orchestrator (Port 8080)](#agent-orchestrator-port-8080)
- [Auth Service (Port 8003)](#auth-service-port-8003)
- [Dashboard Service (Port 3001)](#dashboard-service-port-3001)
- [Monitoring Service (Port 8001)](#monitoring-service-port-8001)
- [Platform Adapters](#platform-adapters)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)

---

## Overview

### Service Endpoints

| Service | Base URL | Port | Purpose |
|---------|----------|------|---------|
| LLM Service | `http://localhost:8000` | 8000 | AI content generation |
| Agent Orchestrator | `http://localhost:8080` | 8080 | Job search & orchestration |
| Auth Service | `http://localhost:8003` | 8003 | Authentication |
| Dashboard | `http://localhost:3001` | 3001 | Web interface |
| Monitoring | `http://localhost:8001` | 8001 | System metrics |

### Common Headers

All API requests should include:

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>  # For authenticated endpoints
X-Request-ID: <uuid>          # Optional, for tracing
```

---

## Authentication

### API Key Authentication

For service-to-service communication:

```bash
curl -X GET "http://localhost:8080/api/jobs" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### JWT Authentication

For user-facing endpoints:

```bash
# 1. Login to get token
curl -X POST "http://localhost:8003/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}

# 2. Use token for authenticated requests
curl -X GET "http://localhost:8080/api/applications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## LLM Service (Port 8000)

AI-powered content generation service using FastAPI.

### Health Check

Check service health status.

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "llm-service",
  "version": "1.0.0",
  "timestamp": 1705320600.123
}
```

**Example:**
```bash
curl http://localhost:8000/health
```

---

### Resume Tailoring

```http
POST /api/v1/resume/tailor
```

Tailor a resume and generate application materials for a specific job.

**Request Body:**
```json
{
  "job_data": {
    "job_id": "job-123",
    "platform": "linkedin",
    "job_url": "https://linkedin.com/jobs/view/123456",
    "job_title": "Senior Software Engineer",
    "company_name": "Tech Corp",
    "raw_description": "We are looking for a Senior Software Engineer with 5+ years of experience in Python, TypeScript, and cloud technologies. You will be responsible for designing and implementing scalable microservices...",
    "recruiter_info": {
      "name": "Jane Smith",
      "profile_url": "https://linkedin.com/in/janesmith",
      "email": "jane.smith@techcorp.com"
    },
    "requirements": [
      "5+ years software development",
      "Python and TypeScript",
      "Cloud technologies (AWS/GCP)",
      "Microservices architecture"
    ],
    "salary_range": "$150,000 - $200,000"
  },
  "user_profile": {
    "user_id": "user-456",
    "raw_master_resume": "Experienced software engineer with 7+ years of experience building scalable systems. Proficient in Python, TypeScript, Java, and Go. Led teams at multiple startups...",
    "custom_preferences": {
      "location": "San Francisco, CA",
      "salary_min": 150000,
      "remote_ok": true,
      "visa_sponsorship_needed": false
    },
    "skills": ["Python", "TypeScript", "AWS", "Docker", "Kubernetes"],
    "experience_years": 7
  },
  "options": {
    "generate_cover_letter": true,
    "generate_outreach": true,
    "tone": "professional",
    "emphasis": ["leadership", "technical"]
  }
}
```

**Response:**
```json
{
  "job_id": "job-123",
  "status": "success",
  "tailored_resume": "SENIOR SOFTWARE ENGINEER\n\nProfessional Summary:\nResults-driven Software Engineer with 7+ years of experience building scalable microservices and cloud-native applications...",
  "cover_letter": "Dear Hiring Manager,\n\nI am excited to apply for the Senior Software Engineer position at Tech Corp. With over 7 years of experience in building scalable systems using Python and TypeScript...",
  "outreach_message": "Hi Jane,\n\nI noticed the Senior Software Engineer opportunity at Tech Corp and I'm very interested. My background in building scalable microservices aligns well with what you're looking for...",
  "confidence_score": 0.89,
  "keyword_match": {
    "matched": ["Python", "TypeScript", "microservices", "AWS"],
    "missing": ["GCP"],
    "score": 0.85
  },
  "suggestions": [
    "Consider highlighting more cloud architecture experience",
    "Add specific metrics about system scale"
  ],
  "processing_time_ms": 2345
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid request body |
| 401 | Unauthorized |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/resume/tailor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "job_data": {
      "job_id": "job-123",
      "platform": "linkedin",
      "job_title": "Software Engineer",
      "company_name": "Tech Corp",
      "raw_description": "Looking for a software engineer..."
    },
    "user_profile": {
      "user_id": "user-456",
      "raw_master_resume": "Experienced engineer with 5 years..."
    }
  }'
```

---

### Batch Processing

```http
POST /api/v1/resume/tailor/batch
```

Process multiple jobs in batch.

**Request Body:**
```json
{
  "jobs": [
    {
      "job_data": { ... },
      "user_profile": { ... }
    },
    {
      "job_data": { ... },
      "user_profile": { ... }
    }
  ],
  "options": {
    "priority": "normal",
    "async": true,
    "webhook_url": "https://your-app.com/webhook/batch-complete"
  }
}
```

**Response:**
```json
{
  "batch_id": "batch-789",
  "status": "processing",
  "total_jobs": 5,
  "estimated_completion": "2024-01-15T11:00:00Z"
}
```

---

## Agent Orchestrator (Port 8080)

Core orchestration service for job search and application management.

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
  "uptime": 12345.67,
  "dependencies": {
    "database": "healthy",
    "redis": "healthy",
    "rabbitmq": "healthy"
  }
}
```

---

### Multi-Platform Job Search

```http
POST /api/search
```

Search for jobs across multiple platforms.

**Request Body:**
```json
{
  "searchTerm": "software engineer",
  "location": "San Francisco, CA",
  "platforms": ["linkedin", "glassdoor", "indeed", "wellfound"],
  "filters": {
    "experienceLevel": "senior",
    "remoteOnly": false,
    "salaryMin": 150000,
    "datePosted": "week",
    "jobType": "full-time"
  },
  "pagination": {
    "page": 1,
    "limit": 25
  }
}
```

**Response:**
```json
{
  "success": true,
  "totalJobs": 156,
  "platforms": 4,
  "searchParams": {
    "searchTerm": "software engineer",
    "location": "San Francisco, CA"
  },
  "results": [
    {
      "platform": "linkedin",
      "jobs": [
        {
          "id": "li-123456",
          "title": "Senior Software Engineer",
          "company": "Tech Corp",
          "location": "San Francisco, CA",
          "salary": "$150,000 - $200,000",
          "description": "We are looking for...",
          "url": "https://linkedin.com/jobs/view/123456",
          "postedDate": "2024-01-14",
          "matchScore": 0.92
        }
      ],
      "totalCount": 45,
      "searchTime": 1234
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8080/api/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "searchTerm": "software engineer",
    "location": "San Francisco, CA",
    "platforms": ["linkedin", "glassdoor"]
  }'
```

---

### Submit Job Application

```http
POST /api/apply
```

Submit a job application through the automation system.

**Request Body:**
```json
{
  "jobId": "li-123456",
  "platform": "linkedin",
  "userId": "user-456",
  "applicationData": {
    "resumeId": "resume-789",
    "coverLetterId": "cover-101",
    "customAnswers": {
      "years_experience": "7",
      "salary_expectations": "$175,000",
      "start_date": "2 weeks notice"
    }
  },
  "options": {
    "sendOutreach": true,
    "trackApplication": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "applicationId": "app-202",
  "status": "submitted",
  "platform": "linkedin",
  "jobId": "li-123456",
  "submittedAt": "2024-01-15T10:30:00Z",
  "outreach": {
    "sent": true,
    "recipientName": "Jane Smith",
    "messageId": "msg-303"
  }
}
```

---

### List Scraped Jobs

```http
GET /api/jobs
```

Get list of discovered/scraped jobs.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| platform | string | Filter by platform |
| status | string | Filter by status (new, applied, rejected) |
| company | string | Filter by company name |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 25) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "job-123",
      "externalId": "li-123456",
      "platform": "linkedin",
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "salary": "$150,000 - $200,000",
      "status": "new",
      "matchScore": 0.92,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 156,
    "totalPages": 7
  }
}
```

**Example:**
```bash
curl "http://localhost:8080/api/jobs?platform=linkedin&status=new&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Application History

```http
GET /api/applications
```

Get user's application history.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| platform | string | Filter by platform |
| from | string | Start date (ISO 8601) |
| to | string | End date (ISO 8601) |
| page | number | Page number |
| limit | number | Results per page |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "app-202",
      "jobId": "job-123",
      "platform": "linkedin",
      "company": "Tech Corp",
      "title": "Senior Software Engineer",
      "status": "applied",
      "appliedAt": "2024-01-15T10:30:00Z",
      "lastUpdated": "2024-01-15T10:30:00Z",
      "outreach": {
        "sent": true,
        "response": null
      }
    }
  ],
  "stats": {
    "total": 45,
    "applied": 30,
    "pending": 10,
    "rejected": 5,
    "responseRate": 0.23
  },
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 45
  }
}
```

---

### Pipeline Logs

```http
GET /api/logs
```

Get pipeline execution logs.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| level | string | Log level (info, warn, error) |
| service | string | Filter by service |
| from | string | Start timestamp |
| to | string | End timestamp |
| limit | number | Number of logs |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T10:30:00.123Z",
      "level": "info",
      "service": "agent-orchestrator",
      "message": "Job search completed",
      "metadata": {
        "searchTerm": "software engineer",
        "platform": "linkedin",
        "resultsCount": 45
      }
    }
  ]
}
```

---

## Auth Service (Port 8003)

User authentication and authorization service.

### User Registration

```http
POST /api/auth/register
```

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123",
  "name": "John Doe",
  "agreeToTerms": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "user": {
    "id": "user-456",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation Rules:**
- Email must be valid format
- Password must be 8+ characters with uppercase, lowercase, number, special char
- Name must be 2+ characters

**Example:**
```bash
curl -X POST "http://localhost:8003/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecureP@ssw0rd123",
    "name": "John Doe",
    "agreeToTerms": true
  }'
```

---

### User Login

```http
POST /api/auth/login
```

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "user-456",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8003/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecureP@ssw0rd123"
  }'
```

---

### Refresh Token

```http
POST /api/auth/refresh
```

Refresh the access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

### Forgot Password

```http
POST /api/auth/forgot-password
```

Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent."
}
```

---

### Reset Password

```http
POST /api/auth/reset-password
```

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecureP@ssw0rd456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully."
}
```

---

### Get Current User

```http
GET /api/auth/me
```

Get the currently authenticated user's information.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-456",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "preferences": {
      "targetTitles": ["Software Engineer", "Senior Engineer"],
      "targetLocations": ["San Francisco", "Remote"],
      "salaryMin": 150000,
      "remoteOk": true
    },
    "stats": {
      "totalApplications": 45,
      "thisWeek": 12,
      "responseRate": 0.23
    }
  }
}
```

**Example:**
```bash
curl "http://localhost:8003/api/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Dashboard Service (Port 3001)

Next.js web application with API routes.

### Dashboard Health

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "dashboard-service",
  "version": "0.1.0"
}
```

---

### Dashboard Stats

```http
GET /api/dashboard/stats
```

Get dashboard statistics for the authenticated user.

**Response:**
```json
{
  "applications": {
    "total": 125,
    "pending": 23,
    "applied": 89,
    "interviewing": 8,
    "rejected": 5
  },
  "successRate": 0.71,
  "responseRate": 0.34,
  "thisWeek": {
    "applications": 15,
    "responses": 3,
    "interviews": 2
  },
  "topPlatforms": [
    { "platform": "linkedin", "count": 45 },
    { "platform": "glassdoor", "count": 32 },
    { "platform": "wellfound", "count": 28 }
  ],
  "recentApplications": [
    {
      "id": "app-123",
      "company": "Tech Corp",
      "title": "Senior Engineer",
      "status": "applied",
      "appliedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Monitoring Service (Port 8001)

System monitoring and metrics collection.

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
    "message_queue": "healthy",
    "redis": "healthy"
  }
}
```

---

### Metrics

```http
GET /metrics
```

Get system and application metrics.

**Response:**
```json
{
  "applications": {
    "processed_total": 1234,
    "successful_total": 987,
    "failed_total": 47,
    "pending": 200
  },
  "performance": {
    "average_processing_time_ms": 2345.67,
    "queue_depth": 12,
    "throughput_per_minute": 8.5
  },
  "system": {
    "cpu_usage_percent": 45.2,
    "memory_usage_mb": 512,
    "uptime_seconds": 86400
  },
  "platforms": {
    "linkedin": { "requests": 500, "success_rate": 0.95 },
    "glassdoor": { "requests": 300, "success_rate": 0.92 }
  }
}
```

---

## Platform Adapters

### LinkedIn Adapter Usage

```javascript
// JavaScript SDK Example
const { LinkedInAdapter } = require('@ajob4agent/adapters');

const adapter = new LinkedInAdapter({
  email: process.env.LINKEDIN_EMAIL,
  password: process.env.LINKEDIN_PASSWORD
});

// Search for jobs
const jobs = await adapter.searchJobs({
  query: 'software engineer',
  location: 'San Francisco',
  filters: {
    experienceLevel: 'senior',
    datePosted: 'week'
  }
});

// Apply to a job
const result = await adapter.applyToJob({
  jobId: 'li-123456',
  resume: resumeContent,
  coverLetter: coverLetterContent
});
```

**API Equivalent:**
```bash
curl -X POST "http://localhost:8080/api/jobs/platform/linkedin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "searchTerm": "software engineer",
    "location": "San Francisco",
    "experienceLevel": "senior",
    "datePosted": "week"
  }'
```

---

### Glassdoor Adapter Usage

```javascript
const { GlassdoorAdapter } = require('@ajob4agent/adapters');

const adapter = new GlassdoorAdapter({
  partnerId: process.env.GLASSDOOR_PARTNER_ID,
  key: process.env.GLASSDOOR_KEY
});

// Search jobs with company insights
const jobs = await adapter.searchJobs({
  query: 'software engineer',
  location: 'San Francisco',
  includeCompanyInfo: true
});

// Get company details
const company = await adapter.getCompanyInfo('tech-corp');
```

---

### Form Fill Engine Usage

```javascript
const { FormFillEngine } = require('@ajob4agent/form-fill');

const engine = new FormFillEngine({
  browser: 'chromium',
  headless: true
});

// Auto-fill application form
const result = await engine.fillForm({
  url: 'https://careers.company.com/apply/123',
  data: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    resume: resumeBuffer,
    coverLetter: coverLetterText,
    customFields: {
      'years_experience': '7',
      'visa_sponsorship': 'no'
    }
  },
  options: {
    submitForm: true,
    captureScreenshot: true
  }
});
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-12345"
  }
}
```

### HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 200 | OK | Successful request |
| 201 | CREATED | Resource created |
| 400 | BAD_REQUEST | Invalid request |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict |
| 422 | UNPROCESSABLE | Validation failed |
| 429 | TOO_MANY_REQUESTS | Rate limited |
| 500 | INTERNAL_ERROR | Server error |
| 502 | BAD_GATEWAY | Service unavailable |
| 503 | SERVICE_UNAVAILABLE | Temporarily unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_ERROR` | Invalid or missing credentials |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND_ERROR` | Resource not found |
| `CONFLICT_ERROR` | Resource already exists |
| `RATE_LIMIT_ERROR` | Rate limit exceeded |
| `PLATFORM_ERROR` | External platform error |
| `INTERNAL_ERROR` | Internal server error |

---

## Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 1 minute |
| Job Search | 30 requests | 15 minutes |
| LLM Endpoints | 50 requests | 1 hour |
| File Upload | 10 requests | 5 minutes |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705321200
```

### Rate Limit Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Rate limit exceeded. Please try again later.",
    "retryAfter": 900
  }
}
```

---

## Webhooks

### Configuring Webhooks

```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["application.submitted", "application.updated", "job.matched"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `job.discovered` | New job found matching criteria |
| `job.matched` | Job matched user preferences |
| `application.submitted` | Application successfully submitted |
| `application.updated` | Application status changed |
| `outreach.sent` | Recruiter outreach message sent |
| `outreach.response` | Received response to outreach |

### Webhook Payload

```json
{
  "event": "application.submitted",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "applicationId": "app-202",
    "jobId": "job-123",
    "platform": "linkedin",
    "company": "Tech Corp",
    "title": "Senior Software Engineer",
    "status": "submitted"
  }
}
```

### Webhook Security

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

---

## SDKs and Client Libraries

### Python SDK

```python
from ajob4agent import Client

client = Client(api_key="your-api-key")

# Search jobs
jobs = client.jobs.search(
    query="software engineer",
    location="San Francisco",
    platforms=["linkedin", "glassdoor"]
)

# Tailor resume
result = client.llm.tailor_resume(
    job_id="job-123",
    resume="Your resume content..."
)
```

### JavaScript/TypeScript SDK

```typescript
import { AJOB4AGENTClient } from '@ajob4agent/client';

const client = new AJOB4AGENTClient({
  apiKey: 'your-api-key'
});

// Search jobs
const jobs = await client.jobs.search({
  query: 'software engineer',
  location: 'San Francisco'
});

// Submit application
const application = await client.applications.submit({
  jobId: 'job-123',
  resumeId: 'resume-456'
});
```

---

## OpenAPI/Swagger

Interactive API documentation is available at:

- **LLM Service:** http://localhost:8000/docs
- **Agent Orchestrator:** http://localhost:8080/docs (when enabled)

These provide:
- Interactive API testing
- Schema documentation
- Request/response examples
- Authentication helpers

---

## Support

For API support and questions:

- 📖 [Full Documentation](https://docs.ajob4agent.com)
- 🐛 [Report Issues](https://github.com/groupthinking/AJOB4AGENT/issues)
- 💬 [Community Discord](https://discord.gg/ajob4agent)
