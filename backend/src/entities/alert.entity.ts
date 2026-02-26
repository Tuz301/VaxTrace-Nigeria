/**
 * VaxTrace Nigeria - Alert Entity
 * 
 * System-generated alerts for stockouts, expiry, temperature issues, etc.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Location } from './location.entity';
import { Vaccine } from './vaccine.entity';
import { User } from './user.entity';

export enum AlertType {
  STOCKOUT = 'stockout',
  NEAR_EXPIRY = 'near_expiry',
  TEMPERATURE_EXCURSION = 'temperature_excursion',
  VVM_STAGE_3 = 'vvm_stage_3',
  VVM_STAGE_4 = 'vvm_stage_4',
  POWER_OUTAGE = 'power_outage',
  DELIVERY_DELAY = 'delivery_delay',
  RECONCILIATION_MISMATCH = 'reconciliation_mismatch',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('alerts')
@Index('idx_alerts_facility', ['facilityId'])
@Index('idx_alerts_lga', ['lgaId'])
@Index('idx_alerts_state', ['stateId'])
@Index('idx_alerts_type', ['alertType'])
@Index('idx_alerts_severity', ['severity'])
@Index('idx_alerts_status', ['isAcknowledged', 'isResolved'])
@Index('idx_alerts_created', ['createdAt'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Location;

  @Column({ type: 'uuid', nullable: true })
  lgaId: string;

  @ManyToOne(() => Location, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lga_id' })
  lga?: Location;

  @Column({ type: 'uuid', nullable: true })
  stateId: string;

  @ManyToOne(() => Location, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'state_id' })
  state?: Location;

  @Column({ type: 'uuid', nullable: true })
  vaccineId: string;

  @ManyToOne(() => Vaccine, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine?: Vaccine;

  @Column({
    type: 'enum',
    enum: AlertType
  })
  alertType: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity
  })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isAcknowledged: boolean;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledgedByUser?: User;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedByUser?: User;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ type: 'boolean', default: false })
  notificationSent: boolean;

  @Column({ type: 'varchar', array: true, default: [] })
  notificationChannels: string[];

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
