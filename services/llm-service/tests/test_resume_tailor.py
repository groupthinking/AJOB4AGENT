"""
Tests for the LLM service resume tailoring endpoint.
"""
import pytest
from unittest.mock import patch, MagicMock
import os
import sys

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from fastapi.testclient import TestClient


# Sample test data - 3 resume/job description samples as per requirements
SAMPLE_RESUME_1 = """
John Doe
Software Engineer

Experience:
- Senior Developer at Tech Corp (2020-Present)
  - Built scalable microservices using Python and FastAPI
  - Led team of 5 engineers on cloud migration project
  - Reduced deployment time by 60% through CI/CD improvements

- Developer at StartupXYZ (2018-2020)
  - Full-stack development with React and Node.js
  - Implemented REST APIs for mobile applications

Skills: Python, JavaScript, AWS, Docker, Kubernetes, PostgreSQL
Education: BS Computer Science, State University
"""

SAMPLE_JOB_DESC_1 = """
Senior Software Engineer - Backend

Requirements:
- 5+ years of experience in software development
- Strong proficiency in Python and FastAPI
- Experience with microservices architecture
- Cloud platform experience (AWS preferred)
- Knowledge of containerization (Docker, Kubernetes)

Responsibilities:
- Design and develop scalable backend services
- Lead technical initiatives and mentor junior developers
- Collaborate with product and design teams
"""

SAMPLE_RESUME_2 = """
Jane Smith
Data Scientist

Experience:
- ML Engineer at DataCo (2021-Present)
  - Developed predictive models for customer churn
  - Implemented NLP pipelines for text classification
  - Built real-time ML inference APIs

Skills: Python, TensorFlow, PyTorch, SQL, Spark
Education: MS Data Science, Tech University
"""

SAMPLE_JOB_DESC_2 = """
Machine Learning Engineer

Requirements:
- 3+ years of ML/AI experience
- Strong Python skills
- Experience with deep learning frameworks
- NLP experience preferred

Responsibilities:
- Build and deploy ML models
- Design ML pipelines
"""

SAMPLE_RESUME_3 = """
Alex Johnson
DevOps Engineer

Experience:
- Infrastructure Engineer at CloudCo (2019-Present)
  - Managed Kubernetes clusters across multiple regions
  - Automated infrastructure with Terraform
  - Implemented monitoring with Prometheus and Grafana

Skills: Kubernetes, Docker, Terraform, AWS, Python, Bash
Education: BS Computer Engineering
"""

SAMPLE_JOB_DESC_3 = """
Site Reliability Engineer

Requirements:
- Experience with Kubernetes and container orchestration
- Infrastructure as Code experience
- Monitoring and observability tools experience
- Scripting skills (Python or Bash)

Responsibilities:
- Maintain production infrastructure
- Implement SRE best practices
"""


class TestResumeTailorEndpoint:
    """Tests for the /resume/tailor endpoint."""

    @pytest.fixture
    def client(self):
        """Create a test client with allowed host for testing."""
        # Set allowed hosts to include testserver before importing
        with patch.dict(os.environ, {"ALLOWED_HOSTS": "localhost,127.0.0.1,llm-service,testserver"}):
            # Need to reimport app to pick up the new env var
            import importlib
            import main
            importlib.reload(main)
            return TestClient(main.app)

    def test_tailor_endpoint_missing_api_key(self, client):
        """Test that endpoint returns 503 when OPENAI_API_KEY is not set."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
            # Need to reimport to pick up env changes
            response = client.post(
                "/resume/tailor",
                json={"resume": SAMPLE_RESUME_1, "job_desc": SAMPLE_JOB_DESC_1},
            )
            assert response.status_code == 503
            assert "OPENAI_API_KEY" in response.json()["detail"]

    def test_tailor_endpoint_validation_error_short_resume(self, client):
        """Test validation error for short resume."""
        response = client.post(
            "/resume/tailor", json={"resume": "short", "job_desc": SAMPLE_JOB_DESC_1}
        )
        assert response.status_code == 422

    def test_tailor_endpoint_validation_error_short_job_desc(self, client):
        """Test validation error for short job description."""
        response = client.post(
            "/resume/tailor", json={"resume": SAMPLE_RESUME_1, "job_desc": "short"}
        )
        assert response.status_code == 422

    def test_tailor_endpoint_validation_error_missing_fields(self, client):
        """Test validation error when fields are missing."""
        response = client.post("/resume/tailor", json={"resume": SAMPLE_RESUME_1})
        assert response.status_code == 422

    @patch("main.OpenAIClient")
    @patch("main.is_openai_configured")
    def test_tailor_endpoint_success_sample_1(
        self, mock_is_configured, mock_client_class, client
    ):
        """Test successful resume tailoring with sample 1."""
        mock_is_configured.return_value = True

        mock_client = MagicMock()
        mock_client.model = "gpt-4"
        mock_client.tailor_resume.return_value = {
            "role_fit": "Strong match for backend role.",
            "experience_justification": "- 5+ years experience\n- Python/FastAPI expert",
            "summary": "Experienced backend engineer with cloud expertise.",
            "tailored_resume": "Tailored resume content for Software Engineer role.",
        }
        mock_client_class.return_value = mock_client

        response = client.post(
            "/resume/tailor",
            json={"resume": SAMPLE_RESUME_1, "job_desc": SAMPLE_JOB_DESC_1},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["role_fit"] == "Strong match for backend role."
        assert data["llm_model_used"] == "gpt-4"
        assert "tailored_resume" in data

    @patch("main.OpenAIClient")
    @patch("main.is_openai_configured")
    def test_tailor_endpoint_success_sample_2(
        self, mock_is_configured, mock_client_class, client
    ):
        """Test successful resume tailoring with sample 2 (ML role)."""
        mock_is_configured.return_value = True

        mock_client = MagicMock()
        mock_client.model = "gpt-3.5-turbo"
        mock_client.tailor_resume.return_value = {
            "role_fit": "Excellent fit for ML Engineer position.",
            "experience_justification": "- ML model development\n- NLP pipeline experience",
            "summary": "ML Engineer with NLP and deep learning expertise.",
            "tailored_resume": "Tailored resume content for ML Engineer role.",
        }
        mock_client_class.return_value = mock_client

        response = client.post(
            "/resume/tailor",
            json={"resume": SAMPLE_RESUME_2, "job_desc": SAMPLE_JOB_DESC_2},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "ML Engineer" in data["role_fit"] or "ML" in data["summary"]

    @patch("main.OpenAIClient")
    @patch("main.is_openai_configured")
    def test_tailor_endpoint_success_sample_3(
        self, mock_is_configured, mock_client_class, client
    ):
        """Test successful resume tailoring with sample 3 (DevOps/SRE role)."""
        mock_is_configured.return_value = True

        mock_client = MagicMock()
        mock_client.model = "gpt-4"
        mock_client.tailor_resume.return_value = {
            "role_fit": "Strong candidate for SRE position.",
            "experience_justification": "- Kubernetes expertise\n- Terraform IaC experience",
            "summary": "SRE professional with infrastructure automation skills.",
            "tailored_resume": "Tailored resume content for SRE role.",
        }
        mock_client_class.return_value = mock_client

        response = client.post(
            "/resume/tailor",
            json={"resume": SAMPLE_RESUME_3, "job_desc": SAMPLE_JOB_DESC_3},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    @patch("main.OpenAIClient")
    @patch("main.is_openai_configured")
    def test_tailor_endpoint_api_error(
        self, mock_is_configured, mock_client_class, client
    ):
        """Test handling of OpenAI API errors."""
        mock_is_configured.return_value = True

        mock_client = MagicMock()
        mock_client.tailor_resume.side_effect = Exception("API Error: Rate limit exceeded")
        mock_client_class.return_value = mock_client

        response = client.post(
            "/resume/tailor",
            json={"resume": SAMPLE_RESUME_1, "job_desc": SAMPLE_JOB_DESC_1},
        )

        assert response.status_code == 500
        assert "Rate limit exceeded" in response.json()["detail"]


class TestOpenAIClient:
    """Tests for the OpenAI client module."""

    def test_is_openai_configured_true(self):
        """Test is_openai_configured returns True when key is set."""
        from openai_client import is_openai_configured

        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            assert is_openai_configured() is True

    def test_is_openai_configured_false(self):
        """Test is_openai_configured returns False when key is not set."""
        from openai_client import is_openai_configured

        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
            # Clear the env var
            env_copy = os.environ.copy()
            if "OPENAI_API_KEY" in env_copy:
                del env_copy["OPENAI_API_KEY"]
            with patch.dict(os.environ, env_copy, clear=True):
                assert is_openai_configured() is False

    def test_openai_client_init_without_api_key(self):
        """Test OpenAI client raises error without API key."""
        from openai_client import OpenAIClient

        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                OpenAIClient()

    @patch("openai_client.OpenAI")
    def test_openai_client_init_with_api_key(self, mock_openai):
        """Test OpenAI client initializes with API key."""
        from openai_client import OpenAIClient

        with patch.dict(
            os.environ,
            {"OPENAI_API_KEY": "test-key", "LLM_MODEL": "gpt-3.5-turbo"},
        ):
            client = OpenAIClient()
            assert client.api_key == "test-key"
            assert client.model == "gpt-3.5-turbo"

    def test_parse_tailored_response(self):
        """Test parsing of structured response."""
        from openai_client import OpenAIClient

        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            with patch("openai_client.OpenAI"):
                client = OpenAIClient()

                response = """ROLE_FIT: This candidate is a strong match.

EXPERIENCE_JUSTIFICATION:
- 5+ years of Python experience
- Led backend team

SUMMARY: Experienced backend developer.

TAILORED_RESUME:
John Doe
Senior Software Engineer
...tailored content...
"""
                result = client._parse_tailored_response(response)

                assert "strong match" in result["role_fit"].lower()
                assert "Python" in result["experience_justification"]
                assert "backend" in result["summary"].lower()
                assert "John Doe" in result["tailored_resume"]


class TestHealthEndpoint:
    """Tests for the health endpoint."""

    @pytest.fixture
    def client(self):
        """Create a test client with allowed host for testing."""
        with patch.dict(os.environ, {"ALLOWED_HOSTS": "localhost,127.0.0.1,llm-service,testserver"}):
            import importlib
            import main
            importlib.reload(main)
            return TestClient(main.app)

    def test_health_endpoint(self, client):
        """Test health endpoint returns correct response."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "llm-service"
        assert "timestamp" in data
