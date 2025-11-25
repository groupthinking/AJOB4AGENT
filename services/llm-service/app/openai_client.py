"""
OpenAI client for resume tailoring functionality.
Provides integration with OpenAI GPT models for AI-powered resume tailoring.
"""
import os
from typing import Optional
from openai import OpenAI
import structlog

logger = structlog.get_logger()


class OpenAIClient:
    """Client for interacting with OpenAI API for resume tailoring."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize the OpenAI client.

        Args:
            api_key: OpenAI API key. Defaults to OPENAI_API_KEY env var.
            model: Model to use. Defaults to LLM_MODEL env var or 'gpt-4'.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("LLM_MODEL", "gpt-4")
        self.max_tokens = int(os.getenv("LLM_MAX_TOKENS", "4000"))
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.7"))

        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.client = OpenAI(api_key=self.api_key)
        logger.info(
            "OpenAI client initialized",
            model=self.model,
            max_tokens=self.max_tokens,
        )

    def tailor_resume(
        self,
        resume: str,
        job_description: str,
    ) -> dict:
        """
        Tailor a resume to match a job description using multi-part prompts.

        Args:
            resume: The original resume content.
            job_description: The job description to tailor the resume for.

        Returns:
            dict containing tailored_resume with role_fit, experience_justification,
            and summary sections.
        """
        logger.info("Starting resume tailoring with OpenAI")

        # Build multi-part prompt for high-relevance tailoring
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(resume, job_description)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )

            tailored_content = response.choices[0].message.content
            logger.info(
                "Resume tailoring completed",
                tokens_used=response.usage.total_tokens if response.usage else None,
            )

            return self._parse_tailored_response(tailored_content)

        except Exception as e:
            logger.error("OpenAI API call failed", error=str(e))
            raise

    def _build_system_prompt(self) -> str:
        """Build the system prompt for resume tailoring."""
        return """You are an expert resume writer and career coach. Your task is to tailor resumes to match specific job descriptions while maintaining authenticity and professionalism.

When tailoring a resume, you must:
1. Analyze the job description to identify key requirements, skills, and qualifications
2. Highlight relevant experience and skills from the original resume that match the job
3. Reframe existing experience to better align with the job requirements
4. Use industry-specific keywords from the job description naturally
5. Maintain truthfulness - never fabricate experience or skills

Your response MUST be structured with three clearly labeled sections:
1. ROLE_FIT: A brief analysis of how the candidate fits the role (2-3 sentences)
2. EXPERIENCE_JUSTIFICATION: Key experiences and achievements that justify the candidate for this role (bullet points)
3. SUMMARY: A tailored professional summary for the resume (2-3 sentences)
4. TAILORED_RESUME: The complete tailored resume content"""

    def _build_user_prompt(self, resume: str, job_description: str) -> str:
        """Build the user prompt with resume and job description."""
        return f"""Please tailor the following resume for the job description provided.

=== ORIGINAL RESUME ===
{resume}

=== JOB DESCRIPTION ===
{job_description}

=== INSTRUCTIONS ===
Analyze the job description carefully and tailor the resume to highlight relevant skills and experience. Structure your response with the following sections:
- ROLE_FIT: Brief analysis of candidate-role alignment
- EXPERIENCE_JUSTIFICATION: Key matching experiences as bullet points
- SUMMARY: Tailored professional summary
- TAILORED_RESUME: Complete tailored resume

Ensure the tailored resume maintains professional formatting and authenticity."""

    def _parse_tailored_response(self, response: str) -> dict:
        """Parse the structured response from OpenAI into sections."""
        sections = {
            "role_fit": "",
            "experience_justification": "",
            "summary": "",
            "tailored_resume": "",
        }

        # Parse sections from response
        current_section = None
        current_content = []

        for line in response.split("\n"):
            line_upper = line.upper().strip()

            if "ROLE_FIT:" in line_upper or line_upper == "ROLE_FIT":
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "role_fit"
                current_content = []
                # Check if content is on the same line
                if ":" in line:
                    after_colon = line.split(":", 1)[1].strip()
                    if after_colon:
                        current_content.append(after_colon)
            elif (
                "EXPERIENCE_JUSTIFICATION:" in line_upper
                or line_upper == "EXPERIENCE_JUSTIFICATION"
            ):
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "experience_justification"
                current_content = []
                if ":" in line:
                    after_colon = line.split(":", 1)[1].strip()
                    if after_colon:
                        current_content.append(after_colon)
            elif "SUMMARY:" in line_upper or line_upper == "SUMMARY":
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "summary"
                current_content = []
                if ":" in line:
                    after_colon = line.split(":", 1)[1].strip()
                    if after_colon:
                        current_content.append(after_colon)
            elif "TAILORED_RESUME:" in line_upper or line_upper == "TAILORED_RESUME":
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "tailored_resume"
                current_content = []
                if ":" in line:
                    after_colon = line.split(":", 1)[1].strip()
                    if after_colon:
                        current_content.append(after_colon)
            elif current_section:
                current_content.append(line)

        # Save the last section
        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        # If parsing failed, put the entire response in tailored_resume
        if not any(sections.values()):
            sections["tailored_resume"] = response

        return sections


# Singleton instance for reuse
_client_instance: Optional[OpenAIClient] = None


def get_openai_client() -> OpenAIClient:
    """Get or create the OpenAI client singleton."""
    global _client_instance
    if _client_instance is None:
        _client_instance = OpenAIClient()
    return _client_instance


def is_openai_configured() -> bool:
    """Check if OpenAI API key is configured."""
    return bool(os.getenv("OPENAI_API_KEY"))
