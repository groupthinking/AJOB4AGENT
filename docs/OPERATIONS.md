# Operations Guide - AJOB4AGENT

This guide covers operational aspects of running AJOB4AGENT in production.

## 🔧 System Requirements

### Minimum Requirements
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 10 Mbps up/down
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, RHEL 8+)

### Recommended Production
- **CPU**: 4+ cores, 2.5 GHz
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD with backup
- **Network**: 100 Mbps up/down
- **OS**: Linux with container runtime
- **Load Balancer**: Nginx, HAProxy, or cloud LB

### Scaling Considerations
- **Light Load**: 1-100 applications/day - Minimum requirements
- **Medium Load**: 100-1000 applications/day - Recommended specs
- **High Load**: 1000+ applications/day - Horizontal scaling required

## 📊 Monitoring & Alerting

### Key Metrics to Monitor

#### Application Metrics
- Applications processed per hour/day
- Success rate percentage
- Average processing time
- Queue depth and processing lag
- Error rate by service

#### Infrastructure Metrics
- CPU utilization (< 80%)
- Memory utilization (< 85%)
- Disk usage (< 90%)
- Network I/O
- Container restart count

#### Service Health
- HTTP response times (< 2s)
- Database connection pool usage
- Message queue depth
- External API rate limit usage

### Monitoring Setup

#### Using Docker Stats
```bash
# Real-time resource monitoring
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Log to file for analysis
docker stats --no-stream >> /var/log/docker-stats.log
```

#### Health Check Script
```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

services=("dashboard-service:3001" "agent-orchestrator:8080" "llm-service:8000" "agent-monitoring-service:8001")
alert_webhook="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

for service in "${services[@]}"; do
    name=$(echo $service | cut -d':' -f1)
    port=$(echo $service | cut -d':' -f2)
    
    if ! curl -f -s http://localhost:$port/health > /dev/null; then
        echo "ALERT: $name is down"
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"🚨 AJOB4AGENT Alert: $name service is down\"}" \
             $alert_webhook
    fi
done
```

#### Crontab Setup
```bash
# Add to /etc/crontab
*/5 * * * * root /usr/local/bin/health-check.sh
0 */6 * * * root docker system prune -f --volumes
```

### Log Management

#### Centralized Logging
```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  fluentd:
    image: fluent/fluentd:v1.16-debian-1
    ports:
      - "24224:24224"
    volumes:
      - ./fluentd:/fluentd/etc
      - /var/log/fluentd:/var/log/fluentd
    environment:
      FLUENTD_CONF: fluent.conf

  # Add to all services:
  llm-service:
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: ajob4agent.llm
```

#### Log Rotation
```bash
# /etc/logrotate.d/ajob4agent
/var/log/ajob4agent/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 root root
    postrotate
        docker-compose restart > /dev/null 2>&1 || true
    endscript
}
```

## 🔒 Security Operations

### Security Checklist

#### Container Security
- [ ] Run containers as non-root users
- [ ] Use official base images with security updates
- [ ] Scan images for vulnerabilities
- [ ] Limit container capabilities
- [ ] Use read-only root filesystems where possible

#### Network Security
- [ ] Use reverse proxy (Nginx) for all external traffic
- [ ] Enable TLS/SSL with valid certificates
- [ ] Configure firewall (only expose ports 80, 443)
- [ ] Use private networks for service communication
- [ ] Implement rate limiting

#### Application Security
- [ ] Secure API keys and secrets management
- [ ] Regular security updates
- [ ] Input validation and sanitization
- [ ] SQL injection protection
- [ ] CORS configuration

### Security Monitoring
```bash
# Log failed authentication attempts
grep "401" /var/log/nginx/access.log | tail -100

# Monitor unusual API usage
docker-compose logs agent-orchestrator | grep "WARN\|ERROR" | tail -50

# Check for port scans
sudo netstat -tuln | grep LISTEN
```

## 🗄️ Database Operations

### Backup Strategy

#### Automated Backups
```bash
#!/bin/bash
# /usr/local/bin/backup-db.sh

BACKUP_DIR="/var/backups/ajob4agent"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="jobagent"
DB_USER="jobagent"

mkdir -p $BACKUP_DIR

# Create database backup
docker-compose exec -T postgres pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: db_backup_$DATE.sql.gz"
```

#### Backup Verification
```bash
# Test backup integrity
gunzip -t /var/backups/ajob4agent/db_backup_latest.sql.gz

# Test restore in staging environment
docker-compose exec postgres psql -U jobagent -d jobagent_test < backup.sql
```

### Database Maintenance

#### Regular Maintenance Tasks
```sql
-- Connect to database
docker-compose exec postgres psql -U jobagent -d jobagent

-- Analyze database performance
ANALYZE;

-- Check database size
SELECT pg_size_pretty(pg_database_size('jobagent'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for long-running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

## 📈 Performance Tuning

### Service Scaling

#### Horizontal Scaling
```bash
# Scale orchestrator service
docker-compose up -d --scale agent-orchestrator=3

# Scale with custom configuration
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

#### Load Balancing Configuration
```nginx
# /etc/nginx/conf.d/ajob4agent-upstream.conf
upstream orchestrator_backend {
    least_conn;
    server agent-orchestrator-1:8080 max_fails=3 fail_timeout=30s;
    server agent-orchestrator-2:8080 max_fails=3 fail_timeout=30s;
    server agent-orchestrator-3:8080 max_fails=3 fail_timeout=30s;
}

server {
    location /api/ {
        proxy_pass http://orchestrator_backend;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 2s;
        proxy_read_timeout 10s;
    }
}
```

### Database Performance

#### Connection Pooling
```env
# .env configuration
DATABASE_URL=postgresql://jobagent:password@postgres:5432/jobagent?pool_size=20&max_overflow=30
```

#### Query Optimization
```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_applications_user_id ON applications(user_id);
CREATE INDEX CONCURRENTLY idx_applications_created_at ON applications(created_at);
CREATE INDEX CONCURRENTLY idx_jobs_platform_status ON jobs(platform, status);
```

### Cache Configuration

#### Redis Optimization
```redis
# /etc/redis/redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 🚨 Incident Response

### Common Issues and Solutions

#### Service Down
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs --tail=100 [service-name]

# Restart single service
docker-compose restart [service-name]

# Full system restart
docker-compose down && docker-compose up -d
```

#### High CPU Usage
```bash
# Identify resource-heavy containers
docker stats --no-stream

# Check for runaway processes
docker-compose exec [service] top

# Scale down if needed
docker-compose up -d --scale [service]=1
```

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec postgres pg_isready -U jobagent

# Check connection pool status
docker-compose logs postgres | grep "connection"

# Restart database (with downtime)
docker-compose restart postgres
```

#### Queue Backup
```bash
# Check RabbitMQ queue depth
docker-compose exec rabbitmq rabbitmqctl list_queues

# Purge queue if needed (destructive)
docker-compose exec rabbitmq rabbitmqctl purge_queue application_status_queue

# Scale processing services
docker-compose up -d --scale agent-monitoring-service=2
```

### Escalation Procedures

#### Severity Levels

**P1 - Critical (Response: Immediate)**
- Complete system outage
- Data loss or corruption
- Security breach
- Action: Page on-call engineer

**P2 - High (Response: 30 minutes)**
- Single service outage
- Performance degradation > 50%
- Action: Alert team lead

**P3 - Medium (Response: 2 hours)**
- Minor performance issues
- Non-critical feature unavailable
- Action: Create ticket

**P4 - Low (Response: Next business day)**
- Cosmetic issues
- Enhancement requests
- Action: Add to backlog

## 📋 Maintenance Procedures

### Regular Maintenance Schedule

#### Daily
- [ ] Check service health status
- [ ] Review error logs
- [ ] Monitor resource utilization
- [ ] Verify backup completion

#### Weekly
- [ ] Review performance metrics
- [ ] Update security patches
- [ ] Clean up old logs and backups
- [ ] Review capacity planning

#### Monthly
- [ ] Security vulnerability assessment
- [ ] Disaster recovery test
- [ ] Performance optimization review
- [ ] Documentation updates

### Update Procedures

#### Rolling Updates (Zero Downtime)
```bash
# Update procedure
./scripts/deploy.sh

# Verify deployment
./tests/integration-test.sh
```

#### Emergency Rollback
```bash
# Quick rollback to previous version
docker-compose down
git checkout HEAD~1
docker-compose up -d

# Restore database if needed
gunzip -c /var/backups/ajob4agent/db_backup_latest.sql.gz | \
    docker-compose exec -T postgres psql -U jobagent -d jobagent
```

## 🔧 Troubleshooting

### Debug Mode
```bash
# Enable debug logging
echo "LOG_LEVEL=debug" >> .env
docker-compose restart

# Follow debug logs
docker-compose logs -f | grep DEBUG
```

### Performance Profiling
```bash
# Container resource usage
docker exec [container_id] cat /proc/meminfo
docker exec [container_id] iostat 1 5

# Application-level profiling
docker-compose exec llm-service python -m cProfile -s cumulative app/main.py
```

### Network Debugging
```bash
# Test service connectivity
docker-compose exec dashboard-service curl http://agent-orchestrator:8080/health

# Check DNS resolution
docker-compose exec dashboard-service nslookup agent-orchestrator

# Monitor network traffic
docker-compose exec agent-orchestrator netstat -tulpn
```