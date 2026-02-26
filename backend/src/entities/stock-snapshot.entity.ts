/**
 * VaxTrace Nigeria - Stock Snapshot Entity
 * 
 * Current stock levels at facilities (real-time view)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Location } from './location.entity';
import { Vaccine } from './vaccine.entity';

export enum StockStatus {
  OPTIMAL = 'optimal',
  UNDERSTOCKED = 'understocked',
  STOCKOUT = 'stockout',
  OVERSTOCKED = 'overstocked',
}

@Entity('stock_snapshots')
@Index('idx_stock_facility', ['facilityId'])
@Index('idx_stock_vaccine', ['vaccineId'])
@Index('idx_stock_status', ['stockStatus'])
@Index('idx_stock_expiry', ['expiryDate'])
@Index('idx_stock_vvm', ['vvmStage'])
@Index('idx_stock_date', ['snapshotDate'])
@Index('unique_daily_snapshot', ['facilityId', 'vaccineId', 'lotNumber', 'snapshotDate'], { unique: true })
export class StockSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Location;

  @Column({ type: 'uuid' })
  vaccineId: string;

  @ManyToOne(() => Vaccine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine;

  @Column({ type: 'int', default: 0 })
  quantityOnHand: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lotNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'int', nullable: true })
  vvmStage: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  monthsOfStock: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  averageMonthlyConsumption: number;

  @Column({
    type: 'enum',
    enum: StockStatus,
    nullable: true
  })
  stockStatus: StockStatus;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  currentTemp: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastTempReadingAt: Date;

  @Column({ type: 'int', default: 0 })
  tempExcursionCount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  snapshotDate: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  snapshotTime: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  syncedFromOpenlmisAt: Date;
}
