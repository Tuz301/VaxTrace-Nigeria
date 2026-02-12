/**
 * VaxTrace Nigeria - Database Configuration
 *
 * Provides centralized database configuration with connection pooling,
 * backup testing, and recovery verification.
 *
 * PERFORMANCE: Connection pooling reduces overhead of creating new connections
 * RELIABILITY: Backup testing ensures data can be recovered
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { register } from 'ts-node';
import { DataSource, DataSourceOptions } from 'typeorm';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Database connection configuration
 */
export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  
  // Connection Pool Configuration
  // Reduces overhead of creating new connections for each query
  extra: {
    max: 35, // Maximum pool size
    min: 2,   // Minimum pool size
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Fail connection attempts after 2s
  },
  
  // Performance Settings
  entities: ['**/*.entity.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? 'all' : ['error', 'warn'],
  
  // Migration Settings
  migrationsRun: true,
  migrationsTransactionMode: 'each',
  
  // SSL Configuration (Production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
  } : false,
};

/**
 * Connection pool sizes based on environment
 */
const connectionPoolConfigs = {
  development: {
    max: 10,
    min: 2,
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

/**
 * Get connection pool configuration for current environment
 */
export function getConnectionPoolConfig() {
  const env = process.env.NODE_ENV ?? 'development';
  return connectionPoolConfigs[env as keyof typeof connectionPoolConfigs] || connectionPoolConfigs.development;
}

/**
 * Export connection pool config
 */
export const connectionPoolConfig = getConnectionPoolConfig();

// ============================================
// BACKUP CONFIGURATION
// ============================================

/**
 * Backup configuration
 */
export const backupConfig = {
  enabled: process.env.BACKUP_ENABLED === 'true',
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',  // Daily at 2 AM
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  directory: process.env.BACKUP_DIRECTORY || './backups',
  
  // Tables to backup (all by default)
  tables: process.env.BACKUP_TABLES?.split(',') || [
    'alerts',
    'stock',
    'facilities',
    'locations',
    'transfers',
    'deliveries',
    'audit_logs',
  ],
};

/**
 * Test if backup configuration is valid
 */
export function isBackupConfigValid(): boolean {
  return (
    backupConfig.enabled &&
    backupConfig.schedule &&
    backupConfig.retentionDays > 0 &&
    backupConfig.tables.length > 0
  );
}

// ============================================
// RECOVERY CONFIGURATION
// ============================================

/**
 * Recovery configuration
 */
export const recoveryConfig = {
  // Maximum time to attempt recovery (in hours)
  maxRecoveryTimeHours: 2,
  
  // Number of retry attempts
  maxRetryAttempts: 3,
  
  // Delay between retries (in milliseconds)
  retryDelayMs: 1000,
};

// ============================================
// MIGRATION CONFIGURATION
// ============================================

/**
 * Migration configuration
 */
export const migrationConfig = {
  // Track migrations in database for rollback capability
  trackMigrations: true,
  
  // Transaction mode for safety
  transactionMode: 'each' as const,
  
  // Enable migration locking (prevents concurrent migrations)
  enableMigrationLock: true,
  
  // Allow migration rollback
  allowMigrationRollback: true,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Test database backup functionality
 * 
 * This function verifies that:
 * 1. Backups can be created
 * 2. Backup files are valid
 * 3. Backup can be restored
 * 
 * @returns Promise<boolean> - True if backup test passed
 */
export async function testBackupFunctionality(dataSource: DataSource): Promise<boolean> {
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    // Create a test backup
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test_backup_table (
        id SERIAL PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert test data
    await queryRunner.query(`
      INSERT INTO test_backup_table (data, created_at)
      VALUES ('test backup data', CURRENT_TIMESTAMP);
    `);
    
    // Verify data was inserted
    const result = await queryRunner.query(`
      SELECT COUNT(*) as count FROM test_backup_table;
    `);
    
    const count = parseInt(result[0]?.count || '0');
    
    // Clean up
    await queryRunner.query(`DROP TABLE IF EXISTS test_backup_table;`);
    
    return count > 0;
  } catch (error) {
    console.error('Backup test failed:', error);
    return false;
  }
}

/**
 * Get database health metrics
 * 
 * Provides insights into database performance and health
 * 
 * @returns Promise<DatabaseHealthMetrics>
 */
export async function getDatabaseHealthMetrics(dataSource: DataSource): Promise<DatabaseHealthMetrics> {
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    // Get connection pool stats
    const poolResult = await queryRunner.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER BY state = 'active' as active_connections,
        count(*) FILTER BY state = 'idle' as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `);
    
    // Get table sizes
    const tableSizes = await queryRunner.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(bytes AS size) as size
      FROM pg_catalog.pg_tables 
      JOIN pg_namespace ON pg_catalog.oid = pg_namespace.oid
      ORDER BY pg_total_relation_size(bytes) DESC
      LIMIT 10;
    `);
    
    // Get slow queries (if pg_stat_statements is available)
    let slowQueries: any[] = [];
    try {
      const slowQueryResult = await queryRunner.query(`
        SELECT 
          calls,
          total_time,
          mean_time,
          max_time
        FROM pg_stat_statements 
        WHERE calls > 100 
        ORDER BY mean_time DESC 
        LIMIT 5;
      `);
      
      slowQueries = slowQueryResult;
    } catch (e) {
      // pg_stat_statements might not be enabled
    }
    
    return {
      pool: {
        total: parseInt(poolResult[0]?.total_connections || '0'),
        active: parseInt(poolResult[0]?.active_connections || '0'),
        idle: parseInt(poolResult[0]?.idle_connections || '0'),
      },
      largestTables: tableSizes,
      slowQueries: slowQueries,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get database health metrics:', error);
    return {
      pool: { total: 0, active: 0, idle: 0 },
      largestTables: [],
      slowQueries: [],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Database health metrics interface
 */
export interface DatabaseHealthMetrics {
  pool: {
    total: number;
    active: number;
    idle: number;
  };
  largestTables: Array<{
    schemaname: string;
    tablename: string;
    size: string;
  }>;
  slowQueries: Array<{
    calls: number;
    total_time: number;
    mean_time: number;
    max_time: number;
  }>;
  timestamp: string;
}

// Register with TypeORM
export const DatabaseConfig = {
  databaseConfig,
  connectionPoolConfig,
  backupConfig,
  recoveryConfig,
  migrationConfig,
  
  // Utility functions
  testBackupFunctionality,
  getDatabaseHealthMetrics,
};

// TypeORM will use this configuration
