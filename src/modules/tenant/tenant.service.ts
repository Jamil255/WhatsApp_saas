import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { PasswordService } from '../auth/password.service';
import { ApiKeyService, ApiKeyPair } from '../auth/api-key.service';
import {
  Role,
  SubscriptionStatus,
  TenantPlan,
  TenantStatus,
} from '../../common/enums';
import { CreateTenantDto, UpdateTenantDto } from './dto/create-tenant.dto';
import { randomBytes } from 'crypto';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async create(
    dto: CreateTenantDto,
  ): Promise<{ tenant: Tenant; adminPassword: string; apiKeys: ApiKeyPair }> {
    // Check if email already exists
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        `User with email ${dto.adminEmail} already exists.`,
      );
    }

    const slug = dto.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const existingTenant = await this.tenantRepo.findOne({ where: { slug } });
    if (existingTenant) {
      throw new ConflictException(`Tenant with slug "${slug}" already exists.`);
    }

    // Generate temporary password for admin
    const adminPassword = randomBytes(8).toString('hex');
    const passwordHash = await this.passwordService.hash(adminPassword);

    let tenant: Tenant;
    let apiKeys: ApiKeyPair;
    const plan = dto.plan || TenantPlan.STARTER;
    const limits = {
      [TenantPlan.STARTER]: { daily: 1_000, perMinute: 60 },
      [TenantPlan.PROFESSIONAL]: { daily: 10_000, perMinute: 300 },
      [TenantPlan.ENTERPRISE]: { daily: 100_000, perMinute: 1_000 },
    }[plan];
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setUTCMonth(subscriptionEndsAt.getUTCMonth() + 1);
    const billingPlan = dto.subscriptionPlanId
      ? await this.planRepo.findOne({
          where: { id: dto.subscriptionPlanId, isActive: true },
        })
      : await this.planRepo.findOne({
          where: { slug: plan, isActive: true },
        });
    if (dto.subscriptionPlanId && !billingPlan) {
      throw new BadRequestException(
        'The selected subscription plan does not exist or is archived.',
      );
    }

    // Transactional provisioning
    await this.dataSource.transaction(async (manager) => {
      tenant = await manager.save(Tenant, {
        companyName: dto.companyName,
        slug,
        plan,
        subscriptionPlanId: billingPlan?.id || null,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionStartedAt: new Date(),
        subscriptionEndsAt,
        dailyMessageLimit: billingPlan?.dailyMessageLimit || limits.daily,
        rateLimitPerMinute: billingPlan?.rateLimitPerMinute || limits.perMinute,
      });

      await manager.save(User, {
        tenantId: tenant.id,
        name: dto.adminName,
        email: dto.adminEmail,
        passwordHash,
        role: Role.TENANT_ADMIN,
      });
    });

    // Generate API keys (outside transaction — separate table)
    apiKeys = await this.apiKeyService.generateKeyPair(tenant!.id);

    return { tenant: tenant!, adminPassword, apiKeys };
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found.');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async suspend(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.status = TenantStatus.SUSPENDED;
    const saved = await this.tenantRepo.save(tenant);
    await this.revokeTenantRefreshTokens(id);
    return saved;
  }

  async activate(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.status = TenantStatus.ACTIVE;
    return this.tenantRepo.save(tenant);
  }

  async softDelete(id: string): Promise<void> {
    await this.revokeTenantRefreshTokens(id);
    await this.tenantRepo.softDelete(id);
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
}
