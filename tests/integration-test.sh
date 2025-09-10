#!/bin/bash

# Integration tests for AJOB4AGENT services
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[TEST] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Test service health endpoints
test_health_endpoints() {
    log "Testing health endpoints..."
    
    services=(
        "llm-service:8000"
        "agent-orchestrator:8080"
        "dashboard-service:3001"
        "agent-monitoring-service:8001"
    )
    
    for service in "${services[@]}"; do
        service_name=$(echo $service | cut -d':' -f1)
        port=$(echo $service | cut -d':' -f2)
        
        log "Testing $service_name health endpoint..."
        
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health || echo "000")
        
        if [ "$response" = "200" ]; then
            log "✓ $service_name health check passed"
        else
            error "✗ $service_name health check failed (HTTP $response)"
        fi
    done
}

# Test LLM service API
test_llm_service() {
    log "Testing LLM service API..."
    
    payload='{
        "job_data": {
            "job_id": "test-job-123",
            "platform": "linkedin",
            "job_url": "https://example.com/job",
            "job_title": "Software Engineer",
            "company_name": "Test Company",
            "raw_description": "We are looking for a skilled software engineer...",
            "recruiter_info": {
                "name": "John Doe",
                "profile_url": "https://linkedin.com/in/johndoe"
            }
        },
        "user_profile": {
            "user_id": "test-user-456",
            "raw_master_resume": "Experienced software engineer with 5 years...",
            "custom_preferences": {"location": "San Francisco", "salary_min": 100000}
        }
    }'
    
    response=$(curl -s -X POST "http://localhost:8000/tailor" \
        -H "Content-Type: application/json" \
        -d "$payload" || echo "")
    
    if echo "$response" | grep -q '"status":"success"'; then
        log "✓ LLM service API test passed"
    else
        error "✗ LLM service API test failed: $response"
    fi
}

# Test agent orchestrator API
test_orchestrator_service() {
    log "Testing agent orchestrator API..."
    
    # Test basic job processing endpoint
    payload='{
        "job_id": "test-job-789",
        "platform": "glassdoor",
        "status": "discovered"
    }'
    
    response=$(curl -s -X POST "http://localhost:8080/api/process-scraped-job" \
        -H "Content-Type: application/json" \
        -d "$payload" || echo "")
    
    if echo "$response" | grep -q '"status":"received"'; then
        log "✓ Agent orchestrator API test passed"
    else
        error "✗ Agent orchestrator API test failed: $response"
    fi
}

# Test dashboard service
test_dashboard_service() {
    log "Testing dashboard service..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ || echo "000")
    
    if [ "$response" = "200" ]; then
        log "✓ Dashboard service test passed"
    else
        error "✗ Dashboard service test failed (HTTP $response)"
    fi
}

# Test database connectivity
test_database() {
    log "Testing database connectivity..."
    
    if docker-compose exec -T postgres pg_isready -U ${POSTGRES_USER:-jobagent} >/dev/null 2>&1; then
        log "✓ Database connectivity test passed"
    else
        error "✗ Database connectivity test failed"
    fi
}

# Test message queue connectivity
test_message_queue() {
    log "Testing message queue connectivity..."
    
    if docker-compose exec -T rabbitmq rabbitmqctl status >/dev/null 2>&1; then
        log "✓ Message queue connectivity test passed"
    else
        error "✗ Message queue connectivity test failed"
    fi
}

# Main test function
run_tests() {
    log "Starting integration tests for AJOB4AGENT..."
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    test_database
    test_message_queue
    test_health_endpoints
    test_llm_service
    test_orchestrator_service
    test_dashboard_service
    
    log "All tests passed! 🎉"
}

# Handle script arguments
case "${1:-test}" in
    "test"|"all")
        run_tests
        ;;
    "health")
        test_health_endpoints
        ;;
    "llm")
        test_llm_service
        ;;
    "orchestrator")
        test_orchestrator_service
        ;;
    "dashboard")
        test_dashboard_service
        ;;
    "database")
        test_database
        ;;
    "queue")
        test_message_queue
        ;;
    *)
        echo "Usage: $0 {test|health|llm|orchestrator|dashboard|database|queue}"
        echo ""
        echo "  test        - Run all tests (default)"
        echo "  health      - Test health endpoints only"
        echo "  llm         - Test LLM service only"
        echo "  orchestrator   - Test orchestrator service only"
        echo "  dashboard   - Test dashboard service only"
        echo "  database    - Test database connectivity only"
        echo "  queue       - Test message queue connectivity only"
        exit 1
        ;;
esac