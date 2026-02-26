/**
 * VaxTrace Nigeria - Sync Log Entity
 * 
 * Track all synchronization events with OpenLMIS
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('sync_logs')
@Index('idx_sync_logs_type', ['syncType'])
@Index('idx_sync_logs_status', ['status'])
@Index('idx_sync_logs_started', ['startedAt'])
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  syncType: string;

  @Column({ type: 'varchar', length: 50, default: 'openlmis' })
  source: string;

  @Column({ type: 'int', default: 0 })
  entitiesSynced: number;

  @Column({ type: 'int', default: 0 })
  entitiesFailed: number;

  @Column({ type: 'int', default: 0 })
  entitiesUpdated: number;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
