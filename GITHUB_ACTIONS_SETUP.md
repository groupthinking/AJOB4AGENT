# GitHub Actions Secrets Setup for AJOB4AGENT

This guide provides **exactly** what you need to configure GitHub Actions secrets for automated daily email reports.

## 📧 Required GitHub Actions Secrets

Add these secrets in: **Repo → Settings → Secrets and variables → Actions → New repository secret**

### SMTP Configuration (Required)

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `SMTP_HOST` | Your SMTP provider hostname | **Google Workspace**: `smtp.gmail.com`<br>**Outlook/365**: `smtp.office365.com`<br>**SendGrid**: `smtp.sendgrid.net`<br>**Mailgun**: Check your dashboard<br>**Postmark**: Check your dashboard |
| `SMTP_PORT` | SMTP port number | Usually `587` for most providers |
| `SMTP_USERNAME` | Your SMTP login/username | Often your email address |
| `SMTP_PASSWORD` | App password or SMTP API key | **Gmail**: Google Account → Security → 2-Step Verification → App passwords<br>**Outlook**: Account settings → Security → App passwords<br>**SendGrid**: API Keys section<br>**Mailgun**: Domain settings → SMTP credentials |
| `SMTP_FROM` | The "From" email address | Must be authorized domain email |
| `SMTP_TO` | Destination email for reports | Your email where you want reports |

### Optional Secrets

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `APOLLO_API_KEY` | For recruiter prospecting | **Apollo**: Settings → API → Create key<br>*(Paid plan typically required)* |

## 🔧 SMTP Provider Setup Instructions

### Gmail Setup
1. Enable 2-Factor Authentication on your Google account
2. Go to **Google Account → Security → 2-Step Verification → App passwords**
3. Generate an app password for "Mail"
4. Use these values:
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USERNAME`: Your Gmail address
   - `SMTP_PASSWORD`: The generated app password

### Outlook/Office365 Setup
1. Go to **Account settings → Security → App passwords**
2. Create a new app password
3. Use these values:
   - `SMTP_HOST`: `smtp.office365.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USERNAME`: Your Outlook email
   - `SMTP_PASSWORD`: The generated app password

### SendGrid Setup
1. Sign up for SendGrid account
2. Go to **Settings → API Keys**
3. Create a new API key with "Mail Send" permissions
4. Use these values:
   - `SMTP_HOST`: `smtp.sendgrid.net`
   - `SMTP_PORT`: `587`
   - `SMTP_USERNAME`: `apikey`
   - `SMTP_PASSWORD`: Your SendGrid API key

## 📅 Daily Report Schedule

The GitHub Action runs automatically:
- **Time**: 9:00 AM UTC daily (adjust in `.github/workflows/daily-email-report.yml`)
- **Manual trigger**: Available via GitHub Actions tab

## 🚀 Quick Setup Checklist

- [ ] Add all required SMTP secrets to GitHub repository
- [ ] Verify email provider allows SMTP access
- [ ] Test email configuration (see Testing section below)
- [ ] Optionally add Apollo API key for enhanced features

## 🧪 Testing Your Setup

### Test Email Configuration Locally
```bash
cd services/agent-orchestrator
npm install
npm run build

# Set environment variables for testing
export SMTP_HOST=your_smtp_host
export SMTP_PORT=587
export SMTP_USERNAME=your_email
export SMTP_PASSWORD=your_password
export SMTP_FROM=your_email
export SMTP_TO=your_email

# Run the daily report generator
node dist/reports/daily-email-report.js
```

### Manual GitHub Action Trigger
1. Go to **Actions** tab in your repository
2. Select **Daily Job Application Report** workflow  
3. Click **Run workflow** button
4. Check the workflow run logs for any errors

## 📝 Troubleshooting

### Common Issues

**"Authentication failed" errors:**
- Verify username/password are correct
- For Gmail/Outlook: Ensure you're using app passwords, not regular passwords
- Check if 2FA is required by your email provider

**"Connection refused" errors:**
- Verify SMTP_HOST and SMTP_PORT are correct
- Check if your email provider requires specific security settings

**"From address not authorized" errors:**
- Ensure SMTP_FROM matches an email address you own
- Some providers require domain verification

### Getting Help

If you encounter issues:
1. Check the GitHub Actions logs for detailed error messages
2. Verify all secrets are properly set in repository settings
3. Test SMTP connection using a mail client with the same credentials

## 📋 Configuration Summary

Once configured, the system will:
- ✅ Send daily email reports at 9 AM UTC
- ✅ Include application statistics and platform breakdowns
- ✅ Provide manual trigger capability
- ✅ Log all activities in GitHub Actions

---

**Last Updated:** 2024-06-10  
**Purpose:** Enable automated daily email reporting for job application activities