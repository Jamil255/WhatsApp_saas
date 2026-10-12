import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageWorkerService } from './processors/message-worker.service';
import { Message } from '../database/entities/message.entity';
import { MessageStatusLog } from '../database/entities/message-status-log.entity';
import { Template } from '../database/entities/template.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { WhatsAppModule } from '../modules/whatsapp/whatsapp.module';
import { WebhookModule } from '../modules/webhook/webhook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageStatusLog, Template, Tenant]),
    WhatsAppModule,
    WebhookModule,
  ],
  providers: [MessageWorkerService],
})
export class JobsModule {}
