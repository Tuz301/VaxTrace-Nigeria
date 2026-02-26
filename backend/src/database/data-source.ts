/**
 * VaxTrace Nigeria - TypeORM Data Source Configuration
 * 
 * This file is used by TypeORM CLI for migration management.
 * Run migrations with: npm run migration:run
 * Generate migrations with: npm run migration:generate
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  
  // Database connection settings
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'vaxtrace_admin',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'vaxtrace_nigeria',
  
  // SSL configuration (optional for development)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
  } : false,
  
  // Entity paths
  entities: [path.join(__dirname, '../entities', '**', '*.entity{.ts,.js}')],
  
  // Migration paths
  migrations: [path.join(__dirname, '../../database/migrations', '*{.ts,.js}')],
  
  // Synchronization (NEVER enable in production)
  synchronize: false,
  
  // Logging
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  
  // Connection pool configuration
  extra: {
    max: parseInt(process.env.DATABASE_POOL_MAX || '35', 10),
    min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

// Create and export the DataSource instance
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
