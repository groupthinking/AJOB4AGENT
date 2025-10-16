import pandas as pd
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import os
from typing import Dict, Any, Optional

def generate_html_report(summary_data: Dict[str, Any], applications_df: pd.DataFrame) -> Optional[str]:
    """
    Generate an HTML report from summary statistics and an applications DataFrame.
    
    Renders the Jinja2 template located at `templates/report_template.html` using a context that includes:
    - `generation_date` (current timestamp),
    - `summary` (the provided summary_data),
    - `applications` (applications_df converted to a list of record dicts, or an empty list if the DataFrame is empty).
    
    If the `templates` directory is missing or writing the output file fails, the function returns None. On success it writes the rendered HTML to `reports/daily_report.html` (creating the `reports` directory if needed) and returns the path to the generated file.
    
    Parameters:
        summary_data: Summary statistics and values to expose to the template.
        applications_df: DataFrame of applications processed in this run; converted to template-friendly records.
    
    Returns:
        The filesystem path to the generated HTML report (str), or None if generation failed.
    """
    if not os.path.exists('templates'):
        print("❌ Error: 'templates' directory not found.")
        return None

    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template('report_template.html')

    # Prepare data for the template
    report_data = {
        "generation_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "summary": summary_data,
        "applications": applications_df.to_dict(orient='records') if not applications_df.empty else []
    }

    # Render the HTML
    html_content = template.render(report_data)

    # Save the report
    output_dir = "reports"
    os.makedirs(output_dir, exist_ok=True)
    report_path = os.path.join(output_dir, "daily_report.html")

    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"✅ HTML report successfully generated at {report_path}")
        return report_path
    except Exception as e:
        print(f"❌ Error writing HTML report: {e}")
        return None
