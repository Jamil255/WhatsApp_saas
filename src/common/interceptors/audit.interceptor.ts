import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    // Only audit mutating operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          this.auditRepo
            .save({
              tenantId: user?.tenantId || null,
              userId: user?.id || null,
              action: `${method} ${url}`,
              resourceType: this.extractResourceType(url),
              resourceId: responseData?.data?.id || null,
              newValues: responseData?.data || null,
              ipAddress: ip,
              userAgent: headers['user-agent'] || null,
            })
            .catch(() => {}); // Non-blocking
        },
      }),
    );
  }

  private extractResourceType(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[1] || parts[0] || 'unknown';
  }
}
