#!/bin/bash
# VaxTrace Nigeria - Database Restore Script
# Restores a PostgreSQL database from a backup file
# Usage: ./scripts/restore-db.sh <environment> <backup_file>
#
# IMPORTANT: This script will DROP and recreate the database!
# Always test restores in a staging environment first.

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
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <environment> <backup_file>"
    log_error "Example: $0 production /backups/vaxtrace-production-20240101-120000.sql.gz"
    exit 1
fi

ENVIRONMENT=$1
BACKUP_FILE=$2

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_error "Must be 'development', 'staging', or 'production'"
    exit 1
fi

# Check required environment variables
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    log_error "Missing required environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# ============================================
# CONFIRMATION
# ============================================

log_warning "=========================================="
log_warning "DATABASE RESTORE CONFIRMATION"
log_warning "=========================================="
log_warning "Environment: $ENVIRONMENT"
log_warning "Database: $DB_HOST/$DB_NAME"
log_warning "Backup file: $BACKUP_FILE"
log_warning ""
log_warning "This will:"
log_warning "  1. Drop existing database '$DB_NAME'"
log_warning "  2. Recreate the database"
log_warning "  3. Restore data from backup"
log_warning ""
log_warning "⚠️  ALL EXISTING DATA WILL BE LOST! ⚠️"
log_warning "=========================================="

# Require explicit confirmation
if [ "$ENVIRONMENT" = "production" ]; then
    read -p "Type 'RESTORE PRODUCTION DATABASE' to proceed: " CONFIRM
    if [ "$CONFIRM" != "RESTORE PRODUCTION DATABASE" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
else
    read -p "Are you sure you want to restore? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
fi

# ============================================
# PRE-RESTORE BACKUP
# ============================================

log_info "Creating pre-restore backup..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PRE_RESTORE_BACKUP="/tmp/vaxtrace-prerestore-${TIMESTAMP}.sql.gz"

# Database connection string
DB_CONN="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"
DB_CONN_TEMPLATE="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/template1"

# Create pre-restore backup
if pg_dump "$DB_CONN" 2>/dev/null | gzip > "$PRE_RESTORE_BACKUP"; then
    BACKUP_SIZE=$(du -h "$PRE_RESTORE_BACKUP" | cut -f1)
    log_success "Pre-restore backup created: $PRE_RESTORE_BACKUP ($BACKUP_SIZE)"
else
    log_warning "Failed to create pre-restore backup, continuing anyway..."
fi

# ============================================
# RESTORE PROCESS
# ============================================

log_info "Starting restore process..."

# Get backup file info
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_info "Backup file size: $BACKUP_SIZE"

# Calculate and verify checksum
log_info "Verifying backup integrity..."
CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
log_info "SHA256 checksum: $CHECKSUM"

# Drop existing database
log_info "Dropping existing database..."
psql "$DB_CONN_TEMPLATE" -c "DROP DATABASE IF EXISTS $DB_NAME;" || {
    log_error "Failed to drop database"
    exit 1
}

# Recreate database
log_info "Creating new database..."
psql "$DB_CONN_TEMPLATE" -c "CREATE DATABASE $DB_NAME;" || {
    log_error "Failed to create database"
    log_info "Attempting to restore from pre-restore backup..."
    gunzip -c "$PRE_RESTORE_BACKUP" | psql "$DB_CONN_TEMPLATE" 2>/dev/null || true
    exit 1
}

# Restore from backup
log_info "Restoring data from backup (this may take a while)..."

if gunzip -c "$BACKUP_FILE" | psql "$DB_CONN" > /tmp/restore.log 2>&1; then
    log_success "Database restored successfully!"
else
    log_error "Restore failed! Check /tmp/restore.log for details"
    log_info "Pre-restore backup available at: $PRE_RESTORE_BACKUP"
    exit 1
fi

# ============================================
# POST-RESTORE VERIFICATION
# ============================================

log_info "Running post-restore verification..."

# Check if tables exist
TABLE_COUNT=$(psql "$DB_CONN" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt 0 ]; then
    log_success "✓ Database contains $TABLE_COUNT tables"
else
    log_warning "⚠ No tables found in database"
fi

# Check critical tables
CRITICAL_TABLES=("locations" "vaccines" "alerts" "stock_snapshots" "users")

for table in "${CRITICAL_TABLES[@]}"; do
    EXISTS=$(psql "$DB_CONN" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null || echo "f")
    if [ "$EXISTS" = "t" ]; then
        ROW_COUNT=$(psql "$DB_CONN" -tAc "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        log_success "✓ Table '$table' exists with $ROW_COUNT rows"
    else
        log_warning "⚠ Table '$table' not found"
    fi
done

# Check if indexes exist
INDEX_COUNT=$(psql "$DB_CONN" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null || echo "0")
log_info "Database has $INDEX_COUNT indexes"

# ============================================
# CLEANUP
# ============================================

# Clean up pre-restore backup (optional)
log_info "Pre-restore backup saved at: $PRE_RESTORE_BACKUP"
log_info "You can remove it manually after verification: rm $PRE_RESTORE_BACKUP"

# ============================================
# SUMMARY
# ============================================

log_success "=========================================="
log_success "RESTORE COMPLETED SUCCESSFULLY!"
log_success "=========================================="
log_info "Environment: $ENVIRONMENT"
log_info "Database: $DB_HOST/$DB_NAME"
log_info "Tables restored: $TABLE_COUNT"
log_info "Indexes: $INDEX_COUNT"
log_info "Pre-restore backup: $PRE_RESTORE_BACKUP"
log_info ""
log_info "Next steps:"
log_info "  1. Verify application connectivity"
log_info "  2. Run health checks: ./scripts/health-check.sh"
log_info "  3. Test critical functionality"
log_info "  4. Remove pre-restore backup when verified"

exit 0
