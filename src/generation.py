import os
import openai
from src.config import settings
from typing import Dict, Optional

def get_openai_client() -> Optional[openai.OpenAI]:
    """
    Initializes and returns the OpenAI client if the API key is available.
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        print("⚠️ Warning: OPENAI_API_KEY is not set. Generation features will be skipped.")
        return None
    return openai.OpenAI(api_key=api_key)

def generate_resume_variant(client: openai.OpenAI, resume_text: str, job_details: Dict) -> Optional[str]:
    """
    Generate a tailored resume Markdown file for a specific job using the provided OpenAI client.
    
    Given a master resume and job details, prompts an LLM to rephrase, reorder, and emphasize existing information to better match the job (quantifying achievements where possible) without inventing new experiences. Saves the result to out/resume_variants/resume_<company>_<title>.md and returns the saved file path.
    
    Parameters:
        resume_text (str): Full master resume content to be tailored.
        job_details (dict or pandas.Series): Job information with expected keys 'company', 'title', and optionally 'description'.
    
    Returns:
        Optional[str]: Path to the saved Markdown file on success, or None if the client is falsy or an error occurs.
    """
    if not client:
        return None

    company = job_details.get('company', 'N/A').strip()
    title = job_details.get('title', 'N/A').strip()

    prompt = f"""
You are an expert career coach and resume writer. Your task is to tailor the following master resume for a specific job application.

**Master Resume:**
---
{resume_text}
---

**Job Description:**
---
- **Company:** {company}
- **Title:** {title}
- **Description:** {job_details.get('description', '')}
---

**Instructions:**
1.  Analyze the job description to identify the key skills, experiences, and qualifications the employer is seeking.
2.  Rewrite the master resume to highlight the most relevant aspects of the candidate's background.
3.  Quantify achievements where possible and align the summary and skills sections with the job's requirements.
4.  Maintain a professional tone and a clean, readable Markdown format.
5.  Do not invent new experiences. Only rephrase, reorder, and emphasize existing information.

Produce the full, tailored resume as a complete Markdown document.
    """

    try:
        print(f"Generating tailored resume for {title} at {company}...")
        response = client.chat.completions.create(
            model="gpt-4-turbo-2024-04-09",
            messages=[
                {"role": "system", "content": "You are an expert resume writer and career coach."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        tailored_resume = response.choices[0].message.content

        # --- Save the generated resume to a file ---
        output_dir = "out/resume_variants"
        os.makedirs(output_dir, exist_ok=True)

        # Create a clean filename
        safe_company = "".join(c for c in company if c.isalnum() or c in (' ', '_')).rstrip()
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '_')).rstrip()
        filename = f"resume_{safe_company}_{safe_title}.md".replace(' ', '_').lower()
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(tailored_resume)

        print(f"✅ Successfully saved tailored resume to {filepath}")
        return filepath

    except Exception as e:
        print(f"❌ An error occurred during LLM call: {e}")
        return None


def create_interview_pack(client: openai.OpenAI, company_name: str, articles_text: str) -> Optional[str]:
    """
    Create an interview preparation pack for a company from provided article text using the given OpenAI client.
    
    The function asks the LLM to produce a Markdown-formatted "Interview Preparation Pack" containing three sections: a one-paragraph Company Summary, a bulleted Key Developments list, and 3–5 Potential Talking Points & Questions. The LLM must base its output strictly on the supplied articles_text. If successful, the report is written to reports/interview_pack_<safe_company>.md and the file path is returned.
    
    Preconditions:
    - A valid OpenAI client must be provided; if not, the function returns None.
    
    Returns:
    - The path to the saved Markdown file on success, or None if the client is missing or an error occurs.
    """
    if not client:
        print("⚠️ OpenAI client not available, skipping interview pack generation.")
        return None

    prompt = f"""
You are a senior business analyst providing a briefing to a job candidate. Your task is to create a concise "Interview Preparation Pack" for the company: **{company_name}**.

Based *only* on the provided text below, generate the report.

**Provided Articles & Text:**
---
{articles_text}
---

**Instructions:**
Generate a well-structured report in Markdown format. The report must include the following sections:
1.  **Company Summary:** A brief, one-paragraph summary of the company's main business based on the text.
2.  **Key Developments:** A bulleted list of the most important recent events, product launches, or financial news mentioned in the articles.
3.  **Potential Talking Points & Questions:** Based *strictly* on the articles, suggest 3-5 insightful questions the candidate could ask the interviewer. These should demonstrate they've done their research.

Structure the output clearly with Markdown headings. Do not include any information not present in the provided text.
    """

    try:
        print(f"Generating interview pack for {company_name}...")
        response = client.chat.completions.create(
            model="gpt-4-turbo-2024-04-09",
            messages=[
                {"role": "system", "content": "You are a senior business analyst who creates executive briefings for job candidates."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
        )
        interview_pack_content = response.choices[0].message.content

        # --- Save the generated pack to a file ---
        output_dir = "reports"
        os.makedirs(output_dir, exist_ok=True)

        safe_company = "".join(c for c in company_name if c.isalnum()).lower()
        filename = f"interview_pack_{safe_company}.md"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(interview_pack_content)

        print(f"✅ Successfully saved interview pack to {filepath}")
        return filepath

    except openai.APIError as e:
        print(f"❌ An error occurred during LLM call for interview pack: {e}")
        return None
