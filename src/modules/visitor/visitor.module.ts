import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitor } from '../../database/entities/visitor.entity';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { PublicPlansController } from './public-plans.controller';
import { VisitorController } from './visitor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor, SubscriptionPlan])],
  controllers: [VisitorController, PublicPlansController],
})
export class VisitorModule {}
