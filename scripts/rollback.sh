#!/bin/bash
# VaxTrace Nigeria - Rollback Script
# Rolls back to the previous deployment
# Usage: ./scripts/rollback.sh <environment> [backup_name]

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

# Confirm rollback
confirm_rollback() {
    log_warning "=========================================="
    log_warning "ROLLBACK CONFIRMATION"
    log_warning "=========================================="
    log_warning "Environment: $ENVIRONMENT"
    log_warning "Backup: $BACKUP_NAME"
    log_warning ""
    log_warning "This will:"
    log_warning "  1. Stop current containers"
    log_warning "  2. Restore previous configuration"
    log_warning "  3. Restart containers with backup"
    log_warning ""
    log_warning "This action cannot be undone easily!"
    log_warning "=========================================="
    
    read -p "Are you sure you want to rollback? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

# Validate arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <environment> [backup_name]"
    log_error "Example: $0 production backup-20240101-120000"
    exit 1
fi

ENVIRONMENT=$1
BACKUP_NAME=${2:-""}

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

log_info "Starting rollback to $ENVIRONMENT environment..."

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

# List available backups if no backup name provided
if [ -z "$BACKUP_NAME" ]; then
    log_info "Available backups:"
    $SSH_CMD "ls -lt ~/vaxtrace/backups/*.yml 2>/dev/null | head -10" || log_warning "No backups found"
    echo ""
    read -p "Enter backup name (or press Ctrl+C to cancel): " BACKUP_NAME
    
    if [ -z "$BACKUP_NAME" ]; then
        log_error "No backup name provided"
        exit 1
    fi
fi

# Confirm rollback
confirm_rollback

# Check if backup exists
log_info "Checking if backup exists..."
if ! $SSH_CMD "test -f ~/vaxtrace/backups/$BACKUP_NAME.yml"; then
    log_error "Backup file not found: ~/vaxtrace/backups/$BACKUP_NAME.yml"
    exit 1
fi
log_success "Backup found"

# Create emergency backup of current state
log_info "Creating emergency backup of current state..."
EMERGENCY_BACKUP="emergency-backup-$(date +%Y%m%d-%H%M%S)"
$SSH_CMD "cd ~/vaxtrace && docker-compose ps > ~/backups/\${EMERGENCY_BACKUP}.ps 2>/dev/null || true"
$SSH_CMD "cd ~/vaxtrace && docker-compose config > ~/backups/\${EMERGENCY_BACKUP}.yml 2>/dev/null || true"
log_success "Emergency backup created: $EMERGENCY_BACKUP"

# Stop current containers
log_info "Stopping current containers..."
$SSH_CMD "cd ~/vaxtrace && docker-compose down" || log_warning "No containers to stop"

# Restore backup configuration
log_info "Restoring backup configuration..."
$SSH_CMD "cp ~/vaxtrace/backups/$BACKUP_NAME.yml ~/vaxtrace/docker-compose.yml"

# Pull images for the backup
log_info "Pulling Docker images from backup..."
BACKUP_IMAGES=$($SSH_CMD "grep 'image:' ~/vaxtrace/backups/$BACKUP_NAME.yml | awk '{print \$2}' | tr '\n' ' '")

for image in $BACKUP_IMAGES; do
    log_info "Pulling image: $image"
    $SSH_CMD "docker pull $image" || log_warning "Failed to pull image: $image"
done

# Start containers with backup configuration
log_info "Starting containers with backup configuration..."
$SSH_CMD "cd ~/vaxtrace && docker-compose up -d"

# Wait for containers to start
log_info "Waiting for containers to start..."
sleep 10

# Verify containers are running
log_info "Verifying containers are running..."
RUNNING_CONTAINERS=$($SSH_CMD "cd ~/vaxtrace && docker-compose ps -q | wc -l")

if [ "$RUNNING_CONTAINERS" -lt 1 ]; then
    log_error "No containers are running after rollback!"
    log_info "You can restore the emergency backup: $EMERGENCY_BACKUP"
    exit 1
fi

log_success "Containers are running"

# Wait for health checks
log_info "Waiting for containers to become healthy..."
MAX_WAIT=60
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    HEALTHY=$($SSH_CMD "cd ~/vaxtrace && docker-compose ps | grep -c 'healthy\|Up' || echo 0")
    if [ "$HEALTHY" -ge 2 ]; then
        log_success "Containers are healthy"
        break
    fi
    log_info "Waiting... ($WAIT_TIME/$MAX_WAIT seconds)"
    sleep 5
    WAIT_TIME=$((WAIT_TIME + 5))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    log_warning "Containers did not become healthy within $MAX_WAIT seconds"
    log_info "Container status:"
    $SSH_CMD "cd ~/vaxtrace && docker-compose ps"
fi

# Display running containers
log_info "Running containers:"
$SSH_CMD "cd ~/vaxtrace && docker-compose ps"

# Create rollback record
ROLLBACK_RECORD=$(cat <<EOF
{
  "environment": "$ENVIRONMENT",
  "rolled_back_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_name": "$BACKUP_NAME",
  "emergency_backup": "$EMERGENCY_BACKUP",
  "containers_running": "$RUNNING_CONTAINERS"
}
EOF
)

log_info "Saving rollback record..."
echo "$ROLLBACK_RECORD" | $SSH_CMD "cat > ~/vaxtrace/deployments/\$(date +%Y%m%d-%H%M%S)-rollback.json"

log_success "=========================================="
log_success "Rollback completed successfully!"
log_success "=========================================="
log_info "Backup used: $BACKUP_NAME"
log_info "Emergency backup: $EMERGENCY_BACKUP"
log_info "Containers running: $RUNNING_CONTAINERS"
log_info ""
log_info "To restore the previous version, run:"
log_info "  ./scripts/rollback.sh $ENVIRONMENT $EMERGENCY_BACKUP"

exit 0
