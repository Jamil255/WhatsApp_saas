import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private boss: PgBoss | null = null;
  private readonly logger = new Logger(QueueService.name);
  private readonly connectionString: string;
  private readonly schema: string;

  constructor(private readonly config: ConfigService) {
    const dbHost = this.config.get('database.host');
    const dbPort = this.config.get('database.port');
    const dbUser = this.config.get('database.username');
    const dbPass = this.config.get('database.password');
    const dbName = this.config.get('database.database');
    this.schema = this.config.get('queue.schema', 'pgboss') ?? 'pgboss';
    this.connectionString = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
  }

  async onModuleInit(): Promise<void> {
    try {
      this.boss = new PgBoss({
        connectionString: this.connectionString,
        schema: this.schema,
      });

      await this.boss.start();
      this.logger.log('pg-boss queue started');
    } catch (error: any) {
      this.logger.error(`Failed to start pg-boss: ${error.message}`);
      this.logger.warn(
        'Message queue unavailable — messages will not be processed asynchronously.',
      );
    }
  }

  async ensureQueue(name: string): Promise<void> {
    if (!this.boss) return;
    try {
      await this.boss.createQueue(name);
    } catch (err: any) {
      // Queue already exists — safe to ignore
      if (!err.message?.includes('already exists')) {
        this.logger.warn(`Queue creation warning for ${name}: ${err.message}`);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.boss) {
      try {
        await this.boss.stop({ graceful: true, timeout: 30000 });
        this.logger.log('pg-boss queue stopped');
      } catch {}
    }
  }

  async enqueue(
    name: string,
    data: object,
    options?: Record<string, any>,
  ): Promise<string | null> {
    if (!this.boss) return null;
    await this.ensureQueue(name);
    return this.boss.send(name, data, options);
  }

  async work(
    name: string,
    options: Record<string, any>,
    handler: (job: any) => Promise<void>,
  ): Promise<string | null> {
    if (!this.boss) return null;
    await this.ensureQueue(name);
    // pg-boss v12 passes an array of jobs to handler — unwrap to single job
    const wrappedHandler: any = async (jobs: any) => {
      const jobArray = Array.isArray(jobs) ? jobs : [jobs];
      for (const job of jobArray) {
        await handler(job);
      }
    };
    return this.boss.work(name, options as any, wrappedHandler);
  }

  async schedule(
    name: string,
    cron: string,
    data?: object,
    options?: Record<string, any>,
  ): Promise<void> {
    if (!this.boss) return;
    await this.boss.schedule(name, cron, data || {}, options as any);
  }
}
