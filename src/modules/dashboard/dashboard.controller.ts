import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiCredential,
  Message,
  Template,
  Tenant,
  User,
  Webhook,
  WhatsAppSession,
  WhatsAppSessionKey,
} from '../../database/entities';
import {
  MessageDirection,
  MessageStatus,
  SubscriptionStatus,
} from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { SessionManagerService } from '../whatsapp/session/session-manager.service';
import { MessageService } from '../whatsapp/messaging/message.service';
import {
  SendBulkDto,
  SendMediaDto,
  SendMessageDto,
  SendUploadedMediaDto,
} from '../whatsapp/messaging/dto/send-message.dto';
import { MediaStorageService } from '../whatsapp/messaging/media-storage.service';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace-settings.dto';
import { WebhookService } from '../webhook/webhook.service';
import { RegisterWebhookDto } from '../webhook/dto/register-webhook.dto';

type StatusCount = { status: string; count: string };
type DirectionCount = { direction: string; count: string };
type ActivityRow = {
  date: string;
  total: string;
  delivered: string;
  failed: string;
};
type AnalyticsSummary = {
  total: string;
  outbound: string;
  inbound: string;
  uniqueContacts: string;
  delivered: string;
  failed: string;
  averageDeliverySeconds: string | null;
};
type BroadcastRow = {
  batchId: string;
  createdAt: string;
  recipients: string;
  delivered: string;
  failed: string;
  pending: string;
  bodyPreview: string | null;
};
type BillingUsageRow = {
  total: string;
  outbound: string;
  inbound: string;
  delivered: string;
  failed: string;
  uniqueContacts: string;
};
type ReportTypeCount = { type: string; count: string };

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    @InjectRepository(WhatsAppSessionKey)
    private readonly sessionKeyRepo: Repository<WhatsAppSessionKey>,
    @InjectRepository(ApiCredential)
    private readonly credentialRepo: Repository<ApiCredential>,
    private readonly sessionManager: SessionManagerService,
    private readonly messageService: MessageService,
    private readonly mediaStorage: MediaStorageService,
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Workspace dashboard overview',
    description:
      'Returns tenant-scoped live metrics, recent messages, session health, templates, webhook and seven-day activity.',
  })
  @ApiResponse({ status: 200, description: 'Workspace dashboard data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverview(@CurrentTenant() tenantId: string) {
    if (!tenantId) {
      throw new ForbiddenException(
        'A tenant workspace is required for this dashboard.',
      );
    }

    const [
      tenant,
      session,
      totalMessages,
      templatesCount,
      teamMembers,
      webhook,
    ] = await Promise.all([
      this.tenantRepo.findOne({ where: { id: tenantId } }),
      this.sessionRepo.findOne({ where: { tenantId } }),
      this.messageRepo.count({ where: { tenantId } }),
      this.templateRepo.count({ where: { tenantId, isDeleted: false } }),
      this.userRepo.count({ where: { tenantId, isActive: true } }),
      this.webhookRepo.findOne({ where: { tenantId } }),
    ]);

    const [statusCounts, directionCounts, activity, recentMessages] =
      await Promise.all([
        this.messageRepo
          .createQueryBuilder('message')
          .select('message.status', 'status')
          .addSelect('COUNT(message.id)', 'count')
          .where('message.tenant_id = :tenantId', { tenantId })
          .groupBy('message.status')
          .getRawMany<StatusCount>(),
        this.messageRepo
          .createQueryBuilder('message')
          .select('message.direction', 'direction')
          .addSelect('COUNT(message.id)', 'count')
          .where('message.tenant_id = :tenantId', { tenantId })
          .groupBy('message.direction')
          .getRawMany<DirectionCount>(),
        this.messageRepo
          .createQueryBuilder('message')
          .select(
            "TO_CHAR(DATE_TRUNC('day', message.created_at), 'YYYY-MM-DD')",
            'date',
          )
          .addSelect('COUNT(message.id)', 'total')
          .addSelect(
            "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
            'delivered',
          )
          .addSelect(
            "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
            'failed',
          )
          .where('message.tenant_id = :tenantId', { tenantId })
          .andWhere("message.created_at >= CURRENT_DATE - INTERVAL '6 days'")
          .groupBy("DATE_TRUNC('day', message.created_at)")
          .orderBy("DATE_TRUNC('day', message.created_at)", 'ASC')
          .getRawMany<ActivityRow>(),
        this.messageRepo.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 6,
        }),
      ]);

    const statusMap = Object.fromEntries(
      statusCounts.map(({ status, count }) => [status, Number(count)]),
    );
    const directionMap = Object.fromEntries(
      directionCounts.map(({ direction, count }) => [direction, Number(count)]),
    );
    const delivered =
      (statusMap[MessageStatus.DELIVERED] || 0) +
      (statusMap[MessageStatus.READ] || 0);
    const outbound = directionMap[MessageDirection.OUTBOUND] || 0;

    return {
      tenant: tenant
        ? {
            id: tenant.id,
            companyName: tenant.companyName,
            slug: tenant.slug,
            status: tenant.status,
            plan: tenant.plan,
            dailyMessageLimit: tenant.dailyMessageLimit,
          }
        : null,
      session: session
        ? {
            status: session.status,
            phoneNumber: session.phoneNumber,
            connectedAt: session.connectedAt,
            disconnectedAt: session.disconnectedAt,
            reconnectCount: session.reconnectCount,
            lastHeartbeat: session.lastHeartbeatAt,
            isSocketAlive: this.sessionManager.has(tenantId),
          }
        : null,
      metrics: {
        totalMessages,
        outboundMessages: outbound,
        inboundMessages: directionMap[MessageDirection.INBOUND] || 0,
        queuedMessages: statusMap[MessageStatus.QUEUED] || 0,
        processingMessages: statusMap[MessageStatus.PROCESSING] || 0,
        sentMessages: statusMap[MessageStatus.SENT] || 0,
        deliveredMessages: delivered,
        failedMessages: statusMap[MessageStatus.FAILED] || 0,
        deliveryRate: outbound
          ? Math.round((delivered / outbound) * 1000) / 10
          : 0,
      },
      activity: activity.map((row) => ({
        date: row.date,
        total: Number(row.total),
        delivered: Number(row.delivered),
        failed: Number(row.failed),
      })),
      recentMessages: recentMessages.map((message) => ({
        id: message.id,
        to: message.toNumber,
        direction: message.direction,
        type: message.messageType,
        status: message.status,
        bodyPreview: message.body?.slice(0, 100) || null,
        errorReason: message.errorReason,
        createdAt: message.createdAt,
        deliveredAt: message.deliveredAt,
      })),
      templatesCount,
      teamMembers,
      webhook: webhook
        ? {
            configured: true,
            url: webhook.url,
            isActive: webhook.isActive,
            failureCount: webhook.failureCount,
            lastSuccessAt: webhook.lastSuccessAt,
            lastFailureAt: webhook.lastFailureAt,
          }
        : { configured: false },
    };
  }

  @Get('billing')
  @ApiOperation({
    summary: 'Workspace plan, billing and API usage',
    description:
      'Returns the current tenant plan, live usage for the UTC billing period, configured pricing and invoice metadata.',
  })
  async getBilling(@CurrentTenant() tenantId: string) {
    this.assertTenant(tenantId);
    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
      relations: ['billingPlan'],
    });
    if (!tenant) throw new ForbiddenException('Workspace not found.');

    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const daysInPeriod = Math.round(
      (periodEnd.getTime() - periodStart.getTime()) / 86_400_000,
    );
    const elapsedDays = Math.max(
      (now.getTime() - periodStart.getTime()) / 86_400_000,
      1,
    );

    const [usage, todayOutbound] = await Promise.all([
      this.messageRepo
        .createQueryBuilder('message')
        .select('COUNT(message.id)', 'total')
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'outbound')",
          'outbound',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'inbound')",
          'inbound',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
          'delivered',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
          'failed',
        )
        .addSelect(
          'COUNT(DISTINCT COALESCE(message.from_number, message.to_number))',
          'uniqueContacts',
        )
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere('message.created_at >= :periodStart', { periodStart })
        .andWhere('message.created_at < :periodEnd', { periodEnd })
        .getRawOne<BillingUsageRow>(),
      this.messageRepo
        .createQueryBuilder('message')
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere("message.direction = 'outbound'")
        .andWhere('message.created_at >= :todayStart', { todayStart })
        .andWhere('message.created_at < :periodEnd', { periodEnd })
        .getCount(),
    ]);

    const outbound = Number(usage?.outbound || 0);
    const delivered = Number(usage?.delivered || 0);
    const planPrices = this.configService.get<Record<string, number>>(
      'billing.planMonthlyCents',
      {},
    );
    const basePlanCents =
      tenant.billingPlan?.monthlyPriceCents ??
      Number(planPrices[tenant.plan] || 0);
    const planCurrency =
      tenant.billingPlan?.currency ||
      this.configService.get<string>('billing.currency', 'USD');
    const apiCostPerThousandCents = this.configService.get<number>(
      'billing.apiCostPerThousandCents',
      0,
    );
    const estimatedApiCostCents =
      Math.round(((outbound * apiCostPerThousandCents) / 1000) * 100) / 100;
    const monthlyAllowance = tenant.dailyMessageLimit * daysInPeriod;
    const projectedOutbound = Math.round(
      (outbound / elapsedDays) * daysInPeriod,
    );
    const effectiveSubscriptionStatus =
      tenant.subscriptionEndsAt && tenant.subscriptionEndsAt <= now
        ? SubscriptionStatus.EXPIRED
        : tenant.subscriptionStatus;

    return {
      plan: {
        id: tenant.subscriptionPlanId || tenant.plan,
        name:
          tenant.billingPlan?.name ||
          tenant.plan.replace(/\b\w/g, (letter) => letter.toUpperCase()),
        status: effectiveSubscriptionStatus,
        accountStatus: tenant.status,
        subscriptionStartedAt: tenant.subscriptionStartedAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
        subscriptionAutoRenew: tenant.subscriptionAutoRenew,
        subscriptionSuspensionReason: tenant.subscriptionSuspensionReason,
        monthlyPriceCents: basePlanCents,
        currency: planCurrency,
        rateLimitPerMinute: tenant.rateLimitPerMinute,
        dailyMessageLimit: tenant.dailyMessageLimit,
        monthlyMessageAllowance: monthlyAllowance,
      },
      billing: {
        provider: this.configService.get<string>('billing.provider', 'manual'),
        pricingConfigured:
          Boolean(tenant.billingPlan?.monthlyPriceCents) ||
          this.configService.get<boolean>('billing.pricingConfigured', false),
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        nextBillingAt:
          tenant.subscriptionEndsAt?.toISOString() || periodEnd.toISOString(),
        basePlanCents,
        estimatedApiCostCents,
        estimatedTotalCents: basePlanCents + estimatedApiCostCents,
        apiCostPerThousandCents,
      },
      usage: {
        totalMessages: Number(usage?.total || 0),
        outboundMessages: outbound,
        inboundMessages: Number(usage?.inbound || 0),
        deliveredMessages: delivered,
        failedMessages: Number(usage?.failed || 0),
        uniqueContacts: Number(usage?.uniqueContacts || 0),
        todayOutbound,
        todayRemaining: Math.max(tenant.dailyMessageLimit - todayOutbound, 0),
        dailyUsagePercent: tenant.dailyMessageLimit
          ? Math.min(
              Math.round((todayOutbound / tenant.dailyMessageLimit) * 1000) /
                10,
              100,
            )
          : 0,
        monthlyUsagePercent: monthlyAllowance
          ? Math.min(Math.round((outbound / monthlyAllowance) * 1000) / 10, 100)
          : 0,
        projectedOutbound,
        deliveryRate: outbound
          ? Math.round((delivered / outbound) * 1000) / 10
          : 0,
      },
      invoices: [],
    };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Workspace usage and delivery report' })
  async getReports(
    @CurrentTenant() tenantId: string,
    @Query('days') daysQuery = '30',
  ) {
    this.assertTenant(tenantId);
    const days = Number.parseInt(daysQuery, 10);
    if (![7, 30, 90].includes(days)) {
      throw new BadRequestException('days must be one of 7, 30, or 90.');
    }

    const periodEnd = new Date();
    const periodStart = new Date(
      Date.UTC(
        periodEnd.getUTCFullYear(),
        periodEnd.getUTCMonth(),
        periodEnd.getUTCDate() - (days - 1),
      ),
    );

    const [summary, activity, statuses, messageTypes] = await Promise.all([
      this.messageRepo
        .createQueryBuilder('message')
        .select('COUNT(message.id)', 'total')
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'outbound')",
          'outbound',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'inbound')",
          'inbound',
        )
        .addSelect(
          'COUNT(DISTINCT COALESCE(message.from_number, message.to_number))',
          'uniqueContacts',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
          'delivered',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
          'failed',
        )
        .addSelect(
          'AVG(EXTRACT(EPOCH FROM (message.delivered_at - message.created_at))) FILTER (WHERE message.delivered_at IS NOT NULL)',
          'averageDeliverySeconds',
        )
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere('message.created_at >= :periodStart', { periodStart })
        .getRawOne<AnalyticsSummary>(),
      this.messageRepo
        .createQueryBuilder('message')
        .select(
          "TO_CHAR(DATE_TRUNC('day', message.created_at), 'YYYY-MM-DD')",
          'date',
        )
        .addSelect('COUNT(message.id)', 'total')
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
          'delivered',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
          'failed',
        )
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere('message.created_at >= :periodStart', { periodStart })
        .groupBy("DATE_TRUNC('day', message.created_at)")
        .orderBy("DATE_TRUNC('day', message.created_at)", 'ASC')
        .getRawMany<ActivityRow>(),
      this.messageRepo
        .createQueryBuilder('message')
        .select('message.status', 'status')
        .addSelect('COUNT(message.id)', 'count')
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere('message.created_at >= :periodStart', { periodStart })
        .groupBy('message.status')
        .getRawMany<StatusCount>(),
      this.messageRepo
        .createQueryBuilder('message')
        .select('message.message_type', 'type')
        .addSelect('COUNT(message.id)', 'count')
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere('message.created_at >= :periodStart', { periodStart })
        .groupBy('message.message_type')
        .getRawMany<ReportTypeCount>(),
    ]);

    const outbound = Number(summary?.outbound || 0);
    const inbound = Number(summary?.inbound || 0);
    const delivered = Number(summary?.delivered || 0);
    return {
      days,
      generatedAt: new Date().toISOString(),
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      summary: {
        totalMessages: Number(summary?.total || 0),
        outboundMessages: outbound,
        inboundMessages: inbound,
        uniqueContacts: Number(summary?.uniqueContacts || 0),
        deliveredMessages: delivered,
        failedMessages: Number(summary?.failed || 0),
        deliveryRate: outbound
          ? Math.round((delivered / outbound) * 1000) / 10
          : 0,
        replyRate: outbound ? Math.round((inbound / outbound) * 1000) / 10 : 0,
        averageDeliverySeconds:
          Math.round(Number(summary?.averageDeliverySeconds || 0) * 10) / 10,
      },
      activity: activity.map((row) => ({
        date: row.date,
        total: Number(row.total),
        delivered: Number(row.delivered),
        failed: Number(row.failed),
      })),
      statusBreakdown: statuses.map((row) => ({
        status: row.status,
        count: Number(row.count),
      })),
      typeBreakdown: messageTypes.map((row) => ({
        type: row.type,
        count: Number(row.count),
      })),
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Workspace messaging analytics' })
  async getAnalytics(@CurrentTenant() tenantId: string) {
    this.assertTenant(tenantId);
    const [summary, activity, statuses] = await Promise.all([
      this.messageRepo
        .createQueryBuilder('message')
        .select('COUNT(message.id)', 'total')
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'outbound')",
          'outbound',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'inbound')",
          'inbound',
        )
        .addSelect(
          'COUNT(DISTINCT COALESCE(message.from_number, message.to_number))',
          'uniqueContacts',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
          'delivered',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
          'failed',
        )
        .addSelect(
          'AVG(EXTRACT(EPOCH FROM (message.delivered_at - message.created_at))) FILTER (WHERE message.delivered_at IS NOT NULL)',
          'averageDeliverySeconds',
        )
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere("message.created_at >= CURRENT_DATE - INTERVAL '29 days'")
        .getRawOne<AnalyticsSummary>(),
      this.messageRepo
        .createQueryBuilder('message')
        .select(
          "TO_CHAR(DATE_TRUNC('day', message.created_at), 'YYYY-MM-DD')",
          'date',
        )
        .addSelect('COUNT(message.id)', 'total')
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
          'delivered',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
          'failed',
        )
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere("message.created_at >= CURRENT_DATE - INTERVAL '29 days'")
        .groupBy("DATE_TRUNC('day', message.created_at)")
        .orderBy("DATE_TRUNC('day', message.created_at)", 'ASC')
        .getRawMany<ActivityRow>(),
      this.messageRepo
        .createQueryBuilder('message')
        .select('message.status', 'status')
        .addSelect('COUNT(message.id)', 'count')
        .where('message.tenant_id = :tenantId', { tenantId })
        .andWhere("message.created_at >= CURRENT_DATE - INTERVAL '29 days'")
        .groupBy('message.status')
        .getRawMany<StatusCount>(),
    ]);

    const total = Number(summary?.total || 0);
    const outbound = Number(summary?.outbound || 0);
    const inbound = Number(summary?.inbound || 0);
    const delivered = Number(summary?.delivered || 0);
    return {
      periodDays: 30,
      metrics: {
        totalMessages: total,
        outboundMessages: outbound,
        inboundMessages: inbound,
        uniqueContacts: Number(summary?.uniqueContacts || 0),
        deliveredMessages: delivered,
        failedMessages: Number(summary?.failed || 0),
        deliveryRate: outbound
          ? Math.round((delivered / outbound) * 1000) / 10
          : 0,
        replyRate: outbound ? Math.round((inbound / outbound) * 1000) / 10 : 0,
        averageDeliverySeconds:
          Math.round(Number(summary?.averageDeliverySeconds || 0) * 10) / 10,
      },
      activity: activity.map((row) => ({
        date: row.date,
        total: Number(row.total),
        delivered: Number(row.delivered),
        failed: Number(row.failed),
      })),
      statusBreakdown: statuses.map((row) => ({
        status: row.status,
        count: Number(row.count),
      })),
    };
  }

  @Get('broadcasts')
  @ApiOperation({ summary: 'Workspace bulk-message batches' })
  async getBroadcasts(@CurrentTenant() tenantId: string) {
    this.assertTenant(tenantId);
    const rows = await this.messageRepo
      .createQueryBuilder('message')
      .select('message.batch_id', 'batchId')
      .addSelect('MIN(message.created_at)', 'createdAt')
      .addSelect('COUNT(message.id)', 'recipients')
      .addSelect(
        "COUNT(message.id) FILTER (WHERE message.status IN ('delivered', 'read'))",
        'delivered',
      )
      .addSelect(
        "COUNT(message.id) FILTER (WHERE message.status = 'failed')",
        'failed',
      )
      .addSelect(
        "COUNT(message.id) FILTER (WHERE message.status IN ('queued', 'processing', 'sent'))",
        'pending',
      )
      .addSelect('MIN(message.body)', 'bodyPreview')
      .where('message.tenant_id = :tenantId', { tenantId })
      .andWhere('message.batch_id IS NOT NULL')
      .groupBy('message.batch_id')
      .orderBy('MIN(message.created_at)', 'DESC')
      .limit(100)
      .getRawMany<BroadcastRow>();

    return rows.map((row) => {
      const recipients = Number(row.recipients);
      const delivered = Number(row.delivered);
      const failed = Number(row.failed);
      const pending = Number(row.pending);
      return {
        batchId: row.batchId,
        createdAt: row.createdAt,
        recipients,
        delivered,
        failed,
        pending,
        bodyPreview: row.bodyPreview?.slice(0, 120) || null,
        deliveryRate: recipients
          ? Math.round((delivered / recipients) * 1000) / 10
          : 0,
        status:
          pending > 0
            ? 'processing'
            : failed === recipients && recipients > 0
              ? 'failed'
              : 'completed',
      };
    });
  }

  @Post('broadcasts')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Create a workspace broadcast using JWT authentication',
  })
  async createBroadcast(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendBulkDto,
  ) {
    this.assertTenant(tenantId);
    const session = await this.sessionRepo.findOne({ where: { tenantId } });
    if (
      !session ||
      session.status !== 'connected' ||
      !this.sessionManager.has(tenantId)
    ) {
      throw new BadRequestException(
        'Connect WhatsApp before creating a broadcast.',
      );
    }
    return this.messageService.sendBulk(tenantId, dto);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Recent tenant conversations for the shared inbox' })
  async getInbox(@CurrentTenant() tenantId: string) {
    this.assertTenant(tenantId);
    const messages = await this.messageRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 250,
    });
    const possibleReverseKeys = [
      ...new Set(
        messages
          .flatMap((message) => [message.fromNumber, message.toNumber])
          .filter(
            (phone): phone is string =>
              Boolean(phone) && /^\+\d+$/.test(phone || ''),
          )
          .map((phone) => `${phone.slice(1)}_reverse`),
      ),
    ];
    const mappingRows = possibleReverseKeys.length
      ? await this.sessionKeyRepo
          .createQueryBuilder('key')
          .innerJoin('key.session', 'session')
          .where('session.tenant_id = :tenantId', { tenantId })
          .andWhere('key.category = :category', { category: 'lid-mapping' })
          .andWhere('key.key_id IN (:...keyIds)', {
            keyIds: possibleReverseKeys,
          })
          .getMany()
      : [];
    const lidPhoneMap = new Map<string, string>();
    for (const row of mappingRows) {
      if (!row.keyId.endsWith('_reverse')) continue;
      const lid = row.keyId.slice(0, -'_reverse'.length);
      const phone = typeof row.keyData === 'string' ? row.keyData : null;
      if (lid && phone) lidPhoneMap.set(`+${lid}`, `+${phone}`);
    }
    const conversationMap = new Map<
      string,
      {
        phone: string;
        lastAt: Date;
        lastMessage: string | null;
        inboundCount: number;
        messages: any[];
      }
    >();

    for (const message of messages) {
      const storedPhone =
        message.direction === MessageDirection.INBOUND
          ? message.fromNumber || message.toNumber
          : message.toNumber;
      const phone = lidPhoneMap.get(storedPhone) || storedPhone;
      const item = conversationMap.get(phone) || {
        phone,
        lastAt: message.createdAt,
        lastMessage: message.body?.slice(0, 120) || null,
        inboundCount: 0,
        messages: [],
      };
      if (message.direction === MessageDirection.INBOUND)
        item.inboundCount += 1;
      item.messages.push({
        id: message.id,
        direction: message.direction,
        type: message.messageType,
        body: message.body,
        media: message.mediaMetadata
          ? {
              url: message.mediaMetadata.localPath
                ? null
                : message.mediaMetadata.url || null,
              endpoint: message.mediaMetadata.localPath
                ? `/dashboard/media/${message.id}`
                : null,
              available: Boolean(
                message.mediaMetadata.localPath || message.mediaMetadata.url,
              ),
              fileName: message.mediaMetadata.fileName || null,
              mimeType: message.mediaMetadata.mimeType || null,
              durationSeconds: message.mediaMetadata.durationSeconds || null,
              ptt: Boolean(message.mediaMetadata.ptt),
              gifPlayback: Boolean(message.mediaMetadata.gifPlayback),
            }
          : null,
        status: message.status,
        createdAt: message.createdAt,
      });
      conversationMap.set(phone, item);
    }

    return Array.from(conversationMap.values())
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.reverse(),
      }))
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  }

  @Post('inbox/send')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: 'Send a reply from the authenticated workspace inbox',
  })
  async sendInboxMessage(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendMessageDto,
  ) {
    this.assertTenant(tenantId);
    const session = await this.sessionRepo.findOne({ where: { tenantId } });
    if (
      !session ||
      session.status !== 'connected' ||
      !this.sessionManager.has(tenantId)
    ) {
      throw new BadRequestException('Connect WhatsApp before sending a reply.');
    }
    return this.messageService.sendMessage(tenantId, dto);
  }

  @Post('inbox/send-media')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: 'Send media from the authenticated workspace inbox',
  })
  async sendInboxMedia(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendMediaDto,
  ) {
    this.assertTenant(tenantId);
    const session = await this.sessionRepo.findOne({ where: { tenantId } });
    if (
      !session ||
      session.status !== 'connected' ||
      !this.sessionManager.has(tenantId)
    ) {
      throw new BadRequestException('Connect WhatsApp before sending media.');
    }
    return this.messageService.sendMedia(tenantId, dto);
  }

  @Post('inbox/send-upload')
  @UseGuards(RateLimitGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Upload and send private inbox media or a voice note',
  })
  async sendInboxUpload(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendUploadedMediaDto,
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    this.assertTenant(tenantId);
    if (!file) throw new BadRequestException('Choose a file before sending.');
    const session = await this.sessionRepo.findOne({ where: { tenantId } });
    if (
      !session ||
      session.status !== 'connected' ||
      !this.sessionManager.has(tenantId)
    ) {
      throw new BadRequestException('Connect WhatsApp before sending media.');
    }
    return this.messageService.sendUploadedMedia(tenantId, dto, file);
  }

  @Get('media/:messageId')
  @ApiOperation({ summary: 'Stream tenant-scoped private message media' })
  async streamMessageMedia(
    @CurrentTenant() tenantId: string,
    @Param('messageId') messageId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertTenant(tenantId);
    const message = await this.messageRepo.findOne({
      where: { id: messageId, tenantId },
    });
    const localPath = message?.mediaMetadata?.localPath;
    if (!message || !localPath) {
      throw new BadRequestException('Media is not available for this message.');
    }
    const opened = await this.mediaStorage.open(localPath);
    const fileName = String(message.mediaMetadata?.fileName || 'attachment')
      .replace(/[\r\n"\\]/g, '_')
      .slice(0, 120);
    response.set({
      'Content-Type':
        message.mediaMetadata?.mimeType || 'application/octet-stream',
      'Content-Length': String(opened.size),
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(opened.stream);
  }

  @Get('team')
  @ApiOperation({ summary: 'Safe workspace member directory' })
  async getTeam(@CurrentTenant() tenantId: string) {
    this.assertTenant(tenantId);
    const users = await this.userRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));
  }

  @Get('settings')
  @ApiOperation({ summary: 'Workspace settings and current profile' })
  async getSettings(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: any,
  ) {
    this.assertTenant(tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new ForbiddenException('Workspace not found.');
    return {
      workspace: {
        id: tenant.id,
        companyName: tenant.companyName,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        rateLimitPerMinute: tenant.rateLimitPerMinute,
        dailyMessageLimit: tenant.dailyMessageLimit,
        description: String(tenant.settings?.description || ''),
        timezone: String(tenant.settings?.timezone || 'UTC'),
      },
      profile: {
        id: currentUser?.id,
        name: currentUser?.name,
        email: currentUser?.email,
        role: currentUser?.role,
        phoneNumber: currentUser?.phoneNumber || null,
      },
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update workspace display settings' })
  async updateSettings(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateWorkspaceSettingsDto,
  ) {
    this.assertTenant(tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new ForbiddenException('Workspace not found.');
    if (dto.companyName) tenant.companyName = dto.companyName;
    tenant.settings = {
      ...(tenant.settings || {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
    };
    const saved = await this.tenantRepo.save(tenant);
    return {
      companyName: saved.companyName,
      slug: saved.slug,
      description: String(saved.settings?.description || ''),
      timezone: String(saved.settings?.timezone || 'UTC'),
    };
  }

  @Get('developer')
  @ApiOperation({ summary: 'Safe API credential and webhook metadata' })
  async getDeveloperSettings(@CurrentTenant() tenantId: string) {
    this.assertTenant(tenantId);
    const [credential, webhook] = await Promise.all([
      this.credentialRepo.findOne({ where: { tenantId } }),
      this.webhookRepo.findOne({ where: { tenantId } }),
    ]);
    return {
      credential: credential
        ? {
            clientId: credential.clientId,
            secretPrefix: credential.apiSecretPrefix,
            isActive: credential.isActive,
            createdAt: credential.createdAt,
            lastUsedAt: credential.lastUsedAt,
            expiresAt: credential.expiresAt,
          }
        : null,
      webhook: webhook
        ? {
            url: webhook.url,
            events: webhook.events,
            isActive: webhook.isActive,
            failureCount: webhook.failureCount,
            lastSuccessAt: webhook.lastSuccessAt,
            lastFailureAt: webhook.lastFailureAt,
          }
        : null,
    };
  }

  @Post('developer/webhook')
  @ApiOperation({
    summary: 'Register a webhook from the authenticated dashboard',
  })
  async registerDashboardWebhook(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterWebhookDto,
  ) {
    this.assertTenant(tenantId);
    const webhook = await this.webhookService.register(
      tenantId,
      dto.url,
      dto.events,
      dto.secret,
    );
    return {
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      signingSecret: webhook.secret,
    };
  }

  @Delete('developer/webhook')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove the workspace webhook from the dashboard' })
  async removeDashboardWebhook(@CurrentTenant() tenantId: string) {
    this.assertTenant(tenantId);
    await this.webhookService.remove(tenantId);
  }

  private assertTenant(tenantId?: string): asserts tenantId is string {
    if (!tenantId)
      throw new ForbiddenException(
        'A tenant workspace is required for this dashboard.',
      );
  }
}
