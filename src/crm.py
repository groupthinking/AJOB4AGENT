import pandas as pd
import os
from datetime import datetime
from typing import Dict, Optional

def clean_crm_logs():
    """
    Deletes existing CRM log files to ensure a clean slate for the current run.
    """
    log_files = ['crm/applications.csv', 'crm/outreach_threads.csv']
    for log_file in log_files:
        if os.path.exists(log_file):
            try:
                os.remove(log_file)
                print(f"🧹 Removed old log file: {log_file}")
            except OSError as e:
                print(f"❌ Error removing log file {log_file}: {e}")

def update_application_log(job_details: pd.Series, resume_path: Optional[str], status: str):
    """
    Append a new application record to crm/applications.csv.
    
    Creates a single-row log entry using job_details (job_details.name as job_id) with a generated application_id and ISO timestamp, company, title, status, resume_variant_path (uses "N/A" when resume_path is None or empty), and score, then appends it to crm/applications.csv. Writes CSV headers only when the file does not exist or is empty. I/O errors are caught and reported via printed messages; this function does not raise on write failure.
    """
    log_path = 'crm/applications.csv'

    # Use the DataFrame index as a simple, unique job identifier for this session
    job_id = job_details.name

    new_log_entry = pd.DataFrame([{
        'application_id': f"app_{job_id}_{int(datetime.now().timestamp())}",
        'job_id': job_id,
        'timestamp': datetime.now().isoformat(),
        'company': job_details.get('company'),
        'title': job_details.get('title'),
        'status': status,
        'resume_variant_path': resume_path if resume_path else "N/A",
        'score': job_details.get('score')
    }])

    # Check if file exists and is not empty to determine if we need to write headers
    write_header = not os.path.exists(log_path) or os.path.getsize(log_path) == 0

    try:
        new_log_entry.to_csv(log_path, mode='a', header=write_header, index=False)
        print(f"✅ Logged application for '{job_details.get('title')}' to {log_path}")
    except Exception as e:
        print(f"❌ Failed to log application for '{job_details.get('title')}': {e}")
