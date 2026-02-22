/**
 * VaxTrace Nigeria - Winston Logger Service
 *
 * Structured logging service with multiple transports and formats
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
  SILLY = 'silly',
}

/**
 * Log metadata interface
 */
export interface LogMetadata {
  context?: string;
  userId?: string;
  requestId?: string;
  module?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Ensure logs directory exists
 */
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format for structured logging
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...metadata }) => {
    let log = `${timestamp} [${level}]`;

    if (context) {
      log += ` [${context}]`;
    }

    log += ` ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      const metaStr = JSON.stringify(metadata, null, 2);
      log += `\n${metaStr}`;
    }

    return log;
  })
);

/**
 * Winston Logger Service
 */
@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

    this.logger = winston.createLogger({
      level: logLevel,
      format: customFormat,
      defaultMeta: {
        service: 'vaxtrace-backend',
        environment: process.env.NODE_ENV || 'development',
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat,
          silent: process.env.NODE_ENV === 'test',
        }),

        // Error log file
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),

        // Combined log file
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),

        // HTTP request log file
        new winston.transports.File({
          filename: path.join(logsDir, 'http.log'),
          level: 'http',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
      ],

      // Handle exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'exceptions.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
      ],

      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'rejections.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
      ],
    });
  }

  /**
   * Log a message
   */
  log(message: any, context?: string, metadata?: LogMetadata): void {
    this.logger.info(message, { context, ...metadata });
  }

  /**
   * Log an error message
   */
  error(message: any, trace?: string, context?: string, metadata?: LogMetadata): void {
    this.logger.error(message, { context, trace, ...metadata });
  }

  /**
   * Log a warning message
   */
  warn(message: any, context?: string, metadata?: LogMetadata): void {
    this.logger.warn(message, { context, ...metadata });
  }

  /**
   * Log a debug message
   */
  debug(message: any, context?: string, metadata?: LogMetadata): void {
    this.logger.debug(message, { context, ...metadata });
  }

  /**
   * Log a verbose message
   */
  verbose?(message: any, context?: string, metadata?: LogMetadata): void {
    this.logger.verbose(message, { context, ...metadata });
  }

  /**
   * Set the log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): string {
    return this.logger.level;
  }

  /**
   * Log with custom metadata
   */
  logWithMetadata(level: LogLevel, message: any, metadata: LogMetadata): void {
    this.logger.log(level, message, metadata);
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(method: string, url: string, statusCode: number, responseTime: number, metadata?: LogMetadata): void {
    this.logger.http(`${method} ${url}`, {
      http: {
        method,
        url,
        statusCode,
        responseTime,
      },
      ...metadata,
    });
  }

  /**
   * Create a child logger with additional default metadata
   */
  child(defaultMetadata: LogMetadata): winston.Logger {
    return this.logger.child(defaultMetadata);
  }

  /**
   * Flush all logs
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}
