/**
 * VaxTrace Nigeria - HTTP Logging Interceptor
 *
 * Interceptor for logging HTTP requests and responses
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WinstonLogger } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly winstonLogger: WinstonLogger;

  constructor() {
    this.winstonLogger = new WinstonLogger();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = request.headers['x-request-id'] as string || this.generateRequestId();
    const userId = (request as any).user?.id;

    // Attach request ID to request for use in controllers
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Log HTTP request with Winston
          this.winstonLogger.logHttpRequest(
            method,
            url,
            statusCode,
            responseTime,
            {
              requestId,
              userId,
              ip,
              userAgent,
            }
          );

          // Also log with NestJS logger for compatibility
          this.logger.log(
            `${method} ${url} ${statusCode} - ${responseTime}ms`,
            requestId
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log error with Winston
          this.winstonLogger.error(
            `${method} ${url} - ${error.message}`,
            error.stack,
            LoggingInterceptor.name,
            {
              requestId,
              userId,
              ip,
              userAgent,
              statusCode,
              responseTime,
            }
          );

          // Also log with NestJS logger for compatibility
          this.logger.error(
            `${method} ${url} - ${error.message}`,
            error.stack,
            LoggingInterceptor.name
          );
        },
      })
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Extend Express Request type to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
