import os
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

class Settings:
    # Job Targeting
    JOB_TITLES = [t.strip() for t in os.getenv("JOB_TITLES", "").split(',') if t.strip()]
    JOB_GEOS = [g.strip() for g in os.getenv("JOB_GEOS", "").split(',') if g.strip()]
    MIN_COMPENSATION = int(os.getenv("MIN_COMPENSATION", 0))

    # OpenAI API Key
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # Email settings
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_FROM = os.getenv("SMTP_FROM")
    SMTP_TO = os.getenv("SMTP_TO")

    # Apollo API Key
    APOLLO_API_KEY = os.getenv("APOLLO_API_KEY")

    # Feature flags
    EMAIL_ENABLED = bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD)
    APOLLO_ENABLED = bool(APOLLO_API_KEY)

# Instantiate settings to be imported by other modules
settings = Settings()
