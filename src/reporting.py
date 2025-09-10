import pandas as pd
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import os
from typing import Dict, Any, Optional

def generate_html_report(summary_data: Dict[str, Any], applications_df: pd.DataFrame) -> Optional[str]:
    """
    Generates an HTML report from the pipeline's results.

    Args:
        summary_data: A dictionary with summary statistics for the report.
        applications_df: A DataFrame of the applications processed in this run.

    Returns:
        The path to the generated report, or None if an error occurred.
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
