#!/bin/bash

# Development setup script for AJOB4AGENT
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is required but not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is required but not installed. Please install Docker Compose first."
    fi
    
    # Check Node.js (for local development)
    if ! command -v node &> /dev/null; then
        warn "Node.js not found. Install Node.js 18+ for local development."
    else
        node_version=$(node -v | cut -d'.' -f1 | sed 's/v//')
        if [ "$node_version" -lt 18 ]; then
            warn "Node.js version 18+ recommended. Current version: $(node -v)"
        fi
    fi
    
    # Check Python (for local development)
    if ! command -v python3 &> /dev/null; then
        warn "Python 3 not found. Install Python 3.9+ for local development."
    else
        python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        info "Python version: $python_version"
    fi
    
    # Check available memory
    available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_memory" -lt 2048 ]; then
        warn "Low available memory: ${available_memory}MB. Recommended: 4GB+"
    fi
    
    # Check available disk space
    available_space=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$available_space" -lt 10 ]; then
        warn "Low available disk space: ${available_space}GB. Recommended: 10GB+"
    fi
    
    log "System requirements check completed"
}

# Setup environment
setup_environment() {
    log "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        log "Creating .env file from template..."
        cp .env.example .env
        
        # Generate secure JWT secret
        jwt_secret=$(openssl rand -base64 32 2>/dev/null || date | md5sum | head -c 32)
        sed -i "s/your_very_secure_jwt_secret_here_minimum_32_chars/$jwt_secret/" .env
        
        # Generate API key
        api_key=$(openssl rand -hex 16 2>/dev/null || date | sha256sum | head -c 32)
        sed -i "s/your_internal_api_key_here/$api_key/" .env
        
        warn "Please edit .env file and add your OpenAI API key and other credentials"
        info "Required: OPENAI_API_KEY"
        info "Optional: LINKEDIN_EMAIL, LINKEDIN_PASSWORD for platform agents"
    else
        info ".env file already exists"
    fi
}

# Setup development dependencies
setup_dev_dependencies() {
    log "Setting up development dependencies..."
    
    # Dashboard Service
    if [ -d "services/dashboard-service" ]; then
        log "Installing Dashboard Service dependencies..."
        cd services/dashboard-service
        if [ -f package.json ]; then
            npm install || warn "Failed to install dashboard dependencies"
        fi
        cd ../..
    fi
    
    # Agent Orchestrator
    if [ -d "services/agent-orchestrator" ]; then
        log "Installing Agent Orchestrator dependencies..."
        cd services/agent-orchestrator
        if [ -f package.json ]; then
            npm install || warn "Failed to install orchestrator dependencies"
        fi
        cd ../..
    fi
    
    # Python services
    for service in "llm-service" "agent-monitoring-service"; do
        if [ -d "services/$service" ]; then
            log "Installing $service dependencies..."
            cd "services/$service"
            if [ -f requirements.txt ]; then
                python3 -m pip install --user -r requirements.txt || warn "Failed to install $service dependencies"
            fi
            cd ../..
        fi
    done
}

# Create development directories
setup_directories() {
    log "Creating development directories..."
    
    mkdir -p logs
    mkdir -p backups
    mkdir -p tmp
    mkdir -p nginx/ssl
    
    # Create log files
    touch logs/app.log
    touch logs/error.log
}

# Generate SSL certificates for development
setup_ssl() {
    log "Setting up development SSL certificates..."
    
    if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
        log "Generating self-signed SSL certificates for development..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=Dev/L=Dev/O=AJOB4AGENT/CN=localhost" \
            2>/dev/null || warn "Failed to generate SSL certificates"
    else
        info "SSL certificates already exist"
    fi
}

# Create development scripts
setup_dev_scripts() {
    log "Creating development helper scripts..."
    
    # Create start script
    cat > scripts/dev-start.sh << 'EOF'
#!/bin/bash
echo "Starting AJOB4AGENT in development mode..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
echo "Services starting... Run 'docker-compose logs -f' to view logs"
EOF
    chmod +x scripts/dev-start.sh
    
    # Create stop script
    cat > scripts/dev-stop.sh << 'EOF'
#!/bin/bash
echo "Stopping AJOB4AGENT development environment..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
EOF
    chmod +x scripts/dev-stop.sh
    
    # Create logs script
    cat > scripts/dev-logs.sh << 'EOF'
#!/bin/bash
service=${1:-}
if [ -z "$service" ]; then
    docker-compose logs -f
else
    docker-compose logs -f "$service"
fi
EOF
    chmod +x scripts/dev-logs.sh
    
    info "Development scripts created in scripts/ directory"
}

# Pull Docker images
pull_images() {
    log "Pulling required Docker images..."
    
    # Pull base images to speed up builds
    docker pull node:18-alpine
    docker pull python:3.11-slim
    docker pull postgres:15-alpine
    docker pull redis:7-alpine
    docker pull rabbitmq:3-management-alpine
    docker pull nginx:alpine
    
    log "Docker images pulled successfully"
}

# Validate setup
validate_setup() {
    log "Validating development setup..."
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running"
    fi
    
    # Check environment file
    if [ ! -f .env ]; then
        error ".env file not found"
    fi
    
    # Check if required directories exist
    for dir in logs backups nginx/ssl scripts; do
        if [ ! -d "$dir" ]; then
            error "Directory $dir not found"
        fi
    done
    
    log "Setup validation completed successfully"
}

# Display setup summary
show_summary() {
    log "Development setup completed successfully!"
    echo ""
    info "Next steps:"
    echo "  1. Edit .env file with your OpenAI API key and credentials"
    echo "  2. Start development environment: ./scripts/dev-start.sh"
    echo "  3. View logs: ./scripts/dev-logs.sh"
    echo "  4. Run tests: ./tests/integration-test.sh"
    echo "  5. Access dashboard: http://localhost:3001"
    echo ""
    info "Development helper scripts:"
    echo "  ./scripts/dev-start.sh  - Start development environment"
    echo "  ./scripts/dev-stop.sh   - Stop development environment"  
    echo "  ./scripts/dev-logs.sh   - View service logs"
    echo "  ./scripts/deploy.sh     - Production deployment"
    echo ""
    info "Service URLs (after starting):"
    echo "  Dashboard:     http://localhost:3001"
    echo "  API Docs:      http://localhost:8080/docs"
    echo "  LLM Service:   http://localhost:8000/docs"
    echo "  Monitoring:    http://localhost:8001/health"
    echo "  RabbitMQ:      http://localhost:15672 (guest/guest)"
    echo ""
    warn "Remember to configure your .env file before starting services!"
}

# Main setup function
main() {
    log "Starting AJOB4AGENT development setup..."
    
    check_requirements
    setup_environment
    setup_directories
    setup_ssl
    setup_dev_scripts
    pull_images
    
    # Only install dependencies if requested
    if [[ "$1" == "--with-deps" ]]; then
        setup_dev_dependencies
    else
        info "Skipping dependency installation. Run with --with-deps to install."
    fi
    
    validate_setup
    show_summary
}

# Handle script arguments
case "${1:-setup}" in
    "setup"|"--with-deps")
        main "$1"
        ;;
    "deps")
        setup_dev_dependencies
        ;;
    "env")
        setup_environment
        ;;
    "ssl")
        setup_ssl
        ;;
    "validate")
        validate_setup
        ;;
    *)
        echo "Usage: $0 {setup|--with-deps|deps|env|ssl|validate}"
        echo ""
        echo "  setup      - Full setup without dependencies (default)"
        echo "  --with-deps- Full setup including npm/pip dependencies"
        echo "  deps       - Install dependencies only"
        echo "  env        - Setup environment file only"
        echo "  ssl        - Generate SSL certificates only"
        echo "  validate   - Validate existing setup"
        exit 1
        ;;
esac