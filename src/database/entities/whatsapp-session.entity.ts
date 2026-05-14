import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { SessionStatus } from '../../common/enums';
import { Tenant } from './tenant.entity';
import { WhatsAppSessionKey } from './whatsapp-session-key.entity';

@Entity('whatsapp_sessions')
@Index(['status'])
export class WhatsAppSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', unique: true })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.CONNECTING,
  })
  status: SessionStatus;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'jsonb', nullable: true })
  creds: any;

  @Column({ name: 'account_info', type: 'jsonb', nullable: true })
  accountInfo: any;

  @Column({ name: 'reconnect_count', type: 'int', default: 0 })
  reconnectCount: number;

  @Column({ name: 'connected_at', type: 'timestamptz', nullable: true })
  connectedAt: Date | null;

  @Column({ name: 'disconnected_at', type: 'timestamptz', nullable: true })
  disconnectedAt: Date | null;

  @Column({ name: 'last_heartbeat_at', type: 'timestamptz', nullable: true })
  lastHeartbeatAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Tenant, (tenant: Tenant) => tenant.whatsappSession, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => WhatsAppSessionKey, (key: WhatsAppSessionKey) => key.session)
  keys: WhatsAppSessionKey[];
}
