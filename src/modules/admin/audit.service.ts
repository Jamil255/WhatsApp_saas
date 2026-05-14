import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

export interface AuditPayload {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(payload: AuditPayload): Promise<void> {
    try {
      await this.auditRepo.save({
        tenantId: payload.tenantId || null,
        userId: payload.userId || null,
        action: payload.action,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId || null,
        oldValues: payload.oldValues || null,
        newValues: payload.newValues || null,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      });
    } catch (err: any) {
      this.logger.warn(`Audit log failed: ${err.message}`);
    }
  }
}
