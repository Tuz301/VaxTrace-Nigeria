#!/bin/bash
# VaxTrace Nigeria - Deployment Script
# Deploys Docker containers to staging or production environment
# Usage: ./scripts/deploy.sh <environment> <backend_image> <frontend_image> <nginx_image>

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
if [ $# -lt 4 ]; then
    log_error "Usage: $0 <environment> <backend_image> <frontend_image> <nginx_image>"
    log_error "Example: $0 staging ghcr.io/user/vaxtrace/backend:latest ghcr.io/user/vaxtrace/frontend:latest ghcr.io/user/vaxtrace/nginx:latest"
    exit 1
fi

ENVIRONMENT=$1
BACKEND_IMAGE=$2
FRONTEND_IMAGE=$3
NGINX_IMAGE=$4

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
fi

# Check required environment variables
if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ] || [ -z "$SSH_PRIVATE_KEY" ]; then
    log_error "Missing required environment variables: SSH_HOST, SSH_USER, SSH_PRIVATE_KEY"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT environment..."
log_info "Backend: $BACKEND_IMAGE"
log_info "Frontend: $FRONTEND_IMAGE"
log_info "Nginx: $NGINX_IMAGE"

# Create SSH key file
SSH_KEY_FILE=$(mktemp)
trap "rm -f $SSH_KEY_FILE" EXIT
echo "$SSH_PRIVATE_KEY" > "$SSH_KEY_FILE"
chmod 600 "$SSH_KEY_FILE"

# SSH connection details
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30"
SSH_CMD="ssh $SSH_OPTS -i $SSH_KEY_FILE ${SSH_USER}@${SSH_HOST}"

# Test SSH connection
log_info "Testing SSH connection..."
if ! $SSH_CMD "echo 'Connection successful'" > /dev/null 2>&1; then
    log_error "Failed to connect to $SSH_HOST"
    exit 1
fi
log_success "SSH connection successful"

# Create deployment directory on remote server
log_info "Setting up deployment directory..."
$SSH_CMD "mkdir -p ~/vaxtrace/deployments ~/vaxtrace/backups"

# Create docker-compose file for the deployment
log_info "Creating docker-compose configuration..."
COMPOSE_FILE=$(cat <<EOF
version: '3.8'

services:
  backend:
    image: $BACKEND_IMAGE
    container_name: vaxtrace-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=8000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
    networks:
      - vaxtrace-network
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: $FRONTEND_IMAGE
    container_name: vaxtrace-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    networks:
      - vaxtrace-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: $NGINX_IMAGE
    container_name: vaxtrace-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - vaxtrace-network
    depends_on:
      - backend
      - frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  redis:
    image: redis:7.2-alpine
    container_name: vaxtrace-redis
    restart: unless-stopped
    command: >
      redis-server
      --requirepass \${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
      --appendonly yes
      --appendfsync everysec
    networks:
      - vaxtrace-network
    volumes:
      - redis-data:/data

networks:
  vaxtrace-network:
    driver: bridge

volumes:
  redis-data:
    driver: local
EOF
)

# Upload docker-compose file
log_info "Uploading docker-compose configuration..."
echo "$COMPOSE_FILE" | $SSH_CMD "cat > ~/vaxtrace/docker-compose.yml"

# Pull latest images
log_info "Pulling latest Docker images..."
$SSH_CMD "cd ~/vaxtrace && docker-compose pull"

# Backup current deployment
log_info "Backing up current deployment..."
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
$SSH_CMD "cd ~/vaxtrace && docker-compose ps > ~/backups/\${BACKUP_NAME}.ps 2>/dev/null || true"
$SSH_CMD "cd ~/vaxtrace && docker-compose config > ~/backups/\${BACKUP_NAME}.yml 2>/dev/null || true"

# Stop current containers
log_info "Stopping current containers..."
$SSH_CMD "cd ~/vaxtrace && docker-compose down" || log_warning "No existing containers to stop"

# Start new containers
log_info "Starting new containers..."
$SSH_CMD "cd ~/vaxtrace && docker-compose up -d"

# Wait for containers to be healthy
log_info "Waiting for containers to be healthy..."
MAX_WAIT=120
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    HEALTHY=$($SSH_CMD "cd ~/vaxtrace && docker-compose ps | grep -c 'healthy' || echo 0")
    if [ "$HEALTHY" -ge 3 ]; then
        log_success "All containers are healthy"
        break
    fi
    log_info "Waiting for containers... ($WAIT_TIME/$MAX_WAIT seconds)"
    sleep 5
    WAIT_TIME=$((WAIT_TIME + 5))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    log_error "Containers did not become healthy within $MAX_WAIT seconds"
    log_info "Container status:"
    $SSH_CMD "cd ~/vaxtrace && docker-compose ps"
    exit 1
fi

# Clean up old images
log_info "Cleaning up old Docker images..."
$SSH_CMD "docker image prune -af --filter 'until=24h'"

# Display running containers
log_info "Running containers:"
$SSH_CMD "cd ~/vaxtrace && docker-compose ps"

# Save deployment record
DEPLOYMENT_RECORD=$(cat <<EOF
{
  "environment": "$ENVIRONMENT",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backend_image": "$BACKEND_IMAGE",
  "frontend_image": "$FRONTEND_IMAGE",
  "nginx_image": "$NGINX_IMAGE",
  "backup_name": "$BACKUP_NAME"
}
EOF
)

log_info "Saving deployment record..."
echo "$DEPLOYMENT_RECORD" | $SSH_CMD "cat > ~/vaxtrace/deployments/\$(date +%Y%m%d-%H%M%S)-deployment.json"

log_success "Deployment to $ENVIRONMENT completed successfully!"
log_info "Backup: $BACKUP_NAME"
log_info "Deployment record saved"

exit 0
