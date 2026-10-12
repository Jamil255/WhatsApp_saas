import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { ApiCredential, Message, Template, Tenant, User, Webhook, WhatsAppSession, WhatsAppSessionKey } from '../../database/entities';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, Message, Template, Webhook, WhatsAppSession, WhatsAppSessionKey, ApiCredential]), WhatsAppModule, WebhookModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
