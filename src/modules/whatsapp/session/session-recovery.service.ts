import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppSession } from '../../../database/entities/whatsapp-session.entity';
import { SessionLifecycleService } from './session-lifecycle.service';
import { SessionStatus } from '../../../common/enums';
import { ConfigService } from '@nestjs/config';
import { sleep } from '../../../common/utils/retry.util';

@Injectable()
export class SessionRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SessionRecoveryService.name);

  constructor(
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    private readonly sessionLifecycle: SessionLifecycleService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const sessions = await this.sessionRepo.find({
      where: { status: SessionStatus.CONNECTED },
    });

    if (sessions.length === 0) {
      this.logger.log('No sessions to recover.');
      return;
    }

    this.logger.log(`Recovering ${sessions.length} WhatsApp session(s)...`);
    const delayMs = this.config.get('whatsapp.sessionRecoveryDelayMs', 2000);

    for (const session of sessions) {
      try {
        await this.sessionLifecycle.connect(session.tenantId);
        this.logger.log(`Recovered session for tenant ${session.tenantId}`);
        await sleep(delayMs);
      } catch (error: any) {
        this.logger.error(
          `Failed to recover session for tenant ${session.tenantId}: ${error.message}`,
        );
        await this.sessionRepo.update(session.id, {
          status: SessionStatus.DISCONNECTED,
        });
      }
    }

    this.logger.log('Session recovery complete.');
  }
}
