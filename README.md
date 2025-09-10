# AJOB4AGENT

Welcome to AJOB4AGENT, a personalized, autonomous agent for automating your job search pipeline. This system helps you find relevant job postings, tailors your resume for each application, tracks your progress, and generates reports and interview prep materials.

## ✨ Features

- **Job Pipeline:** Ingests a list of jobs and filters them based on your configured titles, locations, and minimum compensation.
- **Role Scoring:** Scores filtered jobs against your master resume to identify the best matches.
- **AI-Powered Resume Tailoring:** Uses an LLM to generate tailored resume variants for top-scoring jobs (requires OpenAI API key).
- **CRM Logging:** Tracks all processed applications in a simple CSV-based CRM system.
- **Daily HTML Reports:** Generates a `daily_report.html` summarizing the pipeline's activity for each run.
- **HTMX Dashboard:** A lightweight, real-time web dashboard to view your application log.
- **Interview Pack Generator:** A script to create a concise interview prep document for a given company using recent news (requires OpenAI API key).
- **Guarded Features:** Email reporting, AI resume tailoring, and other features requiring secrets are disabled by default and only run if you provide the necessary keys/credentials.

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- `make` for easy command execution.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/groupthinking/AJOB4AGENT.git
    cd AJOB4AGENT
    ```

2.  **Set up your environment:**
    Copy the environment file template. This file is crucial for configuring the agent to your preferences.
    ```sh
    cp .env.prepopulated .env
    ```
    Now, edit the `.env` file with your job preferences.

3.  **Provide Optional API Keys (in `.env`):**
    - To enable AI-powered resume tailoring and the interview pack generator, add your `OPENAI_API_KEY`.
    - To enable daily email reports, fill in the `SMTP_*` variables.
    - To enable Apollo integration (future feature), add your `APOLLO_API_KEY`.

4.  **Install dependencies:**
    Use the `Makefile` to install all required Python packages.
    ```sh
    make install
    ```

## Usage

### Running the Main Pipeline

To run the entire daily job automation pipeline, from filtering to reporting, simply use:
```sh
make run
```

### Viewing the Dashboard

To start the web dashboard, run:
```sh
make dashboard
```
Then, open your web browser to `http://localhost:8000`. The dashboard will display the contents of `crm/applications.csv` and auto-refresh.

### Generating an Interview Pack

To generate a prep document for a specific company:
1.  (First time only) Add some sample news articles or text to `data/sample_articles.txt`.
2.  Run the script with the company name:
    ```sh
    python scripts/generate_interview_pack.py --company "Name of Company"
    ```
    This requires `OPENAI_API_KEY` to be set in your `.env` file. The output will be saved in the `reports/` directory.
