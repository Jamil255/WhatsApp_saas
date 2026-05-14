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
    if (!tenant) return true;

    // Check per-minute rate limit
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentCount = await this.messageRepo.count({
      where: {
        tenantId,
        createdAt: MoreThan(oneMinuteAgo),
      },
    });

    if (recentCount >= tenant.rateLimitPerMinute) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${tenant.rateLimitPerMinute} messages per minute.`,
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
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
        createdAt: MoreThan(startOfDay),
      },
    });

    if (dailyCount >= tenant.dailyMessageLimit) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'DAILY_LIMIT_EXCEEDED',
            message: `Daily message limit exceeded. Maximum ${tenant.dailyMessageLimit} messages per day.`,
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
