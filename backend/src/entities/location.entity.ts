/**
 * VaxTrace Nigeria - Location Entity
 * 
 * Represents hierarchical geographic structure: Zone > State > LGA > Facility
 * Uses PostGIS for geospatial queries and mapping
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
import { Exclude } from 'class-transformer';

export enum LocationType {
  ZONE = 'zone',
  STATE = 'state',
  LGA = 'lga',
  FACILITY = 'facility',
}

@Entity('locations')
@Index('idx_locations_type', ['type'])
@Index('idx_locations_parent', ['parentId'])
@Index('idx_locations_openlmis', ['openlmisId'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: LocationType,
    name: 'type'
  })
  type: LocationType;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Location;

  @Column({ type: 'geometry', nullable: true, spatialFeatureType: 'Point', srid: 4326 })
  geometry: object;

  @Column({ type: 'jsonb', default: {} })
  properties: Record<string, any>;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  openlmisId: string;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
