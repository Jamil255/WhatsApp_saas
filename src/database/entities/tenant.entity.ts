import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { TenantStatus, TenantPlan } from '../../common/enums';
import { User } from './user.entity';
import { ApiCredential } from './api-credential.entity';
import { WhatsAppSession } from './whatsapp-session.entity';
import { Message } from './message.entity';
import { Template } from './template.entity';
import { Webhook } from './webhook.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_name', length: 255 })
  companyName: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  @Column({ type: 'enum', enum: TenantPlan, default: TenantPlan.STARTER })
  plan: TenantPlan;

  @Column({ name: 'rate_limit_per_minute', type: 'int', default: 60 })
  rateLimitPerMinute: number;

  @Column({ name: 'daily_message_limit', type: 'int', default: 1000 })
  dailyMessageLimit: number;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => User, (user: User) => user.tenant)
  users: User[];

  @OneToOne(() => ApiCredential, (cred: ApiCredential) => cred.tenant)
  apiCredential: ApiCredential;

  @OneToOne(() => WhatsAppSession, (session: WhatsAppSession) => session.tenant)
  whatsappSession: WhatsAppSession;

  @OneToMany(() => Message, (msg: Message) => msg.tenant)
  messages: Message[];

  @OneToMany(() => Template, (tpl: Template) => tpl.tenant)
  templates: Template[];

  @OneToOne(() => Webhook, (wh: Webhook) => wh.tenant)
  webhook: Webhook;
}
