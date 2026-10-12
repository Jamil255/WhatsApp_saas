import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { User } from '../../database/entities/user.entity';
import { Visitor } from '../../database/entities/visitor.entity';
import { QueueService } from '../../shared/queue/queue.service';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AdminUsersService } from './admin-users.service';
import { AuditService } from './audit.service';
import {
  ChangeAdminUserPasswordDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from './dto/admin-user.dto';
import { VerifySessionOtpDto } from '../whatsapp/session/session.controller';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { AdminPlansService } from './admin-plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import {
  RenewSubscriptionDto,
  SuspendSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';

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
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Visitor)
    private readonly visitorRepo: Repository<Visitor>,
    private readonly sessionManager: SessionManagerService,
    private readonly sessionLifecycle: SessionLifecycleService,
    private readonly queueService: QueueService,
    private readonly config: ConfigService,
    private readonly adminUsersService: AdminUsersService,
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
    private readonly adminPlansService: AdminPlansService,
    private readonly auditService: AuditService,
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
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [
      totalTenants,
      totalMessages,
      activeSessions,
      totalUsers,
      activeUsers,
      roleCounts,
      totalVisitors,
      visitorsToday,
    ] = await Promise.all([
      this.tenantRepo.count(),
      this.messageRepo.count(),
      this.sessionRepo.count({ where: { status: 'connected' as any } }),
      this.userRepo.count(),
      this.userRepo.count({ where: { isActive: true } }),
      this.userRepo
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(user.id)', 'count')
        .groupBy('user.role')
        .getRawMany<{ role: string; count: string }>(),
      this.visitorRepo.count(),
      this.visitorRepo
        .createQueryBuilder('visitor')
        .where('visitor.last_seen_at >= :startOfToday', { startOfToday })
        .getCount(),
    ]);

    const roles = Object.fromEntries(
      roleCounts.map((row) => [row.role, Number(row.count)]),
    );

    return {
      totalTenants,
      totalMessages,
      activeSessions,
      totalUsers,
      activeUsers,
      platformAdmins: roles[Role.SUPER_ADMIN] || 0,
      tenantAdmins: roles[Role.TENANT_ADMIN] || 0,
      tenantAgents: roles[Role.TENANT_AGENT] || 0,
      totalVisitors,
      visitorsToday,
      inMemorySockets: this.sessionManager.getActiveCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Platform user directory' })
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 100,
    @Query('role') role?: Role,
    @Query('tenantId') tenantId?: string,
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
    const query = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .orderBy('user.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);

    if (role && Object.values(Role).includes(role)) {
      query.andWhere('user.role = :role', { role });
    }
    if (tenantId) query.andWhere('user.tenant_id = :tenantId', { tenantId });

    const [users, total] = await query.getManyAndCount();
    return {
      users: users.map((user) => ({
        id: user.id,
        tenantId: user.tenantId,
        organization: user.tenant?.companyName || 'Platform',
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a platform or tenant user' })
  async createUser(@Body() dto: CreateAdminUserDto, @Req() request: Request) {
    const user = await this.adminUsersService.create(dto);
    await this.auditService.log({
      tenantId: user.tenantId,
      userId: (request.user as any)?.sub,
      action: 'user.create',
      resourceType: 'user',
      resourceId: user.id,
      newValues: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return user;
  }

  @Patch('users/:id/password')
  @ApiOperation({ summary: 'Set a new password and revoke active sessions' })
  async changeUserPassword(
    @Param('id') id: string,
    @Body() dto: ChangeAdminUserPasswordDto,
    @Req() request: Request,
  ) {
    const result = await this.adminUsersService.changePassword(id, dto);
    await this.auditService.log({
      userId: (request.user as any)?.sub,
      action: 'user.password_change',
      resourceType: 'user',
      resourceId: id,
      newValues: { sessionsRevoked: true },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return result;
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user profile and access' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @Req() request: Request,
  ) {
    const user = await this.adminUsersService.update(
      id,
      dto,
      (request.user as any)?.sub,
    );
    await this.auditService.log({
      tenantId: user.tenantId,
      userId: (request.user as any)?.sub,
      action: 'user.update',
      resourceType: 'user',
      resourceId: user.id,
      newValues: dto,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return user;
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a user account' })
  async deleteUser(@Param('id') id: string, @Req() request: Request) {
    const user = await this.adminUsersService.remove(
      id,
      (request.user as any)?.sub,
    );
    await this.auditService.log({
      tenantId: user.tenantId,
      userId: (request.user as any)?.sub,
      action: 'user.delete',
      resourceType: 'user',
      resourceId: id,
      oldValues: { name: user.name, email: user.email, role: user.role },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Get('visitors')
  @ApiOperation({ summary: 'Anonymous public-site visitor activity' })
  async getVisitors(@Query('page') page = 1, @Query('limit') limit = 100) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
    const [visitors, total, totals, daily] = await Promise.all([
      this.visitorRepo.find({
        order: { lastSeenAt: 'DESC' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.visitorRepo.count(),
      this.visitorRepo
        .createQueryBuilder('visitor')
        .select('COALESCE(SUM(visitor.page_views), 0)', 'pageViews')
        .addSelect(
          'COUNT(visitor.id) FILTER (WHERE visitor.last_seen_at >= CURRENT_DATE)',
          'today',
        )
        .addSelect(
          "COUNT(visitor.id) FILTER (WHERE visitor.last_seen_at >= NOW() - INTERVAL '15 minutes')",
          'activeNow',
        )
        .getRawOne<{ pageViews: string; today: string; activeNow: string }>(),
      this.visitorRepo
        .createQueryBuilder('visitor')
        .select(
          "TO_CHAR(DATE_TRUNC('day', visitor.created_at), 'YYYY-MM-DD')",
          'date',
        )
        .addSelect('COUNT(visitor.id)', 'visitors')
        .where("visitor.created_at >= CURRENT_DATE - INTERVAL '13 days'")
        .groupBy("DATE_TRUNC('day', visitor.created_at)")
        .orderBy("DATE_TRUNC('day', visitor.created_at)", 'ASC')
        .getRawMany<{ date: string; visitors: string }>(),
    ]);

    return {
      visitors: visitors.map((visitor) => ({
        id: visitor.id,
        visitorId: visitor.visitorKey,
        sessionId: visitor.sessionId,
        ipAddress: visitor.ipAddress,
        userAgent: visitor.userAgent,
        landingPath: visitor.landingPath,
        lastVisitedPath: visitor.lastVisitedPath,
        referrer: visitor.referrer,
        utmSource: visitor.utmSource,
        utmMedium: visitor.utmMedium,
        utmCampaign: visitor.utmCampaign,
        pageViews: visitor.pageViews,
        firstSeenAt: visitor.createdAt,
        lastSeenAt: visitor.lastSeenAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      stats: {
        uniqueVisitors: total,
        pageViews: Number(totals?.pageViews || 0),
        visitorsToday: Number(totals?.today || 0),
        activeNow: Number(totals?.activeNow || 0),
      },
      activity: daily.map((row) => ({
        date: row.date,
        visitors: Number(row.visitors),
      })),
    };
  }

  @Get('tenants/:id/connection')
  @ApiOperation({ summary: 'Get a tenant WhatsApp connection state' })
  async getTenantConnection(@Param('id') id: string) {
    await this.assertTenantExists(id);
    return this.sessionLifecycle.getStatus(id);
  }

  @Get('tenants/:id/connection/qr')
  @ApiOperation({ summary: 'Get a tenant authenticated QR connection state' })
  async getTenantQr(@Param('id') id: string) {
    await this.assertTenantExists(id);
    return this.sessionLifecycle.getQrCode(id);
  }

  @Post('tenants/:id/connection/connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a tenant WhatsApp QR connection' })
  async connectTenant(@Param('id') id: string, @Req() request: Request) {
    const tenant = await this.assertTenantExists(id);
    await this.sessionLifecycle.connect(id);
    await this.auditConnection(request, id, 'connection.start');
    return { message: `QR connection started for ${tenant.companyName}.` };
  }

  @Post('tenants/:id/connection/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a tenant WhatsApp connection OTP' })
  async verifyTenantOtp(
    @Param('id') id: string,
    @Body() dto: VerifySessionOtpDto,
    @Req() request: Request,
  ) {
    await this.assertTenantExists(id);
    const result = await this.sessionLifecycle.verifySessionOtp(id, dto.otp);
    await this.auditConnection(request, id, 'connection.verify');
    return result;
  }

  @Post('tenants/:id/connection/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend a tenant WhatsApp connection OTP' })
  async resendTenantOtp(@Param('id') id: string) {
    await this.assertTenantExists(id);
    return this.sessionLifecycle.resendSessionOtp(id);
  }

  @Post('tenants/:id/connection/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect a tenant WhatsApp account' })
  async disconnectTenant(@Param('id') id: string, @Req() request: Request) {
    await this.assertTenantExists(id);
    await this.sessionLifecycle.disconnect(id);
    await this.auditConnection(request, id, 'connection.disconnect');
    return { message: 'Tenant WhatsApp account disconnected.' };
  }

  @Post('tenants/:id/connection/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart a tenant WhatsApp QR connection' })
  async restartTenantConnection(
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    await this.assertTenantExists(id);
    await this.sessionLifecycle.disconnect(id);
    await this.sessionLifecycle.connect(id);
    await this.auditConnection(request, id, 'connection.restart');
    return { message: 'Tenant WhatsApp connection restarted.' };
  }

  @Get('tenants')
  @ApiOperation({
    summary: 'List all tenants (admin)',
    description: 'Retrieve all tenants with their WhatsApp session status.',
  })
  @ApiResponse({ status: 200, description: 'Tenants with session info' })
  async listTenants() {
    const [tenants, userCounts, messageCounts] = await Promise.all([
      this.tenantRepo.find({
        order: { createdAt: 'DESC' },
        relations: ['whatsappSession', 'billingPlan'],
      }),
      this.userRepo
        .createQueryBuilder('user')
        .select('user.tenant_id', 'tenantId')
        .addSelect('COUNT(user.id)', 'count')
        .groupBy('user.tenant_id')
        .getRawMany<{ tenantId: string; count: string }>(),
      this.messageRepo
        .createQueryBuilder('message')
        .select('message.tenant_id', 'tenantId')
        .addSelect('COUNT(message.id)', 'count')
        .groupBy('message.tenant_id')
        .getRawMany<{ tenantId: string; count: string }>(),
    ]);
    const usersByTenant = Object.fromEntries(
      userCounts.map((row) => [row.tenantId, Number(row.count)]),
    );
    const messagesByTenant = Object.fromEntries(
      messageCounts.map((row) => [row.tenantId, Number(row.count)]),
    );

    // Keep credentials, account metadata, settings and other secrets out of the admin list response.
    return tenants.map((tenant) => ({
      id: tenant.id,
      companyName: tenant.companyName,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      subscriptionPlanId: tenant.subscriptionPlanId,
      planName: tenant.billingPlan?.name || tenant.plan,
      planSlug: tenant.billingPlan?.slug || tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      subscriptionAutoRenew: tenant.subscriptionAutoRenew,
      dailyMessageLimit: tenant.dailyMessageLimit,
      rateLimitPerMinute: tenant.rateLimitPerMinute,
      createdAt: tenant.createdAt,
      userCount: usersByTenant[tenant.id] || 0,
      messageCount: messagesByTenant[tenant.id] || 0,
      whatsappSession: tenant.whatsappSession
        ? {
            status: tenant.whatsappSession.status,
            phoneNumber: tenant.whatsappSession.phoneNumber,
            connectedAt: tenant.whatsappSession.connectedAt,
          }
        : null,
    }));
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Subscription portfolio',
    description:
      'List organization plans, lifecycle state, renewal dates, limits and live usage.',
  })
  async listSubscriptions() {
    return this.adminSubscriptionsService.list();
  }

  @Get('plans')
  @ApiOperation({ summary: 'List the platform subscription plan catalog' })
  async listPlans() {
    return this.adminPlansService.list();
  }

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subscription plan' })
  async createPlan(@Body() dto: CreatePlanDto, @Req() request: Request) {
    const plan = await this.adminPlansService.create(dto);
    await this.auditService.log({
      userId: (request.user as any)?.sub,
      action: 'plan.create',
      resourceType: 'subscription_plan',
      resourceId: plan.id,
      newValues: this.adminPlansService.snapshot(plan),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return plan;
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update or archive a subscription plan' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @Req() request: Request,
  ) {
    const result = await this.adminPlansService.update(id, dto);
    await this.auditService.log({
      userId: (request.user as any)?.sub,
      action: result.plan.isActive ? 'plan.update' : 'plan.archive',
      resourceType: 'subscription_plan',
      resourceId: id,
      oldValues: result.oldValues,
      newValues: result.newValues,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return result.plan;
  }

  @Patch('tenants/:id/subscription')
  @ApiOperation({ summary: 'Update an organization subscription' })
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @Req() request: Request,
  ) {
    const result = await this.adminSubscriptionsService.update(id, dto);
    await this.auditService.log({
      tenantId: id,
      userId: (request.user as any)?.sub,
      action: 'subscription.update',
      resourceType: 'subscription',
      resourceId: id,
      oldValues: result.oldValues,
      newValues: result.newValues,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return result.tenant;
  }

  @Post('tenants/:id/subscription/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew an organization subscription' })
  async renewSubscription(
    @Param('id') id: string,
    @Body() dto: RenewSubscriptionDto,
    @Req() request: Request,
  ) {
    const result = await this.adminSubscriptionsService.renew(id, dto);
    await this.auditService.log({
      tenantId: id,
      userId: (request.user as any)?.sub,
      action: 'subscription.renew',
      resourceType: 'subscription',
      resourceId: id,
      oldValues: result.oldValues,
      newValues: result.newValues,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return result.tenant;
  }

  @Post('tenants/:id/subscription/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend subscription service' })
  async suspendSubscription(
    @Param('id') id: string,
    @Body() dto: SuspendSubscriptionDto,
    @Req() request: Request,
  ) {
    const result = await this.adminSubscriptionsService.suspend(id, dto);
    await this.auditService.log({
      tenantId: id,
      userId: (request.user as any)?.sub,
      action: 'subscription.suspend',
      resourceType: 'subscription',
      resourceId: id,
      oldValues: result.oldValues,
      newValues: result.newValues,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return result.tenant;
  }

  @Post('tenants/:id/subscription/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume subscription service' })
  async resumeSubscription(@Param('id') id: string, @Req() request: Request) {
    const result = await this.adminSubscriptionsService.resume(id);
    await this.auditService.log({
      tenantId: id,
      userId: (request.user as any)?.sub,
      action: 'subscription.resume',
      resourceType: 'subscription',
      resourceId: id,
      oldValues: result.oldValues,
      newValues: result.newValues,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return result.tenant;
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
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const [logs, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      relations: ['user', 'tenant'],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      logs: logs.map((log) => ({
        id: log.id,
        tenantId: log.tenantId,
        tenantName: log.tenant?.companyName || null,
        userId: log.userId,
        actorName: log.user?.name || 'System',
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  @Get('messages')
  @ApiOperation({ summary: 'Platform-wide paginated message activity' })
  async getMessages(@Query('page') page = 1, @Query('limit') limit = 50) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const [messages, total, todayStats] = await Promise.all([
      this.messageRepo.find({
        relations: ['tenant'],
        order: { createdAt: 'DESC' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.messageRepo.count(),
      this.messageRepo
        .createQueryBuilder('message')
        .select('COUNT(message.id)', 'total')
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
          'delivered',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
          'failed',
        )
        .where('message.created_at >= CURRENT_DATE')
        .getRawOne<{ total: string; delivered: string; failed: string }>(),
    ]);

    return {
      messages: messages.map((message) => ({
        id: message.id,
        tenantId: message.tenantId,
        organization: message.tenant?.companyName || 'Unknown tenant',
        to: message.toNumber,
        from: message.fromNumber,
        direction: message.direction,
        type: message.messageType,
        status: message.status,
        bodyPreview: message.body?.slice(0, 100) || null,
        errorReason: message.errorReason,
        createdAt: message.createdAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      today: {
        total: Number(todayStats?.total || 0),
        delivered: Number(todayStats?.delivered || 0),
        failed: Number(todayStats?.failed || 0),
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Authenticated platform health detail' })
  async getHealth() {
    const startedAt = Date.now();
    let database = 'down';
    try {
      await this.sessionRepo.query('SELECT 1');
      database = 'up';
    } catch {}
    const databaseLatencyMs = Date.now() - startedAt;
    const [queuedMessages, processingMessages, failedMessages] =
      await Promise.all([
        this.messageRepo.count({ where: { status: 'queued' as any } }),
        this.messageRepo.count({ where: { status: 'processing' as any } }),
        this.messageRepo.count({ where: { status: 'failed' as any } }),
      ]);
    return {
      status: database === 'up' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        api: { status: 'up' },
        database: { status: database, latencyMs: databaseLatencyMs },
        queue: {
          status: this.queueService.isAvailable() ? 'up' : 'down',
          queuedMessages,
          processingMessages,
        },
        whatsapp: {
          status: 'up',
          activeSessions: await this.sessionRepo.count({
            where: { status: 'connected' as any },
          }),
          inMemorySockets: this.sessionManager.getActiveCount(),
        },
      },
      failedMessages,
    };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Safe platform runtime configuration' })
  getSettings() {
    return {
      environment: this.config.get<string>('app.nodeEnv', 'development'),
      apiPrefix: this.config.get<string>('app.apiPrefix', 'api'),
      queueSchema: this.config.get<string>('queue.schema', 'pgboss'),
      queueMonitorIntervalSeconds: this.config.get<number>(
        'queue.monitorStateIntervalSeconds',
        30,
      ),
      otpExpirySeconds: this.config.get<number>('otp.expirySeconds', 300),
      corsOrigins: this.config.get<string[]>('app.corsOrigins', []),
    };
  }

  private async assertTenantExists(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Organization not found.');
    return tenant;
  }

  private async auditConnection(
    request: Request,
    tenantId: string,
    action: string,
  ) {
    await this.auditService.log({
      tenantId,
      userId: (request.user as any)?.sub,
      action,
      resourceType: 'whatsapp_session',
      resourceId: tenantId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
