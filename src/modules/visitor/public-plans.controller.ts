import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';

@ApiTags('Public')
@Controller('public')
export class PublicPlansController {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List active plans shown on the public website' })
  @ApiResponse({ status: 200, description: 'Public subscription plans' })
  async listPlans() {
    const plans = await this.planRepo.find({
      where: { isActive: true, isPublic: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      monthlyPriceCents: plan.monthlyPriceCents,
      currency: plan.currency,
      trialDays: plan.trialDays,
      dailyMessageLimit: plan.dailyMessageLimit,
      rateLimitPerMinute: plan.rateLimitPerMinute,
    }));
  }
}
