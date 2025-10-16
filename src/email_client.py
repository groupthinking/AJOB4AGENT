import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.config import settings

def send_report_email(html_content: str):
    """
    Send an HTML report via SMTP using configuration from src.config.settings.
    
    If settings.EMAIL_ENABLED is falsy the function returns without sending. When enabled,
    the function composes a multipart HTML email (Subject: "AJOB4AGENT Daily Report - {SMTP_FROM}"),
    connects to the SMTP server over SSL (SMTP_HOST, SMTP_PORT), authenticates with
    SMTP_USERNAME/SMTP_PASSWORD, and sends the message from SMTP_FROM to SMTP_TO.
    Status and errors are reported with print statements.
    
    Parameters:
        html_content (str): HTML string used as the email body.
    
    Returns:
        None
    """
    if not settings.EMAIL_ENABLED:
        print("📧 Email sending is disabled. Skipping.")
        return

    print("📧 Attempting to send daily report email...")

    message = MIMEMultipart("alternative")
    message["Subject"] = f"AJOB4AGENT Daily Report - {settings.SMTP_FROM}"
    message["From"] = settings.SMTP_FROM
    message["To"] = settings.SMTP_TO

    # Attach the HTML content
    part = MIMEText(html_content, "html")
    message.attach(part)

    try:
        # Using a secure context
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(
                settings.SMTP_FROM, settings.SMTP_TO, message.as_string()
            )
        print(f"✅ Email report sent successfully to {settings.SMTP_TO}")
    except Exception as e:
        print(f"❌ Failed to send email report. Error: {e}")
        print("   Please check your SMTP settings in the .env file.")
