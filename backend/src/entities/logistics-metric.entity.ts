/**
 * VaxTrace Nigeria - Logistics Metric Entity
 * 
 * Performance metrics for supply chain analytics
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

@Entity('logistics_metrics')
@Index('idx_metrics_facility', ['facilityId'])
@Index('idx_metrics_lga', ['lgaId'])
@Index('idx_metrics_state', ['stateId'])
@Index('idx_metrics_period', ['metricPeriodStart', 'metricPeriodEnd'])
@Index('unique_metric_period', ['facilityId', 'vaccineId', 'metricPeriodStart', 'metricPeriodEnd'], { unique: true })
export class LogisticsMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  facilityId: string;

  @ManyToOne(() => Location, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Location;

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

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  leadTimeDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  wastageRatePct: number;

  @Column({ type: 'int', nullable: true })
  stockoutDurationDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  orderFillRatePct: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  onTimeDeliveryPct: number;

  @Column({ type: 'date' })
  metricPeriodStart: Date;

  @Column({ type: 'date' })
  metricPeriodEnd: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
