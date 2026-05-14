import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { WhatsAppSession } from './whatsapp-session.entity';

@Entity('whatsapp_session_keys')
@Unique(['sessionId', 'category', 'keyId'])
export class WhatsAppSessionKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ length: 50 })
  category: string;

  @Column({ name: 'key_id', length: 255 })
  keyId: string;

  @Column({ name: 'key_data', type: 'jsonb' })
  keyData: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(
    () => WhatsAppSession,
    (session: WhatsAppSession) => session.keys,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'session_id' })
  session: WhatsAppSession;
}
