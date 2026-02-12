/**
 * VaxTrace Nigeria - Request ID Middleware
 * 
 * FIX #11: Request ID for Distributed Tracing
 * Generates unique request IDs and adds them to all requests for tracing
 * 
 * Features:
 * - Generates unique request IDs
 * - Adds request ID to all logs
 * - Passes request ID to downstream services
 * - Supports X-Request-ID header for distributed tracing
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extended Request interface with request ID
 */
export interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    // Check if request ID already exists (from upstream)
    const existingRequestId = req.headers['x-request-id'] as string;
    
    if (existingRequestId) {
      // Use existing request ID from upstream
      req.id = existingRequestId;
    } else {
      // Generate new request ID
      req.id = uuidv4();
    }

    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.id);

    // Add request ID to request for logging
    req['requestId'] = req.id;
    req['requestStartTime'] = Date.now();

    next();
  }
}
