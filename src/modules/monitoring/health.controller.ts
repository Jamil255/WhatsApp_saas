import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { SessionManagerService } from '../whatsapp/session/session-manager.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    private readonly sessionManager: SessionManagerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Check platform health — database connectivity and active session count.',
  })
  @ApiResponse({ status: 200, description: 'System health status' })
  async check() {
    let dbHealthy = false;
    try {
      await this.sessionRepo.query('SELECT 1');
      dbHealthy = true;
    } catch {}

    return {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        activeSessions: this.sessionManager.getActiveCount(),
      },
    };
  }
}
