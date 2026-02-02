#!/bin/bash
# VaxTrace Nigeria - Database Migration Script
# Runs database migrations for the specified environment
# Usage: ./scripts/migrate.sh <environment>

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

log_info "Starting database migrations for $ENVIRONMENT environment..."
log_info "Database: $DB_HOST/$DB_NAME"

# Database connection string
DB_CONN="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"

# Function to run migration file
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")
    
    log_info "Running migration: $migration_name"
    
    # Check if migration was already run
    local checksum=$(sha256sum "$migration_file" | awk '{print $1}')
    local already_run=$(psql "$DB_CONN" -tAc "SELECT 1 FROM schema_migrations WHERE name = '$migration_name' AND checksum = '$checksum'" 2>/dev/null || echo "0")
    
    if [ "$already_run" = "1" ]; then
        log_warning "  Migration already run, skipping"
        return 0
    fi
    
    # Run the migration
    if psql "$DB_CONN" -f "$migration_file" > /dev/null 2>&1; then
        log_success "  ✓ Migration completed"
        
        # Record migration
        psql "$DB_CONN" -c "INSERT INTO schema_migrations (name, checksum, applied_at) VALUES ('$migration_name', '$checksum', NOW()) ON CONFLICT (name) DO UPDATE SET checksum = '$checksum', applied_at = NOW();" 2>/dev/null || true
        
        return 0
    else
        log_error "  ✗ Migration failed"
        return 1
    fi
}

# Ensure schema_migrations table exists
log_info "Ensuring schema_migrations table exists..."
psql "$DB_CONN" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
" 2>/dev/null || log_warning "Could not create schema_migrations table"

# Get migration files
MIGRATIONS_DIR="./backend/database/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Run migrations in order
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" | sort)

if [ -z "$MIGRATION_FILES" ]; then
    log_warning "No migration files found"
    exit 0
fi

log_info "Found $(echo "$MIGRATION_FILES" | wc -l) migration file(s)"

FAILED=0
for migration in $MIGRATION_FILES; do
    if ! run_migration "$migration"; then
        FAILED=1
        break
    fi
done

# Summary
log_info "=========================================="
if [ $FAILED -eq 0 ]; then
    log_success "All migrations completed successfully!"
    
    # Show current migration version
    log_info "Current migrations:"
    psql "$DB_CONN" -c "SELECT name, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;" 2>/dev/null || log_warning "Could not retrieve migration history"
    
    exit 0
else
    log_error "Migration failed!"
    log_info "Please check the error above and fix the migration file"
    exit 1
fi
