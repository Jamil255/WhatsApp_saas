import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('visitors')
@Index(['visitorKey'], { unique: true })
@Index(['lastSeenAt'])
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'visitor_key', type: 'varchar', length: 80 })
  visitorKey: string;

  @Column({ name: 'session_id', type: 'varchar', length: 80, nullable: true })
  sessionId: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ name: 'landing_path', type: 'varchar', length: 500 })
  landingPath: string;

  @Column({ name: 'last_visited_path', type: 'varchar', length: 500 })
  lastVisitedPath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string | null;

  @Column({ name: 'utm_source', type: 'varchar', length: 120, nullable: true })
  utmSource: string | null;

  @Column({ name: 'utm_medium', type: 'varchar', length: 120, nullable: true })
  utmMedium: string | null;

  @Column({ name: 'utm_campaign', type: 'varchar', length: 160, nullable: true })
  utmCampaign: string | null;

  @Column({ name: 'page_views', type: 'int', default: 1 })
  pageViews: number;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
