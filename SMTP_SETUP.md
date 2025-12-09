# 📧 SMTP Email Setup Guide

## Quick Setup for Daily Job Reports

### 🎯 What You Need
- Gmail account with [2-factor authentication enabled](https://myaccount.google.com/signinoptions/two-step-verification)
- [App password generated](https://myaccount.google.com/apppasswords) from your Google Account settings

**Important:** App passwords can only be generated after you've enabled 2-factor authentication on your Google account. If you don't see the App Passwords option, make sure 2FA is enabled first.

### 🔧 Environment Variables or GitHub Secrets Required

Configure these variables in your `.env` file or as GitHub secrets:

| Variable Name | Example Value | Description |
|---------------|---------------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` | Your SMTP server |
| `SMTP_USERNAME` | `your-email@gmail.com` | Your Gmail address |
| `SMTP_PASSWORD` | `your-app-password` | Your Gmail app password |
| `SMTP_FROM` | `your-email@gmail.com` | Sender email address |
| `SMTP_TO` | `recipient@email.com` | Where to receive reports |
| `SMTP_PORT` | `587` | SMTP port (optional, defaults to 587) |


### 🚀 Setup Steps

#### For Local Development (.env file):
1. Copy `.env.example` to `.env`
2. Add your SMTP credentials to the `.env` file
3. Never commit the `.env` file to version control

#### For GitHub Actions (Repository Secrets):
1. **Go to GitHub Secrets:**
   ```
   https://github.com/YOUR_USERNAME/AJOB4AGENT/settings/secrets/actions
   ```

2. **Add Each Secret:**
   - Click "New repository secret"
   - Enter name and value from table above
   - Click "Add secret"

3. **Test Setup:**
   ```bash
   gh workflow run email-smoke.yml
   ```

### 📅 Automated Report Schedule
Configure in GitHub Actions workflow or cron jobs:
- Morning reports (e.g., 8:00 AM)
- Evening reports (e.g., 5:45 PM)

### ⚠️ Security Best Practices
- **Never commit credentials** to the repository
- Use app passwords instead of your main Gmail password
- App passwords are device-specific and can be revoked anytime
- Store credentials in `.env` files (which are gitignored) or environment variables
- For production, use secret management services

---

**✅ Once configured, you'll receive automated daily job search reports!**
