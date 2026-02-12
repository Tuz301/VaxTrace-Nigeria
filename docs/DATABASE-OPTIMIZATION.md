# VaxTrace Nigeria - Database Optimization Guide

> **As data grows, a fast database can become a bottleneck if not configured correctly.**  
> This guide covers the four pillars of database optimization: Indexing, Connection Pooling, Backups, and Migrations.

---

## Table of Contents

1. [Indexing Strategy](#indexing-strategy)
2. [Connection Pooling](#connection-pooling)
3. [Backup & Recovery](#backup--recovery)
4. [Migration Management](#migration-management)
5. [Performance Monitoring](#performance-monitoring)
6. [Best Practices Checklist](#best-practices-checklist)

---

## Indexing Strategy

### Why Indexes Matter

Without indexes, the database must scan every single row (sequential scan) to find matching data. As tables grow, this becomes prohibitively slow.

**Example Impact:**
```
Table Size: 1,000,000 rows
Query: SELECT * FROM stock_snapshots WHERE facility_id = '123' AND stock_status = 'stockout';

Without Index: ~100-500ms (full table scan)
With Index: ~1-5ms (index lookup)
```

### Index Types in VaxTrace

#### 1. **B-Tree Indexes** (Default)
- Best for: Equality and range queries
- Used on: Most columns with WHERE clauses
- Example: `facility_id`, `vaccine_id`, `created_at`

#### 2. **Partial Indexes** (Conditional)
- Best for: Frequently filtered subsets of data
- Smaller size = better cache efficiency
- Example: Active alerts only
```sql
CREATE INDEX idx_alerts_critical
ON alerts(facility_id, created_at DESC)
WHERE severity = 'critical' AND resolved_at IS NULL;
```

#### 3. **Composite Indexes** (Multi-column)
- Best for: Queries filtering on multiple columns
- Order matters: most selective column first
- Example: Facility + vaccine lookups
```sql
CREATE INDEX idx_stock_snapshots_facility_status_date
ON stock_snapshots(facility_id, stock_status, snapshot_date DESC);
```

#### 4. **Covering Indexes** (INCLUDE)
- Best for: Queries that can be satisfied entirely from the index
- Avoids table lookups (Index-Only Scans)
- Example: Dashboard queries
```sql
CREATE INDEX idx_stock_snapshots_facility_vaccine_covering
ON stock_snapshots(facility_id, vaccine_id)
INCLUDE (quantity_on_hand, months_of_stock, stock_status, snapshot_date);
```

#### 5. **BRIN Indexes** (Block Range)
- Best for: Time-series/append-only data
- Very small size (100x smaller than B-tree)
- Example: Audit logs, telemetry
```sql
CREATE INDEX idx_audit_logs_brin_timestamp
ON audit_logs USING BRIN(created_at);
```

### Index Maintenance

#### Monitor Index Usage
```sql
-- Find unused indexes (candidates for removal)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid::regclass) DESC;
```

#### Rebuild Fragmented Indexes
```sql
-- Rebuild a specific index
REINDEX INDEX CONCURRENTLY idx_stock_snapshots_facility_status_date;

-- Rebuild all indexes on a table
REINDEX TABLE CONCURRENTLY stock_snapshots;
```

#### Update Statistics
```sql
-- Update table statistics for better query planning
ANALYZE stock_snapshots;

-- Update statistics with higher sample rate
ANALYZE stock_snapshots WITH (statistics_target = 1000);
```

### Index Design Guidelines

| Query Pattern | Recommended Index |
|--------------|-------------------|
| `WHERE facility_id = ?` | B-tree on `facility_id` |
| `WHERE facility_id = ? AND status = 'active'` | Partial index on `facility_id` WHERE `status = 'active'` |
| `WHERE facility_id = ? AND vaccine_id = ?` | Composite index on `(facility_id, vaccine_id)` |
| `WHERE created_at > NOW() - INTERVAL '7 days'` | BRIN index on `created_at` |
| `SELECT facility_id, status FROM ...` | Covering index `INCLUDE (status)` |

---

## Connection Pooling

### Why Connection Pooling Matters

Creating a new database connection is expensive:
- **Network round-trip** to establish connection
- **Authentication** handshake
- **Memory allocation** for connection context

Without pooling, each request creates a new connection → resource exhaustion.

### VaxTrace Connection Pool Configuration

Located in [`backend/src/config/database.config.ts`](../backend/src/config/database.config.ts):

```typescript
const connectionPoolConfigs = {
  development: {
    max: 10,  // Max connections
    min: 2,   // Min idle connections
  },
  production: {
    max: 50,  // Higher pool for production
    min: 5,   // Keep some connections ready
  },
  test: {
    max: 5,
    min: 1,
  },
};
```

### Pool Sizing Formula

```
connections = ((core_count * 2) + effective_spindle_count)

Example:
- 4 CPU cores
- 1 disk (spindle)
- connections = (4 * 2) + 1 = 9

For VaxTrace (production):
- 8 CPU cores
- SSD storage (no spindle limit)
- connections = (8 * 2) = 16 per application instance
- With 3 instances: 16 * 3 = 48 max connections
```

### Monitoring Connection Pool Health

```sql
-- Check active connections
SELECT 
    count(*) as total_connections,
    count(*) FILTER BY state = 'active' as active_connections,
    count(*) FILTER BY state = 'idle' as idle_connections
FROM pg_stat_activity 
WHERE datname = current_database();

-- Find long-running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start as duration,
    query,
    state
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### Connection Pool Best Practices

1. **Set appropriate pool sizes** based on CPU cores
2. **Monitor idle connections** - too many wastes memory
3. **Use connection timeouts** to prevent hanging
4. **Configure retry logic** for failed connections
5. **Test under load** to find optimal pool size

---

## Backup & Recovery

### Why Backup Testing Matters

> **"A backup is useless if you haven't verified that you can actually use it to recover data."**

Common backup failures:
- Corrupted backup files
- Incomplete backups
- Missing dependencies
- Wrong backup format

### VaxTrace Backup Strategy

#### Automated Backups

Located in [`scripts/backup-db.sh`](../scripts/backup-db.sh):

```bash
# Daily automated backup at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh production
```

**Features:**
- Compressed SQL dumps (`.sql.gz`)
- SHA256 checksums for integrity
- S3 upload support (optional)
- Configurable retention period

#### Manual Backup

```bash
# Create a manual backup
./scripts/backup-db.sh production

# Output: vaxtrace-production-20240101-120000.sql.gz
```

### Restore Testing

#### Automated Restore Testing

Located in [`scripts/restore-db.sh`](../scripts/restore-db.sh):

```bash
# Test restore in staging environment
./scripts/restore-db.sh staging /backups/vaxtrace-production-20240101-120000.sql.gz
```

**Restore Process:**
1. Creates pre-restore backup (safety net)
2. Drops and recreates database
3. Restores data from backup
4. Verifies critical tables exist
5. Reports row counts for validation

#### Restore Verification Checklist

- [ ] Database restored successfully
- [ ] All tables present
- [ ] Row counts match expected values
- [ ] Indexes are present
- [ ] Application can connect
- [ ] Critical queries work

### Backup Best Practices

| Practice | Implementation |
|----------|----------------|
| **Automated** | Cron job for daily backups |
| **Compressed** | Gzip compression (saves ~80% space) |
| **Off-site** | S3 or remote storage |
| **Tested** | Monthly restore drills |
| **Retained** | Keep 30-90 days of backups |
| **Checksums** | SHA256 verification |

---

## Migration Management

### Why Migration Tracking Matters

- **Version Control**: Track which migrations have been applied
- **Rollback Safety**: Ability to undo changes
- **Team Coordination**: Prevent conflicting changes
- **Audit Trail**: Know when changes were made

### VaxTrace Migration System

#### Migration Tracking Table

```sql
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Running Migrations

Located in [`scripts/migrate.sh`](../scripts/migrate.sh):

```bash
# Run pending migrations
./scripts/migrate.sh production

# Output:
# [INFO] Running migration: 001_initial_schema.sql
# [SUCCESS] ✓ Migration completed
# [INFO] Running migration: 002_performance_indexes.sql
# [SUCCESS] ✓ Migration completed
```

#### Rollback Capability

Each migration has a corresponding `.down.sql` file:

```
001_initial_schema.sql         → 001_initial_schema.down.sql
002_performance_indexes.sql    → 002_performance_indexes.down.sql
003_advanced_indexes.sql       → 003_advanced_indexes.down.sql
```

**To rollback:**
```bash
# Rollback to previous migration
psql -f backend/database/migrations/003_advanced_indexes.down.sql

# Remove from tracking
DELETE FROM schema_migrations WHERE name = '003_advanced_indexes.sql';
```

### Migration Best Practices

| Practice | Description |
|----------|-------------|
| **Incremental** | One change per migration |
| **Reversible** | Always write down migrations |
| **Tested** | Run in staging first |
| **Backed Up** | Backup before production |
| **Documented** | Comment complex changes |
| **Idempotent** | Can run multiple times safely |

### Migration Rollback Safety

```bash
# Safe rollback procedure
1. Create pre-rollback backup
2. Verify backup integrity
3. Run down migration
4. Verify application works
5. Keep backup for 7 days
```

---

## Performance Monitoring

### Key Metrics to Monitor

#### 1. Query Performance

```sql
-- Find slow queries (requires pg_stat_statements)
SELECT 
    calls,
    total_time,
    mean_time,
    max_time,
    query
FROM pg_stat_statements 
WHERE calls > 100 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### 2. Table Sizes

```sql
-- Find largest tables
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

#### 3. Index Usage

```sql
-- Find unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan < 10
    AND indexname NOT LIKE '%_pkey'
ORDER BY idx_scan ASC;
```

#### 4. Connection Pool Stats

```sql
-- Monitor connection pool health
SELECT 
    count(*) as total_connections,
    count(*) FILTER BY state = 'active' as active_connections,
    count(*) FILTER BY state = 'idle' as idle_connections,
    count(*) FILTER BY state = 'idle in transaction' as idle_in_transaction
FROM pg_stat_activity 
WHERE datname = current_database();
```

### Performance Tuning Checklist

- [ ] **Indexes**: All WHERE/JOIN columns indexed
- [ ] **Statistics**: Updated with ANALYZE
- [ ] **Configuration**: `work_mem`, `shared_buffers` tuned
- [ ] **Queries**: No full table scans on large tables
- [ ] **Connections**: Pool sized appropriately
- [ ] **Monitoring**: pg_stat_statements enabled

---

## Best Practices Checklist

### Indexing ✅

- [ ] Columns in WHERE clauses are indexed
- [ ] Columns in JOIN conditions are indexed
- [ ] Frequently filtered columns use partial indexes
- [ ] Dashboard queries use covering indexes
- [ ] Time-series data uses BRIN indexes
- [ ] Index usage is monitored monthly
- [ ] Unused indexes are removed

### Connection Pooling ✅

- [ ] Pool size is based on CPU cores
- [ ] Min connections are configured
- [ ] Connection timeout is set
- [ ] Idle timeout is configured
- [ ] Pool health is monitored
- [ ] Retry logic is implemented
- [ ] Load testing has been performed

### Backups ✅

- [ ] Automated daily backups are configured
- [ ] Backups are compressed
- [ ] Backups are stored off-site
- [ ] SHA256 checksums are verified
- [ ] **Restore process is tested monthly**
- [ ] Retention policy is defined (30-90 days)
- [ ] Pre-restore backups are created

### Migrations ✅

- [ ] All migrations are tracked in `schema_migrations`
- [ ] Each migration has a `.down.sql` file
- [ ] Migrations are run in staging first
- [ ] Backup is created before production migration
- [ ] Rollback procedure is documented
- [ ] Migration files are in version control
- [ ] Complex migrations are commented

---

## Quick Reference Commands

### Backup & Restore
```bash
# Create backup
./scripts/backup-db.sh production

# Restore from backup
./scripts/restore-db.sh staging /backups/backup-file.sql.gz
```

### Migrations
```bash
# Run pending migrations
./scripts/migrate.sh production

# Rollback specific migration
psql -f backend/database/migrations/003_advanced_indexes.down.sql
```

### Performance Queries
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass)) 
FROM pg_tables ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Check index usage
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan ASC;
```

---

## Additional Resources

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Connection Pooling in Node.js](https://node-postgres.com/apis/pool)
- [Database Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Migration Management](https://www.postgresql.org/docs/current/ddl-schemas.html)

---

**Document Version:** 1.0.0  
**Last Updated:** 2024-01-01  
**Maintained By:** VaxTrace Development Team
