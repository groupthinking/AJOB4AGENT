# 🚀 AJOB4AGENT Quick Start Guide

This guide will help you get AJOB4AGENT up and running quickly in different environments.

## 📋 Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Git** for cloning the repository
- **curl** for testing endpoints
- Minimum **4GB RAM** and **10GB disk space**

## ⚡ Quick Setup

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/groupthinking/AJOB4AGENT.git
cd AJOB4AGENT

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your configuration:

```bash
# Required - Add your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here

# Required - Set secure passwords
JWT_SECRET=your_very_secure_jwt_secret_here_minimum_32_chars
API_KEY=your_internal_api_key_here

# Optional - Platform credentials (for full functionality)
LINKEDIN_EMAIL=your_linkedin_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password
```

### 3. Start Services

**For Production:**
```bash
# Start all services
docker-compose up -d

# Wait for services to be ready (takes 2-3 minutes)
./scripts/deploy.sh health

# Run integration tests
./tests/integration-test.sh
```

**For Development:**
```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

Once running, access these services:

| Service | URL | Description |
|---------|-----|-------------|
| **Dashboard** | http://localhost:3001 | Main user interface |
| **API Documentation** | http://localhost:8080/docs | Agent orchestrator API |
| **LLM Service** | http://localhost:8000/docs | AI content generation API |
| **Monitoring** | http://localhost:8001/health | System monitoring |
| **RabbitMQ Management** | http://localhost:15672 | Message queue (guest/guest) |

## 🔧 Development Setup

For local development with hot reload:

```bash
# Install dependencies
cd services/dashboard-service && npm install
cd ../agent-orchestrator && npm install
cd ../llm-service && pip install -r requirements.txt
cd ../agent-monitoring-service && pip install -r requirements.txt

# Start individual services
# Terminal 1 - Infrastructure
docker-compose up postgres redis rabbitmq

# Terminal 2 - Dashboard
cd services/dashboard-service && npm run dev

# Terminal 3 - Orchestrator
cd services/agent-orchestrator && npm run dev

# Terminal 4 - LLM Service
cd services/llm-service && uvicorn app.main:app --reload --port 8000

# Terminal 5 - Monitoring
cd services/agent-monitoring-service && python app/worker.py
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all integration tests
./tests/integration-test.sh

# Test specific components
./tests/integration-test.sh health     # Health checks only
./tests/integration-test.sh llm        # LLM service only
./tests/integration-test.sh dashboard  # Dashboard only
```

## 📊 Monitoring

Monitor your deployment:

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Resource usage
docker stats

# Health check all services
curl http://localhost:3001/api/health
curl http://localhost:8080/health
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## 🔒 Security Configuration

### Production Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set `APP_ENV=production` in `.env`
- [ ] Configure SSL certificates in `nginx/ssl/`
- [ ] Set up firewall rules (only expose ports 80, 443)
- [ ] Configure `ALLOWED_ORIGINS` and `ALLOWED_HOSTS`
- [ ] Set up monitoring and alerting
- [ ] Regular security updates: `./scripts/deploy.sh`

### SSL Certificate Setup

For production with HTTPS:

```bash
# Generate self-signed certificates (development only)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# For production, use Let's Encrypt or your certificate provider
# Copy your certificates to nginx/ssl/cert.pem and nginx/ssl/key.pem
```

## 🚨 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check logs
docker-compose logs

# Reset everything
docker-compose down -v
docker-compose up -d
```

**Database connection issues:**
```bash
# Check database status
docker-compose exec postgres pg_isready -U jobagent

# Reset database
docker-compose down postgres
docker volume rm ajob4agent_postgres_data
docker-compose up -d postgres
```

**Port conflicts:**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :8080

# Change ports in docker-compose.yml if needed
```

**Memory issues:**
```bash
# Check Docker memory usage
docker system df
docker system prune -f

# Increase Docker memory limit in Docker Desktop settings
```

### Health Check Commands

```bash
# Quick health check
curl -f http://localhost:3001/api/health && echo "✓ Dashboard OK"
curl -f http://localhost:8080/health && echo "✓ Orchestrator OK"
curl -f http://localhost:8000/health && echo "✓ LLM Service OK"
curl -f http://localhost:8001/health && echo "✓ Monitoring OK"

# Database connectivity
docker-compose exec postgres pg_isready -U jobagent

# Message queue status
docker-compose exec rabbitmq rabbitmqctl status
```

### Performance Tuning

For high-load production environments:

```bash
# Scale services horizontally
docker-compose up -d --scale agent-orchestrator=3
docker-compose up -d --scale llm-service=2

# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## 📚 Next Steps

1. **Configure Job Platforms**: Add your credentials for LinkedIn, Glassdoor, Wellfound
2. **Customize AI Prompts**: Modify LLM prompts in `services/llm-service/app/`
3. **Set Up Monitoring**: Configure Prometheus/Grafana for production monitoring
4. **Add Custom Agents**: Extend the platform with new job site adapters
5. **Scale Deployment**: Use Kubernetes manifests for enterprise deployment

## 🆘 Getting Help

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/groupthinking/AJOB4AGENT/issues)
- 💬 [Discussions](https://github.com/groupthinking/AJOB4AGENT/discussions)
- 📧 Email: support@ajob4agent.com

---

**⚡ Pro Tip**: Start with the development setup to familiarize yourself with the system, then move to production deployment once you're comfortable with the configuration.