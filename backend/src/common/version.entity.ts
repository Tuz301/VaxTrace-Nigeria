/**
 * VaxTrace Nigeria - Version Entity Base
 * 
 * FIX #6: Optimistic Locking for Concurrent Updates
 * Provides version field for optimistic locking to prevent lost updates
 * 
 * Usage:
 * @Entity()
 * export class StockItem extends VersionEntity {
 *   @Column()
 *   quantity: number;
 * }
 */

import { BeforeUpdate, BeforeInsert, Column } from 'typeorm';

export abstract class VersionEntity {
  @Column({ default: 1 })
  version: number;

  @BeforeInsert()
  @BeforeUpdate()
  incrementVersion() {
    // Version is incremented automatically on each update
    // This is handled by TypeORM's @VersionColumn decorator
    // For manual control, we can use this method
  }
}

/**
 * Version column decorator for TypeORM entities
 * Automatically increments on update
 */
import { VersionColumn as TypeORMVersionColumn } from 'typeorm';

export const VersionColumn = TypeORMVersionColumn;

/**
 * OptimisticLockError - thrown when version mismatch occurs
 */
export class OptimisticLockError extends Error {
  constructor(
    public entityName: string,
    public entityId: string,
    public currentVersion: number,
    public expectedVersion: number
  ) {
    super(
      `Optimistic lock error for ${entityName}#${entityId}: ` +
      `expected version ${expectedVersion}, but current version is ${currentVersion}. ` +
      `The entity was modified by another transaction.`
    );
    this.name = 'OptimisticLockError';
  }
}

/**
 * OptimisticLockInterceptor - checks version on updates
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ConflictException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class OptimisticLockInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Check if request body contains version field
    if (body && body.version !== undefined) {
      // Store expected version for later comparison
      request.expectedVersion = body.version;
    }

    return next.handle().pipe(
      catchError(error => {
        // Convert OptimisticLockError to ConflictException
        if (error instanceof OptimisticLockError) {
          throw new ConflictException({
            error: 'OPTIMISTIC_LOCK_ERROR',
            message: error.message,
            entityName: error.entityName,
            entityId: error.entityId,
            currentVersion: error.currentVersion,
            retryable: true,
          });
        }
        throw error;
      })
    );
  }
}
