from src import data_loader, processing, generation, crm, reporting, email_client
from src.config import settings
import pandas as pd

def run_pipeline():
    """
    Main function to run the entire job application pipeline.
    """
    print("=========================================")
    print("🚀 Starting the AJOB4AGENT Pipeline")
    print("=========================================")

    crm.clean_crm_logs()

    print("\n[1/5] ⚙️ Loading Configuration and Data...")
    jobs_df = data_loader.load_jobs_from_csv()
    master_resume = data_loader.load_master_resume()

    if jobs_df is None or jobs_df.empty or master_resume is None:
        print("\n❌ Halting pipeline: Could not load initial data (jobs or resume).")
        return
    print(f"✅ Loaded {len(jobs_df)} jobs and master resume.")

    print("\n[2/5] Normalizing and Filtering Jobs...")
    filtered_jobs = processing.normalize_and_filter_jobs(jobs_df, settings)
    if filtered_jobs.empty:
        print("✅ No jobs match your criteria after filtering. Pipeline finished.")
        return
    print("\nFiltered Jobs Preview:")
    print(filtered_jobs[['company', 'title', 'location', 'compensation']].head())

    print("\n[3/5] Scoring Roles...")
    scored_jobs = processing.score_jobs(filtered_jobs, master_resume)
    print("\nTop Scored Jobs Preview:")
    print(scored_jobs[['company', 'title', 'location', 'score']].head())

    print("\n[4/5] Generating Resume Variants and Updating CRM...")
    client = generation.get_openai_client()

    # Let's process the top N jobs. For now, N=1
    top_n = 1
    jobs_to_process = scored_jobs.head(top_n)

    for index, job in jobs_to_process.iterrows():
        print(f"\n--- Processing top job: {job['title']} at {job['company']} ---")
        resume_path = None
        status = "scored"
        if client:
            resume_path = generation.generate_resume_variant(client, master_resume, job)
            if resume_path:
                status = "resume_generated"
            else:
                status = "generation_failed"

        crm.update_application_log(job, resume_path, status)

    print("\n[5/5] Generating HTML Report...")
    # For the report, we'll read the entire CRM log
    try:
        applications_log_df = pd.read_csv('crm/applications.csv')
    except FileNotFoundError:
        applications_log_df = pd.DataFrame()

    summary_data = {
        "total_jobs": len(jobs_df),
        "filtered_jobs": len(filtered_jobs),
        "resumes_generated": applications_log_df[applications_log_df['status'] == 'resume_generated'].shape[0],
        "top_job_title": scored_jobs.iloc[0]['title'] if not scored_jobs.empty else "N/A",
        "top_job_company": scored_jobs.iloc[0]['company'] if not scored_jobs.empty else "N/A",
        "top_job_score": scored_jobs.iloc[0]['score'] if not scored_jobs.empty else "N/A",
    }

    # We pass the applications that were processed in *this* run
    processed_apps_df = applications_log_df[applications_log_df['job_id'].isin(jobs_to_process.index)]

    report_path = reporting.generate_html_report(summary_data, processed_apps_df)

    if report_path:
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            email_client.send_report_email(html_content)
        except FileNotFoundError:
            print(f"❌ Could not find report at {report_path} to email.")

    print("\n=========================================")
    print("✅ Pipeline execution finished.")
    print("=========================================")


if __name__ == "__main__":
    run_pipeline()
