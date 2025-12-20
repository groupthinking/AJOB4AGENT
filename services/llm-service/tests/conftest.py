"""Pytest fixtures for LLM Service tests."""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from src.models.resume import Resume, Experience, Education
from src.models.job import JobDescription, TailoringOptions


@pytest.fixture
def sample_resume():
    """Create a sample resume for testing."""
    return Resume(
        name="John Doe",
        email="john@example.com",
        phone="555-123-4567",
        location="San Francisco, CA",
        linkedin="https://linkedin.com/in/johndoe",
        summary="Senior software engineer with 8 years of experience building scalable web applications and leading cross-functional teams.",
        experience=[
            Experience(
                title="Senior Software Engineer",
                company="TechCorp Inc",
                start_date="2020-01",
                end_date=None,
                description="Lead development of microservices architecture serving 10M+ users",
                highlights=[
                    "Reduced API latency by 40% through caching optimization",
                    "Mentored team of 5 junior developers",
                    "Implemented CI/CD pipelines reducing deployment time by 60%"
                ]
            ),
            Experience(
                title="Software Engineer",
                company="StartupXYZ",
                start_date="2016-03",
                end_date="2019-12",
                description="Full-stack development using Python and React",
                highlights=[
                    "Built customer analytics dashboard used by 500+ clients",
                    "Developed RESTful APIs handling 1M requests/day"
                ]
            ),
        ],
        skills=["Python", "TypeScript", "AWS", "Docker", "Kubernetes", "PostgreSQL", "React", "Node.js"],
        education=[
            Education(
                degree="B.S. Computer Science",
                institution="University of California, Berkeley",
                graduation_date="2016",
                gpa=3.7,
                highlights=["Dean's List", "Computer Science Honor Society"]
            )
        ],
        certifications=["AWS Solutions Architect", "Kubernetes Administrator"],
        projects=["Open source contributor to FastAPI", "Built personal finance tracking app"]
    )


@pytest.fixture
def sample_job_description():
    """Create a sample job description for testing."""
    return JobDescription(
        title="Staff Software Engineer",
        company="InnovateTech",
        description="""We are looking for a Staff Software Engineer to join our platform team. 
        You will be responsible for designing and building scalable systems that power our 
        growing user base. This is a leadership role where you will mentor other engineers 
        and drive technical decisions.""",
        requirements=[
            "5+ years of software engineering experience",
            "Strong Python or TypeScript skills",
            "Experience with cloud platforms (AWS, GCP, or Azure)",
            "Track record of building scalable systems",
            "Experience mentoring junior engineers"
        ],
        preferred=[
            "Experience with Kubernetes and container orchestration",
            "Background in distributed systems",
            "Open source contributions",
            "Experience at high-growth startups"
        ],
        location="Remote",
        salary_range="$180,000 - $220,000"
    )


@pytest.fixture
def sample_tailoring_options():
    """Create sample tailoring options for testing."""
    return TailoringOptions(
        model="gpt-4",
        focus_areas=["summary", "experience", "skills"],
        tone="professional"
    )


@pytest.fixture
def mock_openai_response():
    """Create a mock OpenAI response for testing."""
    return {
        "tailored_resume": {
            "summary": "Results-driven Staff Software Engineer with 8+ years of experience building and scaling distributed systems. Proven track record of leading cross-functional teams and mentoring engineers to deliver high-impact solutions.",
            "experience": [
                {
                    "title": "Senior Software Engineer",
                    "company": "TechCorp Inc",
                    "start_date": "2020-01",
                    "end_date": None,
                    "description": "Lead architect for microservices platform serving 10M+ users, directly aligned with Staff Engineer responsibilities in designing scalable systems.",
                    "highlights": [
                        "Reduced API latency by 40% through strategic caching optimization, demonstrating expertise in performance tuning",
                        "Mentored team of 5 engineers, fostering technical growth and code quality improvements",
                        "Designed and implemented CI/CD pipelines reducing deployment time by 60%"
                    ]
                }
            ],
            "skills_highlighted": ["Python", "TypeScript", "AWS", "Kubernetes", "Docker"],
            "keywords_matched": ["scalable systems", "mentoring", "cloud platforms", "leadership"],
            "fit_score": 87
        },
        "suggestions": [
            "Consider adding specific metrics for your AWS infrastructure projects to match cloud platform requirements",
            "Highlight any distributed systems work more prominently to match the preferred qualifications",
            "Emphasize the leadership aspect of your current role to align with the Staff level expectations"
        ]
    }


@pytest.fixture
def mock_openai_client():
    """Create a mock OpenAI client for testing."""
    with patch('src.services.openai_client.AsyncOpenAI') as mock:
        client = AsyncMock()
        mock.return_value = client
        yield client


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI application."""
    import os
    # Set required environment variable for testing
    with patch.dict(os.environ, {
        'OPENAI_API_KEY': 'test-api-key',
        'ALLOWED_HOSTS': 'localhost,127.0.0.1,testserver,llm-service'
    }):
        # Clear the settings cache to pick up new env vars
        from src.config import get_settings
        get_settings.cache_clear()
        
        from src.main import app
        client = TestClient(app)
        yield client
        
        # Clear cache after test
        get_settings.cache_clear()
