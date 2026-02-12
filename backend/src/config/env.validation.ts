/**
 * VaxTrace Nigeria - Environment Variables Validation
 * 
 * FIX #14: Environment Variables Validation
 * Validates all required environment variables at startup
 * Fails fast if any required variables are missing or invalid
 */

import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail, IsUrl, IsEnum, validateSync } from 'class-validator';

/**
 * Environment enum
 */
export enum NodeEnv {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Environment variables validation schema
 */
export class EnvironmentVariables {
  // Application
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsNumber()
  @IsOptional()
  PORT: number = 8000;

  // Database (PostgreSQL)
  @IsString()
  @IsOptional()
  DATABASE_HOST: string;

  @IsNumber()
  @IsOptional()
  DATABASE_PORT: number;

  @IsString()
  @IsOptional()
  DATABASE_USERNAME: string;

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsOptional()
  DATABASE_NAME: string;

  @IsBoolean()
  @IsOptional()
  DATABASE_SYNCHRONIZE: boolean = false;

  @IsBoolean()
  @IsOptional()
  DATABASE_LOGGING: boolean = false;

  // Redis
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsNumber()
  @IsOptional()
  JWT_EXPIRATION: number = 3600; // 1 hour

  // OpenLMIS Integration
  @IsString()
  @IsOptional()
  OPENLMIS_BASE_URL: string;

  @IsString()
  @IsOptional()
  OPENLMIS_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  OPENLMIS_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  OPENLMIS_USERNAME: string;

  @IsString()
  @IsOptional()
  OPENLMIS_PASSWORD: string;

  // Webhook
  @IsString()
  @IsOptional()
  WEBHOOK_SECRET: string;

  // Frontend
  @IsString()
  @IsOptional()
  FRONTEND_URL: string;

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string;

  // Monitoring
  @IsBoolean()
  @IsOptional()
  ENABLE_METRICS: boolean = true;

  @IsBoolean()
  @IsOptional()
  ENABLE_HEALTH_CHECK: boolean = true;

  // Logging
  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';
}

/**
 * Validate environment variables
 * Throws an error if validation fails
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  // Transform and validate
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      return {
        property: error.property,
        constraints: error.constraints,
        value: error.value,
      };
    });

    throw new Error(
      `Environment variables validation failed:\n${JSON.stringify(errorMessages, null, 2)}`
    );
  }

  return validatedConfig;
}

/**
 * Validation configuration for NestJS ConfigModule
 */
export const validationSchema = {
  // Application
  NODE_ENV: {
    enum: ['development', 'production', 'test'],
    default: 'development',
  },
  PORT: {
    type: 'number',
    default: 8000,
  },

  // Database
  DATABASE_HOST: {
    type: 'string',
    default: 'localhost',
  },
  DATABASE_PORT: {
    type: 'number',
    default: 5432,
  },
  DATABASE_USERNAME: {
    type: 'string',
    default: 'postgres',
  },
  DATABASE_PASSWORD: {
    type: 'string',
    default: 'postgres',
  },
  DATABASE_NAME: {
    type: 'string',
    default: 'vaxtrace',
  },
  DATABASE_SYNCHRONIZE: {
    type: 'boolean',
    default: false,
  },
  DATABASE_LOGGING: {
    type: 'boolean',
    default: false,
  },

  // Redis
  REDIS_HOST: {
    type: 'string',
    default: 'localhost',
  },
  REDIS_PORT: {
    type: 'number',
    default: 6379,
  },
  REDIS_PASSWORD: {
    type: 'string',
    default: '',
  },

  // JWT
  JWT_SECRET: {
    type: 'string',
    default: 'vaxtrace-secret-key',
  },
  JWT_EXPIRATION: {
    type: 'number',
    default: 3600,
  },

  // OpenLMIS
  OPENLMIS_BASE_URL: {
    type: 'string',
    default: 'https://openlmis.org',
  },
  OPENLMIS_CLIENT_ID: {
    type: 'string',
    default: '',
  },
  OPENLMIS_CLIENT_SECRET: {
    type: 'string',
    default: '',
  },
  OPENLMIS_USERNAME: {
    type: 'string',
    default: '',
  },
  OPENLMIS_PASSWORD: {
    type: 'string',
    default: '',
  },

  // Webhook
  WEBHOOK_SECRET: {
    type: 'string',
    default: 'webhook-secret',
  },

  // Frontend
  FRONTEND_URL: {
    type: 'string',
    default: 'http://localhost:3000',
  },

  // CORS
  CORS_ORIGIN: {
    type: 'string',
    default: 'http://localhost:3000',
  },

  // Monitoring
  ENABLE_METRICS: {
    type: 'boolean',
    default: true,
  },
  ENABLE_HEALTH_CHECK: {
    type: 'boolean',
    default: true,
  },

  // Logging
  LOG_LEVEL: {
    type: 'string',
    default: 'info',
  },
};
