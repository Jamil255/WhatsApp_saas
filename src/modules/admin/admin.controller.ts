import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { Message } from '../../database/entities/message.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { SessionManagerService } from '../whatsapp/session/session-manager.service';
import { SessionLifecycleService } from '../whatsapp/session/session-lifecycle.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    private readonly sessionManager: SessionManagerService,
    private readonly sessionLifecycle: SessionLifecycleService,
  ) {}

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Platform overview',
    description:
      'Get platform-wide statistics — total tenants, messages, active sessions.',
  })
  @ApiResponse({ status: 200, description: 'Platform statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — super admin only' })
  async getOverview() {
    const [totalTenants, totalMessages, activeSessions] = await Promise.all([
      this.tenantRepo.count(),
      this.messageRepo.count(),
      this.sessionRepo.count({ where: { status: 'connected' as any } }),
    ]);

    return {
      totalTenants,
      totalMessages,
      activeSessions,
      inMemorySockets: this.sessionManager.getActiveCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('tenants')
  @ApiOperation({
    summary: 'List all tenants (admin)',
    description: 'Retrieve all tenants with their WhatsApp session status.',
  })
  @ApiResponse({ status: 200, description: 'Tenants with session info' })
  async listTenants() {
    return this.tenantRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['whatsappSession'],
    });
  }

  @Get('tenants/:id/sessions')
  @ApiOperation({
    summary: 'Get tenant session',
    description: 'Retrieve the WhatsApp session for a specific tenant.',
  })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Session details' })
  @ApiResponse({ status: 404, description: 'Tenant or session not found' })
  async getTenantSession(@Param('id') id: string) {
    return this.sessionRepo.findOne({ where: { tenantId: id } });
  }

  @Post('tenants/:id/force-disconnect')
  @ApiOperation({
    summary: 'Force disconnect tenant',
    description:
      'Forcefully disconnect a tenant WhatsApp session. Use for emergency/maintenance.',
  })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'Session force disconnected' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async forceDisconnect(@Param('id') id: string) {
    await this.sessionLifecycle.disconnect(id);
    return { message: `Session for tenant ${id} force disconnected.` };
  }

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Query audit logs',
    description: 'Retrieve paginated audit logs. Optionally filter by tenant.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'tenantId',
    required: false,
    description: 'Filter by tenant UUID',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('tenantId') tenantId?: string,
  ) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const [logs, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { logs, total, page, limit };
  }
}
