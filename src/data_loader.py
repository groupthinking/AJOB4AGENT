import pandas as pd
from typing import Optional, Dict, Any

def load_jobs_from_csv(filepath: str = "data/jobs/jobs.csv") -> Optional[pd.DataFrame]:
    """
    Loads job data from a CSV file into a pandas DataFrame.

    Args:
        filepath: The path to the jobs CSV file.

    Returns:
        A pandas DataFrame with the job listings, or None if an error occurs.
    """
    try:
        df = pd.read_csv(filepath)
        print(f"Successfully loaded {len(df)} jobs from {filepath}")
        return df
    except FileNotFoundError:
        print(f"Error: The file was not found at {filepath}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while reading the CSV: {e}")
        return None

def load_master_resume(filepath: str = "data/resume_master.md") -> Optional[str]:
    """
    Loads the master resume content from a markdown file.

    Args:
        filepath: The path to the master resume file.

    Returns:
        The content of the resume as a string, or None if an error occurs.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            resume_content = f.read()
        print(f"Successfully loaded master resume from {filepath}")
        return resume_content
    except FileNotFoundError:
        print(f"Error: The master resume file was not found at {filepath}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while reading the resume file: {e}")
        return None
