/**
 * VaxTrace Nigeria - User Entity
 * 
 * User accounts with role-based access control
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

export enum UserRole {
  NPHCDA_DIRECTOR = 'nphcda_director',
  STATE_COLD_CHAIN_OFFICER = 'state_cold_chain_officer',
  LGA_LOGISTICS_OFFICER = 'lga_logistics_officer',
  FACILITY_IN_CHARGE = 'facility_in_charge',
  SYSTEM_ADMIN = 'system_admin',
}

@Entity('users')
@Index('idx_users_email', ['email'])
@Index('idx_users_auth_provider', ['authProvider', 'authProviderId'])
@Index('idx_users_location', ['assignedLocationId'])
@Index('idx_users_role', ['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ type: 'bytea', nullable: true })
  fullNameEncrypted: Buffer;

  @Column({ type: 'bytea', nullable: true })
  nationalIdEncrypted: Buffer;

  @Column({ type: 'varchar', length: 50, default: 'auth0' })
  authProvider: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  authProviderId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    name: 'role'
  })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  assignedLocationId: string;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_location_id' })
  assignedLocation?: Location;

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
