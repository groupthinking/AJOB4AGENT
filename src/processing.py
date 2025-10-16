import pandas as pd
from typing import List
from src.config import Settings

def normalize_and_filter_jobs(df: pd.DataFrame, settings: Settings) -> pd.DataFrame:
    """
    Normalize and filter a jobs DataFrame according to the provided Settings.
    
    If df is None or empty, returns an empty DataFrame. Operates on a copy of the input (the original DataFrame is not modified). When present, normalizes 'title', 'location', and 'description' to lowercase, stripped strings. Filters rows whose title matches any entry in settings.JOB_TITLES and whose location matches any entry in settings.JOB_GEOS (case-insensitive substring/contains matching). If a 'compensation' column exists, coerces it to numeric, drops non-numeric rows, and filters to keep only rows with compensation >= settings.MIN_COMPENSATION. Returns the resulting filtered DataFrame.
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
        # Replace NaN values with 'N/A' for consistency
        filtered_df['compensation'] = filtered_df['compensation'].fillna('N/A')
        # Apply the filter, only to rows with valid numeric compensation
        comp_mask = (filtered_df['compensation'] != 'N/A') & (filtered_df['compensation'] >= settings.MIN_COMPENSATION)
        filtered_df = filtered_df[comp_mask]
        print(f"Found {len(filtered_df)} jobs after compensation filter.")

    print(f"✅ Filtered down to {len(filtered_df)} jobs matching all criteria.")
    return filtered_df


import re

def extract_skills_from_resume(resume_text: str) -> List[str]:
    """
    Extract a list of skills from the "## SKILLS" section of a markdown-formatted resume.
    
    Searches case-insensitively for a top-level "## SKILLS" header and captures text until the next "##" header or end of document. From that section, it extracts lines starting with a dash ('-') as bullet items, splits comma-separated items on the same line, strips surrounding whitespace, and lowercases each skill. Returns an empty list if no SKILLS section is found.
    
    Returns:
        List[str]: A list of skill strings in lowercase with empty entries removed.
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
    Score each job by the number of unique skills from a resume that appear in the job description.
    
    If df is empty, it is returned unchanged. Resume skills are extracted with extract_skills_from_resume(resume_text); if no skills are found, a 'score' column with 0 is added to df and df is returned. Matching uses whole-word, case-insensitive regexes built from the extracted skills; each unique matched skill contributes 1 to the score. The returned DataFrame contains a new 'score' column and is sorted by 'score' in descending order.
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
    skills_pattern = r'\b(' + '|'.join(re.escape(skill.strip()) for skill in skills) + r')\b'

    def calculate_score(description: str) -> int:
        """
        Count unique resume skills found in a job description.
        
        Returns the number of distinct skill matches (using the outer-scope `skills_pattern` regex) found in the provided job description text. Matching is case-insensitive and counts each skill at most once. If `description` is not a string, returns 0.
        """
        if not isinstance(description, str):
            return 0
        # Find all unique matches to avoid over-counting a single skill
        found_skills = set(re.findall(skills_pattern, description.lower(), re.IGNORECASE))
        return len(found_skills)

    scored_df = df.copy()
    scored_df['score'] = scored_df['description'].apply(calculate_score)

    print("✅ Scored jobs based on resume keywords.")
    return scored_df.sort_values(by='score', ascending=False)
