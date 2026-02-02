#!/bin/bash
# VaxTrace Nigeria - Database Backup Script
# Creates backups of the PostgreSQL database
# Usage: ./scripts/backup-db.sh <environment>

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
    log_error "Example: $0 production"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
fi

# Check required environment variables
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    log_error "Missing required environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

# Backup bucket (optional)
BACKUP_BUCKET=${BACKUP_BUCKET:-""}

log_info "Starting database backup for $ENVIRONMENT environment..."
log_info "Database: $DB_HOST/$DB_NAME"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILENAME="vaxtrace-${ENVIRONMENT}-${TIMESTAMP}.sql.gz"
BACKUP_DIR="/tmp/vaxtrace-backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Backup filename: $BACKUP_FILENAME"

# Database connection string
DB_CONN="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"

# Create backup
log_info "Creating database backup..."

if pg_dump "$DB_CONN" | gzip > "$BACKUP_DIR/$BACKUP_FILENAME"; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILENAME" | cut -f1)
    log_success "Backup created successfully!"
    log_info "Backup size: $BACKUP_SIZE"
else
    log_error "Backup failed!"
    exit 1
fi

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_DIR/$BACKUP_FILENAME" | awk '{print $1}')
log_info "SHA256 checksum: $CHECKSUM"

# Upload to S3 if bucket is provided
if [ -n "$BACKUP_BUCKET" ]; then
    log_info "Uploading backup to S3..."
    
    if command -v aws > /dev/null 2>&1; then
        if aws s3 cp "$BACKUP_DIR/$BACKUP_FILENAME" "s3://$BACKUP_BUCKET/vaxtrace/$ENVIRONMENT/$BACKUP_FILENAME"; then
            log_success "Backup uploaded to S3"
            log_info "S3 path: s3://$BACKUP_BUCKET/vaxtrace/$ENVIRONMENT/$BACKUP_FILENAME"
        else
            log_warning "Failed to upload backup to S3"
        fi
    else
        log_warning "AWS CLI not found, skipping S3 upload"
    fi
fi

# Clean up old backups (keep last 30 days)
log_info "Cleaning up old local backups..."
find "$BACKUP_DIR" -name "vaxtrace-${ENVIRONMENT}-*.sql.gz" -mtime +30 -delete 2>/dev/null || log_warning "Could not clean up old backups"

# Summary
log_info "=========================================="
log_success "Backup completed successfully!"
log_info "=========================================="
log_info "Environment: $ENVIRONMENT"
log_info "Backup file: $BACKUP_DIR/$BACKUP_FILENAME"
log_info "Backup size: $BACKUP_SIZE"
log_info "Checksum: $CHECKSUM"
log_info "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Create backup record
BACKUP_RECORD=$(cat <<EOF
{
  "environment": "$ENVIRONMENT",
  "backup_filename": "$BACKUP_FILENAME",
  "backup_size": "$BACKUP_SIZE",
  "checksum": "$CHECKSUM",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "s3_path": "s3://$BACKUP_BUCKET/vaxtrace/$ENVIRONMENT/$BACKUP_FILENAME"
}
EOF
)

log_info "Backup record: $BACKUP_RECORD"

exit 0
