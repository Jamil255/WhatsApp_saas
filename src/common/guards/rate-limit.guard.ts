import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { Message } from '../../database/entities/message.entity';
import { MessageDirection } from '../enums';
import { getTenantAccessDenial } from '../utils/tenant-access.util';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId || request.tenantId;

    if (!tenantId) return true;

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const denial = getTenantAccessDenial(tenant);
    if (denial) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: denial.code,
            message: denial.message,
            statusCode: denial.statusCode,
          },
        },
        denial.statusCode,
      );
    }
    if (!tenant) return false;

    const requestedMessages = Array.isArray(request.body?.recipients)
      ? Math.max(new Set(request.body.recipients).size, 1)
      : 1;

    // Check per-minute rate limit
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentCount = await this.messageRepo.count({
      where: {
        tenantId,
        direction: MessageDirection.OUTBOUND,
        createdAt: MoreThan(oneMinuteAgo),
      },
    });

    if (recentCount + requestedMessages > tenant.rateLimitPerMinute) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Your workspace has reached its plan limit of ${tenant.rateLimitPerMinute} message${tenant.rateLimitPerMinute === 1 ? '' : 's'} per minute.`,
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            retryAfterSeconds: 60,
            limit: tenant.rateLimitPerMinute,
            used: recentCount,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dailyCount = await this.messageRepo.count({
      where: {
        tenantId,
        direction: MessageDirection.OUTBOUND,
        createdAt: MoreThan(startOfDay),
      },
    });

    if (dailyCount + requestedMessages > tenant.dailyMessageLimit) {
      const nextDay = new Date();
      nextDay.setHours(24, 0, 0, 0);
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'DAILY_LIMIT_EXCEEDED',
            message: `Your workspace has reached its daily plan limit of ${tenant.dailyMessageLimit} message${tenant.dailyMessageLimit === 1 ? '' : 's'}.`,
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((nextDay.getTime() - Date.now()) / 1000),
            ),
            limit: tenant.dailyMessageLimit,
            used: dailyCount,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
