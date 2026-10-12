import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

@Injectable()
export class AdminPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async list() {
    const [plans, assignmentRows] = await Promise.all([
      this.planRepo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } }),
      this.tenantRepo
        .createQueryBuilder('tenant')
        .select('tenant.subscription_plan_id', 'planId')
        .addSelect('COUNT(tenant.id)', 'count')
        .where('tenant.subscription_plan_id IS NOT NULL')
        .groupBy('tenant.subscription_plan_id')
        .getRawMany<{ planId: string; count: string }>(),
    ]);
    const assignments = new Map(
      assignmentRows.map((row) => [row.planId, Number(row.count)]),
    );
    return plans.map((plan) => ({
      ...plan,
      organizationCount: assignments.get(plan.id) || 0,
    }));
  }

  async create(dto: CreatePlanDto) {
    const name = dto.name.trim();
    const slug = dto.slug?.trim() || this.slugify(name);
    if (!slug)
      throw new BadRequestException(
        'Plan name must contain letters or numbers.',
      );
    await this.assertUniqueSlug(slug);
    const plan = this.planRepo.create({
      name,
      slug,
      description: dto.description?.trim() || null,
      monthlyPriceCents: dto.monthlyPriceCents,
      trialDays: dto.trialDays ?? 14,
      currency: (dto.currency || 'USD').toUpperCase(),
      dailyMessageLimit: dto.dailyMessageLimit,
      rateLimitPerMinute: dto.rateLimitPerMinute,
      isActive: dto.isActive ?? true,
      isPublic: dto.isPublic ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.planRepo.save(plan);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.findOne(id);
    const oldValues = this.snapshot(plan);
    if (dto.name !== undefined) plan.name = dto.name.trim();
    if (dto.slug !== undefined) {
      const slug = dto.slug.trim();
      await this.assertUniqueSlug(slug, id);
      plan.slug = slug;
    }
    if (dto.description !== undefined) {
      plan.description = dto.description.trim() || null;
    }
    if (dto.monthlyPriceCents !== undefined) {
      plan.monthlyPriceCents = dto.monthlyPriceCents;
    }
    if (dto.trialDays !== undefined) {
      plan.trialDays = dto.trialDays;
    }
    if (dto.currency !== undefined) {
      plan.currency = dto.currency.toUpperCase();
    }
    if (dto.dailyMessageLimit !== undefined) {
      plan.dailyMessageLimit = dto.dailyMessageLimit;
    }
    if (dto.rateLimitPerMinute !== undefined) {
      plan.rateLimitPerMinute = dto.rateLimitPerMinute;
    }
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;
    if (dto.isPublic !== undefined) plan.isPublic = dto.isPublic;
    if (dto.sortOrder !== undefined) plan.sortOrder = dto.sortOrder;
    const saved = await this.planRepo.save(plan);
    if (dto.syncAssignedLimits) {
      await this.tenantRepo.update(
        { subscriptionPlanId: id },
        {
          dailyMessageLimit: saved.dailyMessageLimit,
          rateLimitPerMinute: saved.rateLimitPerMinute,
        },
      );
    }
    return { plan: saved, oldValues, newValues: this.snapshot(saved) };
  }

  async findOne(id: string) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found.');
    return plan;
  }

  snapshot(plan: SubscriptionPlan) {
    return {
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      monthlyPriceCents: plan.monthlyPriceCents,
      trialDays: plan.trialDays,
      currency: plan.currency,
      dailyMessageLimit: plan.dailyMessageLimit,
      rateLimitPerMinute: plan.rateLimitPerMinute,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      sortOrder: plan.sortOrder,
    };
  }

  private async assertUniqueSlug(slug: string, excludingId?: string) {
    const existing = await this.planRepo.findOne({
      where: excludingId ? { slug, id: Not(excludingId) } : { slug },
    });
    if (existing) {
      throw new ConflictException(`A plan with slug "${slug}" already exists.`);
    }
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
