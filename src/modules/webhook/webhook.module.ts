import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from '../../database/entities/webhook.entity';
import { WebhookDeliveryLog } from '../../database/entities/webhook-delivery-log.entity';
import { ApiCredential } from '../../database/entities/api-credential.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Webhook,
      WebhookDeliveryLog,
      ApiCredential,
      Tenant,
    ]),
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
