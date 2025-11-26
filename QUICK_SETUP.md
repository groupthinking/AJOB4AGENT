# 🚀 Quick Setup: Daily Email Reports

**Exactly what you need to get automated daily email reports working in `groupthinking/AJOB4AGENT`.**

## Step 1: Add GitHub Actions Secrets
Go to: **Repo → Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets:
```
SMTP_HOST          →  smtp.gmail.com (or your provider)
SMTP_PORT          →  587
SMTP_USERNAME      →  your_email@gmail.com  
SMTP_PASSWORD      →  your_app_password
SMTP_FROM          →  your_email@gmail.com
SMTP_TO            →  where_to_send_reports@gmail.com
```

### Optional:
```
APOLLO_API_KEY     →  your_apollo_api_key (for recruiter features)
```

## Step 2: Get SMTP Credentials

### Gmail Users:
1. Enable 2FA on your Google account
2. Go to Google Account → Security → App passwords
3. Generate app password for "Mail"
4. Use that password for `SMTP_PASSWORD`

### Other Providers:
- **Outlook**: `smtp.office365.com` port `587`
- **SendGrid**: `smtp.sendgrid.net` port `587`

## Step 3: Test Setup (Optional)
```bash
cd services/agent-orchestrator
npm run test:email
```

## ✅ What You Get
- Daily email report at 9:00 AM UTC
- Professional HTML email with application stats
- Manual trigger via GitHub Actions tab
- Automatic error handling and logging

**That's it! Your automated daily reports are now live.** 🎯