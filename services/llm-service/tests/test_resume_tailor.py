"""Tests for resume tailoring service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from src.services.resume_tailor import ResumeTailorService
from src.services.openai_client import OpenAIClientError
from src.models.resume import Resume, Experience
from src.models.job import JobDescription, TailoringOptions


class TestResumeTailorService:
    """Tests for ResumeTailorService."""

    @pytest.fixture
    def mock_openai_client(self, mock_openai_response):
        """Create a mock OpenAI client."""
        client = AsyncMock()
        client.chat_completion.return_value = (json.dumps(mock_openai_response), 1250)
        client.parse_json_response.return_value = mock_openai_response
        return client

    @pytest.mark.asyncio
    async def test_tailor_resume_success(
        self,
        sample_resume,
        sample_job_description,
        mock_openai_client,
        mock_openai_response
    ):
        """Test successful resume tailoring."""
        service = ResumeTailorService(openai_client=mock_openai_client)
        
        response = await service.tailor_resume(
            resume=sample_resume,
            job_description=sample_job_description,
        )
        
        assert response.tailored_resume.fit_score == 87
        assert response.tokens_used == 1250
        assert response.model == "gpt-4"
        assert len(response.suggestions) == 3
        assert "Python" in response.tailored_resume.skills_highlighted

    @pytest.mark.asyncio
    async def test_tailor_resume_with_options(
        self,
        sample_resume,
        sample_job_description,
        mock_openai_client
    ):
        """Test resume tailoring with custom options."""
        service = ResumeTailorService(openai_client=mock_openai_client)
        options = TailoringOptions(model="gpt-3.5-turbo", tone="casual")
        
        await service.tailor_resume(
            resume=sample_resume,
            job_description=sample_job_description,
            options=options,
        )
        
        # Verify the model was passed to the client
        mock_openai_client.chat_completion.assert_called_once()
        call_kwargs = mock_openai_client.chat_completion.call_args[1]
        assert call_kwargs["model"] == "gpt-3.5-turbo"

    @pytest.mark.asyncio
    async def test_tailor_resume_openai_error(
        self,
        sample_resume,
        sample_job_description
    ):
        """Test handling of OpenAI errors."""
        mock_client = AsyncMock()
        mock_client.chat_completion.side_effect = OpenAIClientError("API Error")
        
        service = ResumeTailorService(openai_client=mock_client)
        
        with pytest.raises(OpenAIClientError):
            await service.tailor_resume(
                resume=sample_resume,
                job_description=sample_job_description,
            )

    @pytest.mark.asyncio
    async def test_tailor_resume_fit_score_bounds(
        self,
        sample_resume,
        sample_job_description
    ):
        """Test that fit score is clamped to 0-100."""
        mock_client = AsyncMock()
        
        # Test with score > 100
        response_over = {
            "tailored_resume": {
                "summary": "Test summary",
                "experience": [],
                "skills_highlighted": [],
                "keywords_matched": [],
                "fit_score": 150
            },
            "suggestions": []
        }
        mock_client.chat_completion.return_value = (json.dumps(response_over), 100)
        mock_client.parse_json_response.return_value = response_over
        
        service = ResumeTailorService(openai_client=mock_client)
        result = await service.tailor_resume(sample_resume, sample_job_description)
        
        assert result.tailored_resume.fit_score == 100

    def test_calculate_fit_score_high_match(
        self,
        sample_resume,
        sample_job_description
    ):
        """Test fit score calculation with high match."""
        service = ResumeTailorService(openai_client=AsyncMock())
        
        score = service.calculate_fit_score(sample_resume, sample_job_description)
        
        # Should have decent score due to matching keywords
        assert 40 <= score <= 100

    def test_calculate_fit_score_low_match(self, sample_resume):
        """Test fit score calculation with low match."""
        service = ResumeTailorService(openai_client=AsyncMock())
        
        # Create a job with unmatched requirements
        unrelated_job = JobDescription(
            title="Veterinarian",
            company="Pet Care Inc",
            description="Looking for an experienced veterinarian",
            requirements=[
                "DVM degree required",
                "5+ years veterinary experience",
                "Large animal experience preferred"
            ],
            preferred=["Surgery certification", "Equine specialist"]
        )
        
        score = service.calculate_fit_score(sample_resume, unrelated_job)
        
        # Should have low score due to no matching keywords
        assert score <= 50

    def test_extract_keywords_finds_matches(
        self,
        sample_resume,
        sample_job_description
    ):
        """Test keyword extraction finds matching terms."""
        service = ResumeTailorService(openai_client=AsyncMock())
        
        keywords = service.extract_keywords(sample_resume, sample_job_description)
        
        # Should find common keywords
        assert len(keywords) > 0
        # Common words between resume and job should be found
        lowercase_keywords = [k.lower() for k in keywords]
        assert any("python" in k or "engineer" in k for k in lowercase_keywords)

    def test_extract_keywords_no_matches(self, sample_resume):
        """Test keyword extraction with no matches."""
        service = ResumeTailorService(openai_client=AsyncMock())
        
        unrelated_job = JobDescription(
            title="Chef",
            company="Restaurant",
            description="Culinary excellence required",
            requirements=["Culinary degree", "Kitchen experience"]
        )
        
        keywords = service.extract_keywords(sample_resume, unrelated_job)
        
        # Should find few or no matches
        assert len(keywords) < 5


class TestResumeTailorEndpoint:
    """Tests for resume tailoring API endpoint."""

    def test_health_endpoint(self, test_client):
        """Test health check endpoint."""
        response = test_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "llm-service"

    def test_tailor_endpoint_validation_error(self, test_client):
        """Test that invalid input returns validation error."""
        response = test_client.post(
            "/api/v1/resume/tailor",
            json={"invalid": "data"}
        )
        assert response.status_code == 422

    @patch('src.routers.resume.ResumeTailorService')
    def test_tailor_endpoint_success(
        self,
        mock_service_class,
        test_client,
        sample_resume,
        sample_job_description,
        mock_openai_response
    ):
        """Test successful resume tailoring via endpoint."""
        from src.models.job import TailoredResume, TailoredExperience, TailorResumeResponse
        
        # Setup mock service
        mock_service = AsyncMock()
        mock_response = TailorResumeResponse(
            tailored_resume=TailoredResume(
                summary="Tailored summary",
                experience=[],
                skills_highlighted=["Python", "AWS"],
                keywords_matched=["scalable"],
                fit_score=85
            ),
            suggestions=["Add more metrics"],
            tokens_used=1000,
            model="gpt-4"
        )
        mock_service.tailor_resume.return_value = mock_response
        mock_service_class.return_value = mock_service
        
        request_data = {
            "resume": sample_resume.model_dump(),
            "job_description": sample_job_description.model_dump()
        }
        
        response = test_client.post(
            "/api/v1/resume/tailor",
            json=request_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["tailored_resume"]["fit_score"] == 85
        assert data["tokens_used"] == 1000

    @patch('src.routers.resume.ResumeTailorService')
    def test_tailor_endpoint_openai_error(
        self,
        mock_service_class,
        test_client,
        sample_resume,
        sample_job_description
    ):
        """Test handling of OpenAI errors in endpoint."""
        mock_service = AsyncMock()
        mock_service.tailor_resume.side_effect = OpenAIClientError("API unavailable")
        mock_service_class.return_value = mock_service
        
        request_data = {
            "resume": sample_resume.model_dump(),
            "job_description": sample_job_description.model_dump()
        }
        
        response = test_client.post(
            "/api/v1/resume/tailor",
            json=request_data
        )
        
        assert response.status_code == 503
        assert "temporarily unavailable" in response.json()["detail"]["error"]
