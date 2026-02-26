/**
 * VaxTrace Nigeria - Vaccine Entity
 * 
 * Reference table for vaccine types
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('vaccines')
@Index('idx_vaccines_code', ['code'])
@Index('idx_vaccines_category', ['category'])
export class Vaccine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  doseVolumeMl: number;

  @Column({ type: 'int', nullable: true })
  dosesPerVial: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  minStorageTemp: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  maxStorageTemp: number;

  @Column({ type: 'int', nullable: true })
  shelfLifeMonths: number;

  @Column({ type: 'boolean', default: true })
  requiresColdChain: boolean;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 3.0 })
  minMonthsOfStock: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 6.0 })
  maxMonthsOfStock: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  openlmisProductId: string;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
