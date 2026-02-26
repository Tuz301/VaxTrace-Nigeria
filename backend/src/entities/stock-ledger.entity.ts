/**
 * VaxTrace Nigeria - Stock Ledger Entity
 * 
 * Historical stock tracking for trend analytics and ML predictions
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

@Entity('stock_ledger')
@Index('idx_ledger_facility', ['facilityId'])
@Index('idx_ledger_lga', ['lgaId'])
@Index('idx_ledger_state', ['stateId'])
@Index('idx_ledger_vaccine', ['vaccineId'])
@Index('idx_ledger_date', ['snapshotDate'])
@Index('idx_ledger_transaction', ['transactionType'])
@Index('unique_ledger_entry', ['facilityId', 'vaccineId', 'snapshotDate', 'transactionReference'], { unique: true })
export class StockLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Location;

  @Column({ type: 'uuid', nullable: true })
  lgaId: string;

  @ManyToOne(() => Location, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lga_id' })
  lga?: Location;

  @Column({ type: 'uuid', nullable: true })
  stateId: string;

  @ManyToOne(() => Location, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'state_id' })
  state?: Location;

  @Column({ type: 'uuid' })
  vaccineId: string;

  @ManyToOne(() => Vaccine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine;

  @Column({ type: 'int' })
  quantityOnHand: number;

  @Column({ type: 'int', nullable: true })
  vvmStage: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  transactionType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionReference: string;

  @Column({ type: 'date' })
  snapshotDate: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  snapshotTime: Date;
}
