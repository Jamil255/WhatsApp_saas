import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, SubscriptionPlan, RefreshToken]),
    AuthModule,
    AdminModule,
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
