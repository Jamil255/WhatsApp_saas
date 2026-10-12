import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionStatus,
  TenantPlan,
  TenantStatus,
} from '../../common/enums';
import { Message } from '../../database/entities/message.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { getTenantAccessDenial } from '../../common/utils/tenant-access.util';
import {
  RenewSubscriptionDto,
  SuspendSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';

type UsageRow = {
  tenantId: string;
  todayUsage: string;
  periodUsage: string;
};

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly config: ConfigService,
  ) {}

  async list() {
    const [tenants, usageRows, userRows, sessions, plans] = await Promise.all([
      this.tenantRepo.find({
        order: { createdAt: 'DESC' },
        relations: ['billingPlan'],
      }),
      this.messageRepo
        .createQueryBuilder('message')
        .select('message.tenant_id', 'tenantId')
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'outbound' AND message.created_at >= CURRENT_DATE)",
          'todayUsage',
        )
        .addSelect(
          "COUNT(message.id) FILTER (WHERE message.direction = 'outbound' AND message.created_at >= DATE_TRUNC('month', CURRENT_DATE))",
          'periodUsage',
        )
        .groupBy('message.tenant_id')
        .getRawMany<UsageRow>(),
      this.userRepo
        .createQueryBuilder('user')
        .select('user.tenant_id', 'tenantId')
        .addSelect('COUNT(user.id)', 'count')
        .where('user.is_active = true')
        .groupBy('user.tenant_id')
        .getRawMany<{ tenantId: string; count: string }>(),
      this.sessionRepo.find(),
      this.planRepo.find(),
    ]);

    const usageByTenant = new Map(usageRows.map((row) => [row.tenantId, row]));
    const usersByTenant = new Map(
      userRows.map((row) => [row.tenantId, Number(row.count)]),
    );
    const sessionsByTenant = new Map(
      sessions.map((session) => [session.tenantId, session]),
    );
    const now = new Date();
    const currency = this.config.get<string>('billing.currency', 'USD');
    const pricingConfigured =
      plans.some((plan) => plan.monthlyPriceCents > 0) ||
      this.config.get<boolean>('billing.pricingConfigured', false);
    const prices = this.config.get<Record<string, number>>(
      'billing.planMonthlyCents',
      {},
    );

    const subscriptions = tenants.map((tenant) => {
      const usage = usageByTenant.get(tenant.id);
      const todayUsage = Number(usage?.todayUsage || 0);
      const periodUsage = Number(usage?.periodUsage || 0);
      const effectiveStatus = this.effectiveStatus(tenant, now);
      const endsAt = tenant.subscriptionEndsAt;
      const daysRemaining = endsAt
        ? Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)
        : null;
      const session = sessionsByTenant.get(tenant.id);
      const planName =
        tenant.billingPlan?.name ||
        tenant.plan.replace(/\b\w/g, (letter) => letter.toUpperCase());
      const planSlug = tenant.billingPlan?.slug || tenant.plan;
      const monthlyPriceCents =
        tenant.billingPlan?.monthlyPriceCents ??
        Number(prices[tenant.plan] || 0);
      const planCurrency = tenant.billingPlan?.currency || currency;

      return {
        id: tenant.id,
        companyName: tenant.companyName,
        slug: tenant.slug,
        accountStatus: tenant.status,
        plan: tenant.plan,
        subscriptionPlanId: tenant.subscriptionPlanId,
        planName,
        planSlug,
        subscriptionStatus: tenant.subscriptionStatus,
        effectiveSubscriptionStatus: effectiveStatus,
        subscriptionStartedAt: tenant.subscriptionStartedAt,
        subscriptionEndsAt: endsAt,
        subscriptionAutoRenew: tenant.subscriptionAutoRenew,
        subscriptionSuspendedAt: tenant.subscriptionSuspendedAt,
        subscriptionSuspensionReason: tenant.subscriptionSuspensionReason,
        subscriptionLastRenewedAt: tenant.subscriptionLastRenewedAt,
        daysRemaining,
        dailyMessageLimit: tenant.dailyMessageLimit,
        rateLimitPerMinute: tenant.rateLimitPerMinute,
        todayUsage,
        todayRemaining: Math.max(tenant.dailyMessageLimit - todayUsage, 0),
        dailyUsagePercent: tenant.dailyMessageLimit
          ? Math.min(
              Math.round((todayUsage / tenant.dailyMessageLimit) * 1000) / 10,
              100,
            )
          : 0,
        currentPeriodMessages: periodUsage,
        monthlyPriceCents,
        currency: planCurrency,
        activeUsers: usersByTenant.get(tenant.id) || 0,
        whatsappStatus: session?.status || 'not_connected',
      };
    });

    const recurringStatuses = new Set<SubscriptionStatus>([
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.PAST_DUE,
    ]);
    const stats = subscriptions.reduce(
      (summary, item) => {
        const effectiveStatus = item.effectiveSubscriptionStatus;
        if (effectiveStatus === SubscriptionStatus.ACTIVE) summary.active += 1;
        if (effectiveStatus === SubscriptionStatus.TRIALING)
          summary.trialing += 1;
        if (
          [
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.SUSPENDED,
            SubscriptionStatus.EXPIRED,
          ].includes(effectiveStatus)
        ) {
          summary.attention += 1;
        }
        if (
          item.daysRemaining !== null &&
          item.daysRemaining >= 0 &&
          item.daysRemaining <= 7 &&
          recurringStatuses.has(effectiveStatus)
        ) {
          summary.expiringSoon += 1;
        }
        if (
          item.accountStatus === TenantStatus.ACTIVE &&
          recurringStatuses.has(effectiveStatus)
        ) {
          summary.monthlyRecurringRevenueCents += item.monthlyPriceCents;
        }
        return summary;
      },
      {
        total: subscriptions.length,
        active: 0,
        trialing: 0,
        attention: 0,
        expiringSoon: 0,
        monthlyRecurringRevenueCents: 0,
      },
    );

    return { stats, subscriptions, currency, pricingConfigured };
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const tenant = await this.findTenant(id);
    const oldValues = this.snapshot(tenant);

    let selectedPlan: SubscriptionPlan | null = null;
    if (dto.subscriptionPlanId !== undefined) {
      selectedPlan = await this.planRepo.findOne({
        where: { id: dto.subscriptionPlanId, isActive: true },
      });
      if (!selectedPlan) {
        throw new BadRequestException(
          'The selected plan does not exist or has been archived.',
        );
      }
    } else if (dto.plan !== undefined) {
      selectedPlan = await this.planRepo.findOne({
        where: { slug: dto.plan, isActive: true },
      });
      tenant.plan = dto.plan;
    }
    if (selectedPlan) {
      tenant.subscriptionPlanId = selectedPlan.id;
      tenant.billingPlan = selectedPlan;
      if (Object.values(TenantPlan).includes(selectedPlan.slug as TenantPlan)) {
        tenant.plan = selectedPlan.slug as TenantPlan;
      }
      if (dto.dailyMessageLimit === undefined) {
        tenant.dailyMessageLimit = selectedPlan.dailyMessageLimit;
      }
      if (dto.rateLimitPerMinute === undefined) {
        tenant.rateLimitPerMinute = selectedPlan.rateLimitPerMinute;
      }
    }
    if (dto.dailyMessageLimit !== undefined) {
      tenant.dailyMessageLimit = dto.dailyMessageLimit;
    }
    if (dto.rateLimitPerMinute !== undefined) {
      tenant.rateLimitPerMinute = dto.rateLimitPerMinute;
    }
    if (dto.subscriptionAutoRenew !== undefined) {
      tenant.subscriptionAutoRenew = dto.subscriptionAutoRenew;
    }
    if (dto.subscriptionEndsAt !== undefined) {
      tenant.subscriptionEndsAt = dto.subscriptionEndsAt
        ? new Date(dto.subscriptionEndsAt)
        : null;
    }
    if (dto.subscriptionStatus !== undefined) {
      tenant.subscriptionStatus = dto.subscriptionStatus;
      if (dto.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
        tenant.subscriptionSuspendedAt = new Date();
        tenant.subscriptionSuspensionReason =
          dto.suspensionReason?.trim() ||
          'Suspended by a platform administrator';
      } else {
        tenant.subscriptionSuspendedAt = null;
        tenant.subscriptionSuspensionReason = null;
      }
    }

    const saved = await this.tenantRepo.save(tenant);
    if (getTenantAccessDenial(saved)) {
      await this.revokeTenantRefreshTokens(id);
    }
    return { tenant: saved, oldValues, newValues: this.snapshot(saved) };
  }

  async renew(id: string, dto: RenewSubscriptionDto) {
    const tenant = await this.findTenant(id);
    const oldValues = this.snapshot(tenant);
    const now = new Date();
    const base =
      tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > now
        ? tenant.subscriptionEndsAt
        : now;
    tenant.subscriptionEndsAt = this.addMonths(base, dto.months || 1);
    tenant.subscriptionStatus = SubscriptionStatus.ACTIVE;
    tenant.subscriptionStartedAt ||= now;
    tenant.subscriptionLastRenewedAt = now;
    tenant.subscriptionSuspendedAt = null;
    tenant.subscriptionSuspensionReason = null;
    const saved = await this.tenantRepo.save(tenant);
    return { tenant: saved, oldValues, newValues: this.snapshot(saved) };
  }

  async suspend(id: string, dto: SuspendSubscriptionDto) {
    const tenant = await this.findTenant(id);
    const oldValues = this.snapshot(tenant);
    tenant.subscriptionStatus = SubscriptionStatus.SUSPENDED;
    tenant.subscriptionSuspendedAt = new Date();
    tenant.subscriptionSuspensionReason =
      dto.reason?.trim() || 'Suspended by a platform administrator';
    const saved = await this.tenantRepo.save(tenant);
    await this.revokeTenantRefreshTokens(id);
    return { tenant: saved, oldValues, newValues: this.snapshot(saved) };
  }

  async resume(id: string) {
    const tenant = await this.findTenant(id);
    if (
      tenant.subscriptionEndsAt &&
      tenant.subscriptionEndsAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'This subscription period has ended. Renew it before resuming service.',
      );
    }
    const oldValues = this.snapshot(tenant);
    tenant.subscriptionStatus = SubscriptionStatus.ACTIVE;
    tenant.subscriptionSuspendedAt = null;
    tenant.subscriptionSuspensionReason = null;
    const saved = await this.tenantRepo.save(tenant);
    return { tenant: saved, oldValues, newValues: this.snapshot(saved) };
  }

  private effectiveStatus(tenant: Tenant, now: Date): SubscriptionStatus {
    if (
      tenant.subscriptionEndsAt &&
      tenant.subscriptionEndsAt <= now &&
      ![SubscriptionStatus.CANCELLED, SubscriptionStatus.SUSPENDED].includes(
        tenant.subscriptionStatus,
      )
    ) {
      return SubscriptionStatus.EXPIRED;
    }
    return tenant.subscriptionStatus;
  }

  private async findTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({
      where: { id },
      relations: ['billingPlan'],
    });
    if (!tenant) throw new NotFoundException('Organization not found.');
    return tenant;
  }

  private snapshot(tenant: Tenant) {
    return {
      plan: tenant.plan,
      subscriptionPlanId: tenant.subscriptionPlanId,
      planName: tenant.billingPlan?.name || tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionStartedAt: tenant.subscriptionStartedAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      subscriptionAutoRenew: tenant.subscriptionAutoRenew,
      subscriptionSuspendedAt: tenant.subscriptionSuspendedAt,
      subscriptionSuspensionReason: tenant.subscriptionSuspensionReason,
      subscriptionLastRenewedAt: tenant.subscriptionLastRenewedAt,
      dailyMessageLimit: tenant.dailyMessageLimit,
      rateLimitPerMinute: tenant.rateLimitPerMinute,
    };
  }

  private async revokeTenantRefreshTokens(tenantId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ isRevoked: true })
      .where('user_id IN (SELECT id FROM users WHERE tenant_id = :tenantId)', {
        tenantId,
      })
      .execute();
  }

  private addMonths(value: Date, months: number): Date {
    const result = new Date(value);
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + months);
    const lastDay = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
    ).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
  }
}
