/**
 * VaxTrace Nigeria - Requisition Entity
 * 
 * Track orders from OpenLMIS (Initiated → Received)
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

export enum RequisitionStatus {
  INITIATED = 'initiated',
  SUBMITTED = 'submitted',
  AUTHORIZED = 'authorized',
  APPROVED = 'approved',
  RELEASED = 'released',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  REJECTED = 'rejected',
}

@Entity('requisitions')
@Index('idx_requisitions_openlmis', ['openlmisRequisitionId'])
@Index('idx_requisitions_facility', ['facilityId'])
@Index('idx_requisitions_status', ['status'])
@Index('idx_requisitions_dates', ['createdDate'])
export class Requisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  openlmisRequisitionId: string;

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

  @Column({
    type: 'enum',
    enum: RequisitionStatus
  })
  status: RequisitionStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  program: string;

  @Column({ type: 'boolean', default: false })
  emergency: boolean;

  @Column({ type: 'date', nullable: true })
  createdDate: Date;

  @Column({ type: 'date', nullable: true })
  submittedDate: Date;

  @Column({ type: 'date', nullable: true })
  approvedDate: Date;

  @Column({ type: 'date', nullable: true })
  shippedDate: Date;

  @Column({ type: 'date', nullable: true })
  receivedDate: Date;

  @Column({ type: 'int', nullable: true })
  leadTimeDays: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  syncedFromOpenlmisAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  lastSyncedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
