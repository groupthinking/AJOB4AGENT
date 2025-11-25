"""OpenAI API client wrapper with retry logic and error handling."""
import json
import logging
from typing import Optional
import asyncio

from openai import AsyncOpenAI, OpenAIError, RateLimitError, APIConnectionError, APITimeoutError

from src.config import get_settings

logger = logging.getLogger(__name__)


class OpenAIClientError(Exception):
    """Custom exception for OpenAI client errors."""
    pass


class OpenAIClient:
    """Async OpenAI client with retry logic and error handling."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.openai_api_key
        self.model = model or settings.openai_model
        self.max_tokens = max_tokens or settings.openai_max_tokens
        self.temperature = temperature or settings.openai_temperature
        self.max_retries = settings.max_retries
        self.retry_delay = settings.retry_delay
        
        if not self.api_key:
            raise OpenAIClientError("OpenAI API key is required")
        
        self._client = AsyncOpenAI(api_key=self.api_key)
    
    async def _make_request_with_retry(
        self,
        messages: list,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        response_format: Optional[dict] = None,
    ) -> tuple[str, int]:
        """Make a request to OpenAI with retry logic.
        
        Returns:
            Tuple of (response_content, tokens_used)
        """
        model = model or self.model
        max_tokens = max_tokens or self.max_tokens
        temperature = temperature or self.temperature
        
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                
                if response_format:
                    kwargs["response_format"] = response_format
                
                response = await self._client.chat.completions.create(**kwargs)
                
                content = response.choices[0].message.content
                tokens_used = response.usage.total_tokens if response.usage else 0
                
                logger.info(
                    "OpenAI request successful",
                    extra={
                        "model": model,
                        "tokens_used": tokens_used,
                        "attempt": attempt + 1,
                    }
                )
                
                return content, tokens_used
                
            except RateLimitError as e:
                last_exception = e
                wait_time = self.retry_delay * (2 ** attempt)  # Exponential backoff
                logger.warning(
                    f"Rate limit hit, retrying in {wait_time}s",
                    extra={"attempt": attempt + 1, "error": str(e)}
                )
                await asyncio.sleep(wait_time)
                
            except APIConnectionError as e:
                last_exception = e
                wait_time = self.retry_delay * (2 ** attempt)
                logger.warning(
                    f"Connection error, retrying in {wait_time}s",
                    extra={"attempt": attempt + 1, "error": str(e)}
                )
                await asyncio.sleep(wait_time)
                
            except APITimeoutError as e:
                last_exception = e
                wait_time = self.retry_delay * (2 ** attempt)
                logger.warning(
                    f"Timeout error, retrying in {wait_time}s",
                    extra={"attempt": attempt + 1, "error": str(e)}
                )
                await asyncio.sleep(wait_time)
                
            except OpenAIError as e:
                logger.error(f"OpenAI API error: {e}")
                raise OpenAIClientError(f"OpenAI API error: {e}") from e
        
        # All retries exhausted
        logger.error(
            f"All retries exhausted after {self.max_retries} attempts",
            extra={"last_error": str(last_exception)}
        )
        raise OpenAIClientError(
            f"Failed after {self.max_retries} retries: {last_exception}"
        ) from last_exception
    
    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        json_response: bool = False,
    ) -> tuple[str, int]:
        """Send a chat completion request.
        
        Args:
            system_prompt: System message for context
            user_prompt: User message with the task
            model: Model override
            max_tokens: Max tokens override
            temperature: Temperature override
            json_response: Whether to request JSON response format
            
        Returns:
            Tuple of (response_content, tokens_used)
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        response_format = {"type": "json_object"} if json_response else None
        
        return await self._make_request_with_retry(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            response_format=response_format,
        )
    
    async def parse_json_response(self, response: str) -> dict:
        """Parse JSON from response, handling potential formatting issues."""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            if "```json" in response:
                start = response.find("```json") + 7
                end = response.find("```", start)
                if end != -1:
                    json_str = response[start:end].strip()
                    return json.loads(json_str)
            elif "```" in response:
                start = response.find("```") + 3
                end = response.find("```", start)
                if end != -1:
                    json_str = response[start:end].strip()
                    return json.loads(json_str)
            raise OpenAIClientError(f"Failed to parse JSON response: {response[:200]}")
