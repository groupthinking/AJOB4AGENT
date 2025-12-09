# 🚨 Setup Required - Items Needing Your Input

This document lists all items that require your configuration before AJOB4AGENT can be used. These are items that cannot be automated and need your personal credentials, API keys, or configuration decisions.

## ⚠️ Critical Items (Required for Basic Functionality)

### 1. OpenAI API Key
**Status:** ❌ Required  
**Purpose:** Powers AI resume tailoring and cover letter generation  
**How to get:**
1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to [API Keys](https://platform.openai.com/api-keys)
3. Create a new API key
4. Add to `.env` file: `OPENAI_API_KEY=sk-...`

**Cost:** Pay-per-use (typically $0.01-0.10 per application)

---

### 2. Database Configuration
**Status:** ⚠️ Auto-configured in Docker, but review recommended  
**Purpose:** Stores application history, job data, and analytics  
**Current default:**
```env
DATABASE_URL=postgresql://jobagent:your_secure_password@postgres:5432/jobagent
POSTGRES_USER=jobagent
POSTGRES_PASSWORD=your_secure_password_here  # ⚠️ CHANGE THIS for production!
```

**Action required:**
- For production, change `POSTGRES_PASSWORD` to a strong password (minimum 16 characters, mix of letters, numbers, symbols)
- Update `DATABASE_URL` to match

---

### 3. Security Secrets
**Status:** ❌ Required  
**Purpose:** Secure JWT tokens and API authentication  
**How to configure:**
```env
JWT_SECRET=your_very_secure_jwt_secret_minimum_32_chars
API_KEY=your_internal_api_key_here
SESSION_SECRET=your_session_secret_here
```

**Action required:**
- Generate secure random strings (minimum 32 characters)
- Use a password generator or `openssl rand -base64 32`
- Never commit these to version control

---

## 🔌 Platform Credentials (Optional but Recommended)

### 4. LinkedIn Automation (High Priority)
**Status:** ⚠️ Optional - Required for LinkedIn job automation  
**Purpose:** Search and apply to jobs on LinkedIn  
**How to configure:**
```env
LINKEDIN_EMAIL=your_linkedin_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password
```

**⚠️ Important Notes:**
- LinkedIn has strict automation policies
- Use at your own risk - may result in account restrictions
- Consider using a dedicated account for automation
- Enable 2FA on your LinkedIn account for security

**Alternative:** Wait for official LinkedIn API access (coming in v2)

---

### 5. Glassdoor Integration
**Status:** ⚠️ Optional - Enhances job data  
**Purpose:** Access company reviews and salary data  
**How to configure:**
```env
GLASSDOOR_PARTNER_ID=your_glassdoor_partner_id
GLASSDOOR_KEY=your_glassdoor_key
```

**How to get:**
- Apply for Glassdoor API access at their developer portal
- May require business verification

**Alternative:** System works without Glassdoor data

---

### 6. Wellfound/AngelList Access
**Status:** ⚠️ Optional - For startup jobs  
**Purpose:** Access startup job listings  
**How to configure:**
```env
WELLFOUND_ACCESS_TOKEN=your_wellfound_token
```

**How to get:**
- Sign up at [Wellfound](https://wellfound.com/)
- Request API access from their developer portal

---

## 📧 Email Notifications (Optional)

### 7. SMTP Configuration
**Status:** ⚠️ Optional - For email reports  
**Purpose:** Receive daily job application reports via email  
**How to configure:** See [SMTP_SETUP.md](SMTP_SETUP.md) for detailed instructions

**Quick setup with Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Not your regular password!
SMTP_FROM=your-email@gmail.com
SMTP_TO=recipient@email.com
```

**Action required:**
1. Enable 2FA on your Gmail account
2. Generate an app password at [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use the app password (not your regular password)

---

## 🎛️ Configuration Settings

### 8. Job Search Preferences
**Status:** ⚠️ Required for targeted job search  
**Purpose:** Define what jobs you're looking for  
**How to configure:**
```env
JOB_TITLES="Product Manager, AI Product, Solutions Architect"
JOB_GEOS="US-Remote, Kansas City, San Francisco"
MIN_COMPENSATION=180000
```

**Action required:**
- Update job titles to match your target roles
- Set preferred locations (supports "Remote" or city names)
- Set minimum compensation expectations

---

### 9. Rate Limiting Configuration
**Status:** ✅ Has sensible defaults, but review recommended  
**Purpose:** Prevent overwhelming job platforms and getting blocked  
**Current defaults:**
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
APPLICATION_DELAY_MS=5000     # 5 seconds between applications
MAX_CONCURRENT_AGENTS=3
```

**Action required:**
- Review and adjust based on your needs
- Conservative settings recommended to avoid platform blocks

---

## 🔐 Production Deployment Checklist

### 10. Production Environment Variables
**Status:** ❌ Required for production deployment  
**Purpose:** Secure production configuration  
**Action required:**

- [ ] Change `APP_ENV=production`
- [ ] Set strong passwords for all services
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Set up SSL certificates (see QUICKSTART.md)
- [ ] Configure firewall rules
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy

---

## 🚧 Known Issues & Limitations

### Issues Requiring Your Attention:

1. **Service Integration Status**
   - **Status:** 🚧 In Progress
   - **Issue:** Not all services are fully integrated
   - **Workaround:** Run services individually for development
   - **ETA:** Q1 2025

2. **Platform Adapter Completion**
   - **Status:** 🚧 In Progress
   - **Issue:** Some platform adapters incomplete
   - **Working:** Indeed RSS, RemoteOK, Y Combinator, WeWorkRemotely, Stack Overflow
   - **In Progress:** LinkedIn, Glassdoor (require authentication)
   - **Workaround:** Use working platforms only

3. **LLM Service Implementation**
   - **Status:** 🚧 In Progress
   - **Issue:** LLM service partially implemented
   - **Workaround:** Basic resume tailoring works, advanced features coming soon

4. **Testing Coverage**
   - **Status:** ⚠️ Limited
   - **Issue:** Test coverage is incomplete
   - **Impact:** Some edge cases may not be handled
   - **Recommendation:** Test thoroughly in development before production use

5. **Documentation Gaps**
   - **Status:** ⚠️ Some areas incomplete
   - **Issue:** API documentation needs expansion
   - **Workaround:** Check code comments and service READMEs

---

## 📊 Priority Matrix

### Must Have (Before First Use)
- ✅ OpenAI API Key
- ✅ Security Secrets (JWT_SECRET, API_KEY)
- ✅ Job Search Preferences
- ✅ Database password (for production)

### Should Have (For Full Functionality)
- ⚠️ At least one platform credential (LinkedIn, Glassdoor, or Wellfound)
- ⚠️ SMTP configuration (for reports)

### Nice to Have (For Enhanced Experience)
- ✅ Multiple platform credentials
- ✅ Monitoring and alerting setup
- ✅ SSL certificates for production
- ✅ Custom rate limiting configuration

---

## 🆘 Getting Help

### If You're Stuck:

1. **Check Documentation**
   - [README.md](README.md) - Overview and quick start
   - [QUICKSTART.md](QUICKSTART.md) - Step-by-step setup
   - [SMTP_SETUP.md](SMTP_SETUP.md) - Email configuration
   - [docs/OPERATIONS.md](docs/OPERATIONS.md) - Production operations

2. **Review Examples**
   - `.env.example` - All configuration options with examples

3. **Common Issues**
   - Docker not starting: Check Docker Desktop is running
   - Port conflicts: Ensure ports 3001, 8080, 8000 are free
   - Database connection: Verify PostgreSQL is running
   - API errors: Check API keys are valid

4. **Community Support**
   - 🐛 [Report Issues](https://github.com/groupthinking/AJOB4AGENT/issues)
   - 💬 [Discussions](https://github.com/groupthinking/AJOB4AGENT/discussions)

---

## ✅ Setup Completion Checklist

Use this checklist to track your setup progress:

### Minimal Setup (Basic Functionality)
- [ ] Cloned repository
- [ ] Copied `.env.example` to `.env`
- [ ] Added OpenAI API key
- [ ] Set JWT_SECRET and API_KEY
- [ ] Configured job search preferences
- [ ] Changed default database password
- [ ] Started services with `docker-compose up`
- [ ] Accessed dashboard at http://localhost:3001

### Full Setup (Recommended)
- [ ] All minimal setup items
- [ ] Configured at least one platform credential
- [ ] Set up SMTP for email reports
- [ ] Reviewed rate limiting settings
- [ ] Tested application workflow end-to-end
- [ ] Set up monitoring (for production)
- [ ] Configured SSL certificates (for production)

### Production Ready
- [ ] All full setup items
- [ ] Changed APP_ENV to production
- [ ] Configured firewall rules
- [ ] Set up automated backups
- [ ] Configured monitoring and alerts
- [ ] Reviewed security settings
- [ ] Tested disaster recovery procedures

---

**Last Updated:** 2025-12-09  
**Version:** 1.0  
**Maintainer:** AJOB4AGENT Team

*Found an issue with this document or have suggestions? Please [open an issue](https://github.com/groupthinking/AJOB4AGENT/issues).*
