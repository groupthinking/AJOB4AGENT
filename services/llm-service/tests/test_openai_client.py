"""Tests for OpenAI client wrapper."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.openai_client import OpenAIClient, OpenAIClientError


class TestOpenAIClient:
    """Tests for OpenAI client wrapper."""

    @pytest.fixture
    def mock_settings(self):
        """Mock settings for testing."""
        with patch('src.services.openai_client.get_settings') as mock:
            settings = MagicMock()
            settings.openai_api_key = "test-api-key"
            settings.openai_model = "gpt-4"
            settings.openai_max_tokens = 2000
            settings.openai_temperature = 0.7
            settings.max_retries = 3
            settings.retry_delay = 0.01  # Fast retries for testing
            mock.return_value = settings
            yield settings

    @pytest.fixture
    def mock_async_openai(self):
        """Mock the AsyncOpenAI client."""
        with patch('src.services.openai_client.AsyncOpenAI') as mock:
            yield mock

    def test_init_without_api_key_raises_error(self, mock_settings):
        """Test that initialization fails without API key."""
        mock_settings.openai_api_key = ""
        
        with pytest.raises(OpenAIClientError, match="API key is required"):
            OpenAIClient()

    def test_init_with_api_key_succeeds(self, mock_settings, mock_async_openai):
        """Test that initialization succeeds with API key."""
        client = OpenAIClient()
        
        assert client.api_key == "test-api-key"
        assert client.model == "gpt-4"
        assert client.max_tokens == 2000
        assert client.temperature == 0.7

    def test_init_with_override_values(self, mock_settings, mock_async_openai):
        """Test that init accepts override values."""
        client = OpenAIClient(
            api_key="custom-key",
            model="gpt-3.5-turbo",
            max_tokens=1000,
            temperature=0.5
        )
        
        assert client.api_key == "custom-key"
        assert client.model == "gpt-3.5-turbo"
        assert client.max_tokens == 1000
        assert client.temperature == 0.5

    @pytest.mark.asyncio
    async def test_chat_completion_success(self, mock_settings, mock_async_openai):
        """Test successful chat completion."""
        # Setup mock response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"result": "test"}'
        mock_response.usage.total_tokens = 100
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_async_openai.return_value = mock_client
        
        client = OpenAIClient()
        content, tokens = await client.chat_completion(
            system_prompt="You are a helpful assistant.",
            user_prompt="Test prompt"
        )
        
        assert content == '{"result": "test"}'
        assert tokens == 100
        
        # Verify the call was made with correct parameters
        mock_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert call_kwargs["model"] == "gpt-4"
        assert len(call_kwargs["messages"]) == 2
        assert call_kwargs["messages"][0]["role"] == "system"
        assert call_kwargs["messages"][1]["role"] == "user"

    @pytest.mark.asyncio
    async def test_chat_completion_with_json_response(self, mock_settings, mock_async_openai):
        """Test chat completion with JSON response format."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"result": "json"}'
        mock_response.usage.total_tokens = 50
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_async_openai.return_value = mock_client
        
        client = OpenAIClient()
        await client.chat_completion(
            system_prompt="System",
            user_prompt="User",
            json_response=True
        )
        
        call_kwargs = mock_client.chat.completions.create.call_args[1]
        assert call_kwargs["response_format"] == {"type": "json_object"}

    @pytest.mark.asyncio
    async def test_parse_json_response_valid(self, mock_settings, mock_async_openai):
        """Test parsing valid JSON response."""
        client = OpenAIClient()
        result = await client.parse_json_response('{"key": "value"}')
        assert result == {"key": "value"}

    @pytest.mark.asyncio
    async def test_parse_json_response_with_markdown(self, mock_settings, mock_async_openai):
        """Test parsing JSON wrapped in markdown code blocks."""
        client = OpenAIClient()
        
        # Test with ```json block
        markdown_json = '```json\n{"key": "value"}\n```'
        result = await client.parse_json_response(markdown_json)
        assert result == {"key": "value"}
        
        # Test with plain ``` block
        plain_markdown = '```\n{"key": "value2"}\n```'
        result = await client.parse_json_response(plain_markdown)
        assert result == {"key": "value2"}

    @pytest.mark.asyncio
    async def test_parse_json_response_invalid_raises_error(self, mock_settings, mock_async_openai):
        """Test that invalid JSON raises error."""
        client = OpenAIClient()
        
        with pytest.raises(OpenAIClientError, match="Failed to parse JSON"):
            await client.parse_json_response("not valid json")

    @pytest.mark.asyncio
    async def test_retry_on_rate_limit(self, mock_settings, mock_async_openai):
        """Test that rate limit errors trigger retry."""
        from openai import RateLimitError
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "success"
        mock_response.usage.total_tokens = 50
        
        mock_client = AsyncMock()
        # First two calls fail, third succeeds
        mock_client.chat.completions.create.side_effect = [
            RateLimitError("Rate limit exceeded", response=MagicMock(), body={}),
            RateLimitError("Rate limit exceeded", response=MagicMock(), body={}),
            mock_response
        ]
        mock_async_openai.return_value = mock_client
        
        client = OpenAIClient()
        content, tokens = await client.chat_completion(
            system_prompt="System",
            user_prompt="User"
        )
        
        assert content == "success"
        assert mock_client.chat.completions.create.call_count == 3

    @pytest.mark.asyncio
    async def test_retry_exhausted_raises_error(self, mock_settings, mock_async_openai):
        """Test that exhausted retries raise error."""
        from openai import RateLimitError
        
        mock_client = AsyncMock()
        # All calls fail
        mock_client.chat.completions.create.side_effect = RateLimitError(
            "Rate limit exceeded", response=MagicMock(), body={}
        )
        mock_async_openai.return_value = mock_client
        
        client = OpenAIClient()
        
        with pytest.raises(OpenAIClientError, match="Failed after 3 retries"):
            await client.chat_completion(
                system_prompt="System",
                user_prompt="User"
            )
