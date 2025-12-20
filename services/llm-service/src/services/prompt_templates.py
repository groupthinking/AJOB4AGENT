"""Prompt engineering templates for resume tailoring."""

RESUME_TAILOR_SYSTEM_PROMPT = """You are an expert resume writer and career coach with extensive experience helping candidates land their dream jobs. Your task is to tailor a candidate's resume to match a specific job description while maintaining authenticity and highlighting relevant experience.

Guidelines:
1. Match keywords from the job description naturally - don't force them
2. Quantify achievements where possible (percentages, numbers, dollar amounts)
3. Prioritize experience most relevant to the target role
4. Maintain a professional and confident tone
5. NEVER fabricate experience, skills, or achievements
6. Focus on transferable skills when direct experience is limited
7. Use action verbs to describe accomplishments
8. Keep content concise and impactful

You must return a valid JSON response with the tailored content."""

RESUME_TAILOR_USER_PROMPT = """## Original Resume
{resume_json}

## Target Job Description
Company: {company}
Title: {job_title}
Description: {job_description}
Requirements: {requirements}
Preferred: {preferred}

## Task
Tailor this resume for the target position. Return a JSON object with the following structure:

{{
  "tailored_resume": {{
    "summary": "A rewritten professional summary (2-3 sentences) that aligns with this specific role",
    "experience": [
      {{
        "title": "Job Title",
        "company": "Company Name",
        "start_date": "Start Date",
        "end_date": "End Date or null if current",
        "description": "Tailored role description emphasizing relevant responsibilities",
        "highlights": ["Achievement 1 with metrics", "Achievement 2 relevant to target role"]
      }}
    ],
    "skills_highlighted": ["Most relevant skill 1", "Most relevant skill 2"],
    "keywords_matched": ["Keyword from job description that matches resume"],
    "fit_score": 85
  }},
  "suggestions": [
    "Actionable suggestion 1 for improving resume",
    "Actionable suggestion 2 for better keyword matching"
  ]
}}

Important:
- fit_score should be 0-100 based on how well the resume matches requirements
- Only include experience entries from the original resume (reordered/tailored)
- skills_highlighted should prioritize skills mentioned in the job description
- keywords_matched should list keywords from the job that appear in/match the resume
- suggestions should be specific and actionable"""

FIT_SCORE_PROMPT = """Analyze the fit between this resume and job description. 
Consider:
1. Years of relevant experience vs required
2. Skills match percentage
3. Industry/domain alignment
4. Leadership experience if required
5. Education requirements match

Resume Skills: {resume_skills}
Required Skills: {required_skills}
Preferred Skills: {preferred_skills}
Resume Experience Years: {experience_years}
Required Experience: {required_experience}

Return only a number 0-100 representing the fit score."""


def format_resume_for_prompt(resume: dict) -> str:
    """Format resume dict into a readable string for the prompt."""
    lines = []
    lines.append(f"Name: {resume.get('name', 'N/A')}")
    lines.append(f"Email: {resume.get('email', 'N/A')}")
    lines.append(f"\nSummary:\n{resume.get('summary', 'N/A')}")
    
    if resume.get('experience'):
        lines.append("\nExperience:")
        for exp in resume['experience']:
            end = exp.get('end_date') or 'Present'
            lines.append(f"- {exp.get('title')} at {exp.get('company')} ({exp.get('start_date')} - {end})")
            lines.append(f"  {exp.get('description', '')}")
            if exp.get('highlights'):
                for h in exp['highlights']:
                    lines.append(f"    • {h}")
    
    if resume.get('skills'):
        lines.append(f"\nSkills: {', '.join(resume['skills'])}")
    
    if resume.get('education'):
        lines.append("\nEducation:")
        for edu in resume['education']:
            lines.append(f"- {edu.get('degree')} from {edu.get('institution')} ({edu.get('graduation_date')})")
    
    return "\n".join(lines)


def format_job_for_prompt(job: dict) -> tuple:
    """Format job description into components for the prompt."""
    requirements = job.get('requirements', [])
    preferred = job.get('preferred', [])
    
    req_str = "\n".join([f"- {r}" for r in requirements]) if requirements else "Not specified"
    pref_str = "\n".join([f"- {p}" for p in preferred]) if preferred else "Not specified"
    
    return (
        job.get('company', 'Unknown'),
        job.get('title', 'Unknown'),
        job.get('description', ''),
        req_str,
        pref_str
    )
