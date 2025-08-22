#!/bin/bash

# Production deployment script for AJOB4AGENT
set -e

# Configuration
PROJECT_NAME="AJOB4AGENT"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is required but not installed"
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found. Copy from $ENV_FILE.example and configure."
    fi
    
    log "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        log "Backing up database..."
        docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-jobagent} ${POSTGRES_DB:-jobagent} > "$BACKUP_DIR/${BACKUP_NAME}_database.sql"
    fi
    
    # Backup volumes
    docker run --rm -v $(pwd):/backup -w /backup alpine tar czf "$BACKUP_DIR/${BACKUP_NAME}_volumes.tar.gz" -C /var/lib/docker/volumes . 2>/dev/null || true
    
    log "Backup created: $BACKUP_NAME"
}

# Update application
update_application() {
    log "Updating application..."
    
    # Pull latest changes (if using git deployment)
    if [ -d ".git" ]; then
        log "Pulling latest changes from git..."
        git pull origin main
    fi
    
    # Build and update containers
    log "Building and updating containers..."
    docker-compose build --no-cache
    
    # Update services with zero-downtime deployment
    log "Performing rolling update..."
    
    # Update database and dependencies first
    docker-compose up -d postgres redis rabbitmq
    
    # Wait for dependencies
    log "Waiting for dependencies to be ready..."
    sleep 30
    
    # Update services one by one
    for service in llm-service agent-monitoring-service agent-orchestrator dashboard-service; do
        log "Updating $service..."
        docker-compose up -d --no-deps $service
        sleep 10
    done
    
    # Update nginx last
    docker-compose up -d nginx
    
    log "Application updated successfully"
}

# Health check
health_check() {
    log "Running health checks..."
    
    services=("llm-service:8000" "agent-orchestrator:8080" "dashboard-service:3001" "agent-monitoring-service:8001")
    
    for service in "${services[@]}"; do
        service_name=$(echo $service | cut -d':' -f1)
        port=$(echo $service | cut -d':' -f2)
        
        log "Checking $service_name..."
        
        max_attempts=30
        attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if curl -f -s http://localhost:$port/health >/dev/null 2>&1; then
                log "$service_name is healthy"
                break
            fi
            
            attempt=$((attempt + 1))
            sleep 2
        done
        
        if [ $attempt -eq $max_attempts ]; then
            error "$service_name failed health check"
        fi
    done
    
    log "All services are healthy"
}

# Cleanup old containers and images
cleanup() {
    log "Cleaning up old containers and images..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "backup_*" -mtime +7 -delete 2>/dev/null || true
    
    log "Cleanup completed"
}

# Main deployment function
deploy() {
    log "Starting production deployment for $PROJECT_NAME"
    
    check_prerequisites
    create_backup
    update_application
    health_check
    cleanup
    
    log "Deployment completed successfully!"
    log "Application is available at: http://localhost (or your configured domain)"
    
    # Display service status
    echo ""
    log "Service Status:"
    docker-compose ps
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "backup")
        create_backup
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|cleanup}"
        echo ""
        echo "  deploy  - Full production deployment (default)"
        echo "  backup  - Create backup only"
        echo "  health  - Run health checks only"
        echo "  cleanup - Cleanup old containers and images"
        exit 1
        ;;
esac