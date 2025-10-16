import pandas as pd
from typing import Optional, Dict, Any

def load_jobs_from_csv(filepath: str = "data/jobs/jobs.csv") -> Optional[pd.DataFrame]:
    """
    Load job listings from a CSV file into a pandas DataFrame.
    
    Parameters:
        filepath (str): Path to the jobs CSV file (default: "data/jobs/jobs.csv").
    
    Returns:
        Optional[pd.DataFrame]: DataFrame with job listings on success, or None if the file cannot be read.
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
    Load the master resume Markdown file and return its contents as a UTF-8 string.
    
    Parameters:
        filepath (str): Path to the Markdown file. Defaults to "data/resume_master.md".
    
    Returns:
        Optional[str]: The file contents as a string, or None if the file is not found or an error occurs while reading.
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
