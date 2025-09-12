# 📧 SMTP Email Setup Guide

## Quick Setup for Daily Job Reports

### 🎯 What You Need
- Gmail account with [2-factor authentication enabled](https://myaccount.google.com/signinoptions/two-step-verification)
- [App password generated](https://myaccount.google.com/apppasswords) (you already have: `wusv nhcj hjok vqml`)

### 🔧 GitHub Secrets Required

Create these 6 secrets in your repository:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP server |
| `SMTP_USERNAME` | `your.email@gmail.com` | Your Gmail address |
| `SMTP_PASSWORD` | `wusvnhcjhjokvqml` | Your app password |
| `SMTP_FROM` | `your.email@gmail.com` | Same as username |
| `SMTP_TO` | `recipient@email.com` | Where to receive reports |
| `SMTP_PORT` | `587` | SMTP port (optional) |

### 🚀 Setup Steps

1. **Go to GitHub Secrets:**
   ```
   https://github.com/groupthinking/AJOB4AGENT/settings/secrets/actions
   ```

2. **Add Each Secret:**
   - Click "New repository secret"
   - Enter name and value from table above
   - Click "Add secret"

3. **Test Setup:**
   ```bash
   gh workflow run email-smoke.yml
   ```

### 📅 When Reports Run
- **8:00 AM Central Time** (weekdays)
- **5:45 PM Central Time** (weekdays)

### 🛠️ Helper Script
Run `./setup_smtp_secrets.sh` for detailed instructions and commands.

### ⚠️ Security Notes
- App passwords are device-specific
- Revoke them anytime from Google Account settings
- Never share or store app passwords in code

---

**✅ Once secrets are set, you'll receive automated daily job search reports!**
