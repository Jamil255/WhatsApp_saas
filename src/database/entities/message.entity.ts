import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import {
  MessageStatus,
  MessageType,
  MessageDirection,
} from '../../common/enums';
import { Tenant } from './tenant.entity';
import { Template } from './template.entity';
import { MessageStatusLog } from './message-status-log.entity';

@Entity('messages')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'createdAt'])
@Index(['whatsappMessageId'])
@Index(['batchId'])
@Index(['tenantId', 'toNumber'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'to_number', length: 20 })
  toNumber: string;

  @Column({ name: 'from_number', type: 'varchar', length: 20, nullable: true })
  fromNumber: string | null;

  @Column({ name: 'message_type', type: 'enum', enum: MessageType })
  messageType: MessageType;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'media_metadata', type: 'jsonb', nullable: true })
  mediaMetadata: Record<string, any> | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ name: 'template_variables', type: 'jsonb', nullable: true })
  templateVariables: Record<string, string> | null;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.QUEUED })
  status: MessageStatus;

  @Column({
    type: 'enum',
    enum: MessageDirection,
    default: MessageDirection.OUTBOUND,
  })
  direction: MessageDirection;

  @Column({
    name: 'whatsapp_message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  whatsappMessageId: string | null;

  @Column({ name: 'batch_id', type: 'varchar', length: 64, nullable: true })
  batchId: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({
    name: 'error_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  errorReason: string | null;

  @Column({ name: 'queued_at', type: 'timestamptz', nullable: true })
  queuedAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Tenant, (tenant: Tenant) => tenant.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Template, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @OneToMany(() => MessageStatusLog, (log: MessageStatusLog) => log.message)
  statusLogs: MessageStatusLog[];
}
