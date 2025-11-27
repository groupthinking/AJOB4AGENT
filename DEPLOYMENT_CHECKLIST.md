# AJOB4AGENT Deployment Checklist

Complete production deployment guide for AJOB4AGENT - Autonomous Job Application System.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Infrastructure Setup](#infrastructure-setup)
- [CI/CD Configuration](#cicd-configuration)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment](#post-deployment)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Security Checklist](#security-checklist)
- [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

### Code Readiness
- [ ] All tests passing in CI pipeline
- [ ] Code review completed and approved
- [ ] No critical security vulnerabilities
- [ ] Dependencies are up to date
- [ ] CHANGELOG updated with new features/fixes
- [ ] Version numbers updated appropriately

### Infrastructure Readiness
- [ ] Database migrations prepared and tested
- [ ] Environment variables configured
- [ ] SSL certificates valid and configured
- [ ] DNS records configured correctly
- [ ] Load balancer health checks configured
- [ ] Backup systems operational

---

## Environment Variables

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for LLM service | `sk-...` | ✅ |
| `JWT_SECRET` | Secret for JWT token signing (min 32 chars) | `your-super-secret-key-here` | ✅ |
| `API_KEY` | Internal service API key | `internal-api-key` | ✅ |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` | ✅ |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://guest:guest@rabbitmq:5672` | ✅ |

### Platform Credentials

| Variable | Description | Required |
|----------|-------------|----------|
| `LINKEDIN_EMAIL` | LinkedIn account email | For LinkedIn automation |
| `LINKEDIN_PASSWORD` | LinkedIn account password | For LinkedIn automation |
| `GLASSDOOR_PARTNER_ID` | Glassdoor API partner ID | Optional |
| `GLASSDOOR_KEY` | Glassdoor API key | Optional |
| `WELLFOUND_ACCESS_TOKEN` | Wellfound/AngelList token | Optional |

### Service Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_MODEL` | LLM model to use | `gpt-4` |
| `LLM_MAX_TOKENS` | Max tokens for LLM | `4000` |
| `LLM_TEMPERATURE` | LLM temperature | `0.7` |
| `LOG_LEVEL` | Logging level | `info` |
| `APP_ENV` | Environment name | `production` |
| `APP_URL` | Application URL | Required |

### Security Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SESSION_SECRET` | Session encryption secret | ✅ |
| `WEBHOOK_SECRET` | Webhook signature secret | ✅ |
| `SENTRY_DSN` | Sentry error tracking DSN | Recommended |

---

## Database Setup

### 1. PostgreSQL Setup

#### Using Railway
```bash
# Create new PostgreSQL instance via Railway dashboard
# Copy the DATABASE_URL from the connection settings
```

#### Using AWS RDS
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier ajob4agent-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15 \
  --master-username admin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name your-subnet-group
```

#### Database Migration
```bash
# Run migrations
cd services/agent-orchestrator
npm run migrate:production

# Verify migration status
npm run migrate:status
```

### 2. Redis Setup

#### Using Railway
- Create Redis instance via Railway dashboard
- Copy the REDIS_URL

#### Using AWS ElastiCache
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id ajob4agent-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1
```

### 3. RabbitMQ Setup

#### Using CloudAMQP
- Create instance at cloudamqp.com
- Copy the AMQP URL

---

## Infrastructure Setup

### Option 1: Vercel + Railway (Recommended for MVP)

#### Dashboard Service (Vercel)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and link project
   vercel login
   cd services/dashboard-service
   vercel link
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all required variables from `.env.example`

3. **Deploy**
   ```bash
   vercel --prod
   ```

#### Backend Services (Railway)

1. **Create Railway Project**
   - Go to railway.app and create new project
   - Add PostgreSQL and Redis services

2. **Deploy Services**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login and deploy
   railway login
   railway up
   ```

3. **Configure Environment**
   - Set environment variables in Railway dashboard
   - Configure service domains

### Option 2: AWS (Production Scale)

#### ECS/Fargate Deployment

1. **Create ECR Repositories**
   ```bash
   aws ecr create-repository --repository-name ajob4agent/llm-service
   aws ecr create-repository --repository-name ajob4agent/agent-orchestrator
   aws ecr create-repository --repository-name ajob4agent/dashboard-service
   aws ecr create-repository --repository-name ajob4agent/agent-monitoring-service
   ```

2. **Build and Push Images**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   
   # Build and push
   docker-compose build
   docker-compose push
   ```

3. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name ajob4agent-cluster
   ```

4. **Deploy Task Definitions**
   ```bash
   aws ecs register-task-definition --cli-input-json file://ecs/task-definitions/llm-service.json
   aws ecs register-task-definition --cli-input-json file://ecs/task-definitions/agent-orchestrator.json
   aws ecs register-task-definition --cli-input-json file://ecs/task-definitions/dashboard-service.json
   ```

5. **Create Services**
   ```bash
   aws ecs create-service \
     --cluster ajob4agent-cluster \
     --service-name llm-service \
     --task-definition llm-service \
     --desired-count 2 \
     --launch-type FARGATE
   ```

### Option 3: Docker Compose (Self-Hosted)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Deploy with production compose file
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

---

## CI/CD Configuration

### GitHub Actions Setup

1. **Configure Repository Secrets**
   
   Go to Settings → Secrets → Actions and add:
   - `OPENAI_API_KEY`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `RAILWAY_TOKEN`
   - `GHCR_TOKEN` (GitHub Container Registry)

2. **Enable Workflow**
   
   The CI/CD pipeline is configured in `.github/workflows/ci.yml`
   - Runs tests on all PRs
   - Builds Docker images on merge to main
   - Deploys to production automatically

### Vercel Integration

```bash
# Install Vercel GitHub integration
# Configure automatic deployments for main branch
# Preview deployments for PRs are automatic
```

---

## Deployment Steps

### Step 1: Final Checks
```bash
# Run full test suite locally
make test

# Check for security vulnerabilities
npm audit --all-workspaces
pip-audit -r services/llm-service/requirements.txt

# Verify Docker builds
docker-compose build
```

### Step 2: Database Migration
```bash
# Backup existing database (if applicable)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Run migrations
npm run migrate:production
```

### Step 3: Deploy Services

#### For Vercel + Railway:
```bash
# Deploy backend services
cd services/agent-orchestrator && railway up
cd services/llm-service && railway up

# Deploy frontend
cd services/dashboard-service && vercel --prod
```

#### For Docker Compose:
```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Deploy with zero-downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps --build
```

### Step 4: Verify Deployment
```bash
# Check service health
curl https://api.yourdomain.com/health
curl https://llm.yourdomain.com/health

# Run smoke tests
npm run test:e2e:production
```

---

## Post-Deployment

### Health Verification

```bash
# Check all service endpoints
./scripts/health-check.sh

# Verify database connectivity
docker-compose exec agent-orchestrator npm run db:check

# Check queue status
docker-compose exec rabbitmq rabbitmqctl list_queues
```

### Performance Baseline

```bash
# Run load test to establish baseline
k6 run scripts/load-test.js

# Check response times
curl -w "@scripts/curl-format.txt" https://api.yourdomain.com/health
```

### Update DNS (if new deployment)

1. Point A record to load balancer IP
2. Configure CNAME for subdomains
3. Verify SSL certificate propagation
4. Test from multiple geographic locations

---

## Monitoring and Alerts

### Setup Monitoring Stack

```bash
# Deploy monitoring (if using docker-compose)
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
```

### Configure Alerts

#### Critical Alerts (Immediate Response)
- [ ] Service health check failure
- [ ] Database connection errors
- [ ] Error rate > 5%
- [ ] Response time > 5s

#### Warning Alerts (1-hour Response)
- [ ] Memory usage > 80%
- [ ] CPU usage > 80%
- [ ] Disk usage > 85%
- [ ] Queue depth > 1000

### Monitoring Checklist
- [ ] Grafana dashboards configured
- [ ] Prometheus scraping enabled
- [ ] Alert rules defined
- [ ] PagerDuty/Slack integration configured
- [ ] Log aggregation working
- [ ] Error tracking (Sentry) enabled

---

## Security Checklist

### Pre-Deployment Security

- [ ] All secrets stored in secure vault
- [ ] No hardcoded credentials in code
- [ ] Dependencies scanned for vulnerabilities
- [ ] HTTPS enabled for all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection verified

### Infrastructure Security

- [ ] Firewall rules configured (only expose 80, 443)
- [ ] Database not publicly accessible
- [ ] SSH keys rotated
- [ ] VPC/network isolation configured
- [ ] Container images scanned
- [ ] Secrets encrypted at rest

### Post-Deployment Security

- [ ] SSL certificate valid and auto-renewing
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Failed login attempt monitoring
- [ ] Audit logging enabled
- [ ] Backup encryption verified

### Compliance

- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Data retention policies configured
- [ ] GDPR compliance (if applicable)

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)

```bash
# Revert to previous version
docker-compose -f docker-compose.prod.yml down
git checkout HEAD~1
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Restore from backup
pg_restore -d $DATABASE_URL backup_YYYYMMDD.sql

# Or run reverse migration
npm run migrate:rollback
```

### Vercel Rollback

```bash
# Via CLI
vercel rollback

# Or via dashboard - click "Promote to Production" on previous deployment
```

### Emergency Contacts

| Role | Contact | Phone |
|------|---------|-------|
| On-call Engineer | @oncall | - |
| DevOps Lead | @devops | - |
| Product Owner | @product | - |

---

## Appendix

### Useful Commands

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale agent-orchestrator=3

# Execute command in container
docker-compose exec llm-service python -c "import app; print(app.__version__)"

# Database shell
docker-compose exec postgres psql -U jobagent -d jobagent
```

### Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Dashboard | `/api/health` | `{"status": "healthy"}` |
| Orchestrator | `/health` | `{"status": "healthy"}` |
| LLM Service | `/health` | `{"status": "healthy"}` |
| Monitoring | `/health` | `{"status": "healthy"}` |

### Resource Requirements

| Service | Min CPU | Min Memory | Recommended CPU | Recommended Memory |
|---------|---------|------------|-----------------|-------------------|
| Dashboard | 0.25 | 256MB | 0.5 | 512MB |
| Orchestrator | 0.5 | 512MB | 1.0 | 1GB |
| LLM Service | 0.5 | 512MB | 1.0 | 1GB |
| Monitoring | 0.25 | 256MB | 0.5 | 512MB |
| PostgreSQL | 0.5 | 512MB | 1.0 | 2GB |
| Redis | 0.25 | 256MB | 0.5 | 512MB |
