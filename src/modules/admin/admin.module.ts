import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AuditService } from './audit.service';
import { Tenant } from '../../database/entities/tenant.entity';
import { Message } from '../../database/entities/message.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { User } from '../../database/entities/user.entity';
import { Visitor } from '../../database/entities/visitor.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { PasswordService } from '../auth/password.service';
import { AdminUsersService } from './admin-users.service';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { AdminPlansService } from './admin-plans.service';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Message,
      AuditLog,
      WhatsAppSession,
      User,
      Visitor,
      RefreshToken,
      SubscriptionPlan,
    ]),
    WhatsAppModule,
  ],
  controllers: [AdminController],
  providers: [
    AuditService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminPlansService,
    PasswordService,
  ],
  exports: [AuditService],
})
export class AdminModule {}
