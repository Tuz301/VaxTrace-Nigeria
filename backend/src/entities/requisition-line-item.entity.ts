/**
 * VaxTrace Nigeria - Requisition Line Item Entity
 * 
 * Individual vaccine items within a requisition
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
import { Requisition } from './requisition.entity';
import { Vaccine } from './vaccine.entity';

@Entity('requisition_line_items')
@Index('idx_line_items_requisition', ['requisitionId'])
@Index('idx_line_items_vaccine', ['vaccineId'])
export class RequisitionLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requisitionId: string;

  @ManyToOne(() => Requisition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_id' })
  requisition: Requisition;

  @Column({ type: 'uuid' })
  vaccineId: string;

  @ManyToOne(() => Vaccine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine;

  @Column({ type: 'int' })
  requestedQuantity: number;

  @Column({ type: 'int', nullable: true })
  approvedQuantity: number;

  @Column({ type: 'int', nullable: true })
  receivedQuantity: number;

  @Column({ type: 'int', nullable: true })
  beginningBalance: number;

  @Column({ type: 'int', nullable: true })
  totalReceivedQuantity: number;

  @Column({ type: 'int', nullable: true })
  totalConsumedQuantity: number;

  @Column({ type: 'int', nullable: true })
  lossesAdjustments: number;

  @Column({ type: 'int', nullable: true })
  stockOnHand: number;

  @Column({ type: 'int', nullable: true })
  quantityIssued: number;

  @Column({ type: 'int', nullable: true })
  averageMonthlyConsumption: number;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
