#!/bin/bash
# VaxTrace Nigeria - Health Check Script
# Verifies the health of deployed services
# Usage: ./scripts/health-check.sh <environment>

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <environment>"
    log_error "Example: $0 staging"
    exit 1
fi

ENVIRONMENT=$1

# Default values
HEALTH_CHECK_URL=${HEALTH_CHECK_URL:-"http://localhost"}
MAX_RETRIES=${MAX_RETRIES:-30}
RETRY_INTERVAL=${RETRY_INTERVAL:-10}

log_info "Starting health check for $ENVIRONMENT environment..."
log_info "Health check URL: $HEALTH_CHECK_URL"
log_info "Max retries: $MAX_RETRIES"
log_info "Retry interval: $RETRY_INTERVAL seconds"

# Health check endpoints
ENDPOINTS=(
    "$HEALTH_CHECK_URL/health"
    "$HEALTH_CHECK_URL/api/health"
    "$HEALTH_CHECK_URL/api/v1/openlmis/stock"
)

# Function to check endpoint health
check_endpoint() {
    local url=$1
    local retry_count=0
    local response_code
    local response_body

    log_info "Checking endpoint: $url"

    while [ $retry_count -lt $MAX_RETRIES ]; do
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
        response_body=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "")

        if [ "$response_code" = "200" ]; then
            log_success "✓ $url - HTTP $response_code"
            
            # Check for health status in response
            if echo "$response_body" | grep -q '"status":"healthy"' || \
               echo "$response_body" | grep -q '"healthy":true' || \
               echo "$response_body" | grep -q 'healthy'; then
                log_success "  Service is healthy"
                return 0
            else
                log_warning "  Response does not contain health status"
                log_warning "  Response: $response_body"
            fi
        else
            log_warning "  Attempt $((retry_count + 1))/$MAX_RETRIES - HTTP $response_code"
        fi

        retry_count=$((retry_count + 1))
        
        if [ $retry_count -lt $MAX_RETRIES ]; then
            sleep $RETRY_INTERVAL
        fi
    done

    log_error "✗ $url - Failed after $MAX_RETRIES attempts"
    return 1
}

# Function to check container health (if SSH available)
check_containers() {
    if [ -n "$SSH_HOST" ] && [ -n "$SSH_USER" ] && [ -n "$SSH_PRIVATE_KEY" ]; then
        log_info "Checking container health..."
        
        SSH_KEY_FILE=$(mktemp)
        trap "rm -f $SSH_KEY_FILE" EXIT
        echo "$SSH_PRIVATE_KEY" > "$SSH_KEY_FILE"
        chmod 600 "$SSH_KEY_FILE"
        
        SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30"
        SSH_CMD="ssh $SSH_OPTS -i $SSH_KEY_FILE ${SSH_USER}@${SSH_HOST}"
        
        # Check if containers are running
        CONTAINER_STATUS=$($SSH_CMD "docker ps --format '{{.Names}}: {{.Status}}' 2>/dev/null || echo ''")
        
        if [ -n "$CONTAINER_STATUS" ]; then
            log_info "Container status:"
            echo "$CONTAINER_STATUS" | while read -r line; do
                if echo "$line" | grep -q "healthy"; then
                    log_success "  ✓ $line"
                else
                    log_warning "  ! $line"
                fi
            done
        else
            log_warning "Could not retrieve container status"
        fi
    else
        log_info "SSH credentials not provided, skipping container health check"
    fi
}

# Main health check
FAILED=0

log_info "=========================================="
log_info "Health Check for $ENVIRONMENT"
log_info "=========================================="

# Check each endpoint
for endpoint in "${ENDPOINTS[@]}"; do
    if ! check_endpoint "$endpoint"; then
        FAILED=1
    fi
    echo ""
done

# Check container health
check_containers
echo ""

# Summary
log_info "=========================================="
if [ $FAILED -eq 0 ]; then
    log_success "All health checks passed!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    exit 0
else
    log_error "Some health checks failed!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    exit 1
fi
