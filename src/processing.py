import pandas as pd
from typing import List
from src.config import Settings

def normalize_and_filter_jobs(df: pd.DataFrame, settings: Settings) -> pd.DataFrame:
    """
    Normalizes and filters the jobs DataFrame based on user-defined criteria.

    Args:
        df: The raw jobs DataFrame.
        settings: The application settings object.

    Returns:
        A filtered and cleaned DataFrame.
    """
    if df is None or df.empty:
        return pd.DataFrame()

    # Make a copy to avoid SettingWithCopyWarning
    filtered_df = df.copy()

    # --- Normalization ---
    # Convert relevant columns to lowercase strings for consistent matching
    for col in ['title', 'location', 'description']:
        if col in filtered_df.columns:
            filtered_df[col] = filtered_df[col].str.lower().str.strip()

    # --- Filtering ---
    # 1. Filter by titles
    target_titles = [t.lower().strip() for t in settings.JOB_TITLES]
    # The regex `|` acts as an OR
    title_mask = filtered_df['title'].str.contains('|'.join(target_titles), na=False)
    filtered_df = filtered_df[title_mask]
    print(f"Found {len(filtered_df)} jobs after title filter.")

    # 2. Filter by locations
    target_geos = [g.lower().strip() for g in settings.JOB_GEOS]
    geo_mask = filtered_df['location'].str.contains('|'.join(target_geos), na=False)
    filtered_df = filtered_df[geo_mask]
    print(f"Found {len(filtered_df)} jobs after location filter.")

    # 3. Filter by minimum compensation
    if 'compensation' in filtered_df.columns:
        # Convert compensation to numeric, setting errors to NaN (Not a Number)
        filtered_df['compensation'] = pd.to_numeric(filtered_df['compensation'], errors='coerce')
        # Drop rows where compensation is not a valid number
        filtered_df.dropna(subset=['compensation'], inplace=True)
        # Apply the filter
        comp_mask = filtered_df['compensation'] >= settings.MIN_COMPENSATION
        filtered_df = filtered_df[comp_mask]
        print(f"Found {len(filtered_df)} jobs after compensation filter.")

    print(f"✅ Filtered down to {len(filtered_df)} jobs matching all criteria.")
    return filtered_df


import re

def extract_skills_from_resume(resume_text: str) -> List[str]:
    """
    Extracts skills from the 'SKILLS' section of a markdown resume.
    Assumes skills are bullet points starting with '-'.
    """
    # Regex to find the content between "## SKILLS" and the next "##" section
    skills_section_match = re.search(r"##\s*SKILLS\s*\n(.*?)(?=\n##|$)", resume_text, re.DOTALL | re.IGNORECASE)
    if not skills_section_match:
        return []

    skills_content = skills_section_match.group(1)

    # Extract individual skills from bullet points
    skills = [skill.strip().lower() for skill in re.findall(r"-\s*(.*)", skills_content)]

    # Further split if skills are comma-separated on the same line
    final_skills = []
    for skill in skills:
        final_skills.extend([s.strip() for s in skill.split(',')])

    return list(filter(None, final_skills))


def score_jobs(df: pd.DataFrame, resume_text: str) -> pd.DataFrame:
    """
    Scores jobs based on how many resume skills appear in the job description.
    """
    if df.empty:
        return df

    skills = extract_skills_from_resume(resume_text)
    if not skills:
        print("⚠️ Warning: Could not find skills in resume. All job scores will be 0.")
        df['score'] = 0
        return df

    print(f"Scoring based on {len(skills)} skills: {skills}")

    # Create a regex pattern to find any of the skills (as whole words)
    # This avoids matching "ai" in "strait"
    skills_pattern = r'\b(' + '|'.join(re.escape(skill) for skill in skills) + r')\b'

    def calculate_score(description: str) -> int:
        if not isinstance(description, str):
            return 0
        # Find all unique matches to avoid over-counting a single skill
        found_skills = set(re.findall(skills_pattern, description.lower(), re.IGNORECASE))
        return len(found_skills)

    scored_df = df.copy()
    scored_df['score'] = scored_df['description'].apply(calculate_score)

    print("✅ Scored jobs based on resume keywords.")
    return scored_df.sort_values(by='score', ascending=False)
