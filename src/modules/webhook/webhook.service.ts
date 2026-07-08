import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Webhook } from '../../database/entities/webhook.entity';
import { WebhookDeliveryLog } from '../../database/entities/webhook-delivery-log.entity';
import {
  createHmacSignature,
  generateRandomHex,
} from '../../common/utils/crypto.util';
import { QueueService } from '../../shared/queue/queue.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDeliveryLog)
    private readonly logRepo: Repository<WebhookDeliveryLog>,
    private readonly queueService: QueueService,
  ) {}

  async register(
    tenantId: string,
    url: string,
    events?: string[],
    secret?: string,
  ) {
    const existing = await this.webhookRepo.findOne({ where: { tenantId } });
    const webhookSecret = secret || generateRandomHex(32);

    if (existing) {
      Object.assign(existing, {
        url,
        events: events || ['*'],
        secret: webhookSecret,
      });
      return this.webhookRepo.save(existing);
    }

    return this.webhookRepo.save({
      tenantId,
      url,
      secret: webhookSecret,
      events: events || ['*'],
    });
  }

  async getConfig(tenantId: string) {
    return this.webhookRepo.findOne({ where: { tenantId } });
  }

  async remove(tenantId: string) {
    await this.webhookRepo.delete({ tenantId });
  }

  async dispatch(tenantId: string, event: string, data: any): Promise<void> {
    const webhook = await this.webhookRepo.findOne({
      where: { tenantId, isActive: true },
    });
    if (!webhook) return;

    if (!webhook.events.includes('*') && !webhook.events.includes(event))
      return;

    // Enqueue for async dispatch
    await this.queueService.enqueue('webhook.dispatch', {
      webhookId: webhook.id,
      tenantId,
      event,
      data,
    });
  }

  async executeDispatch(
    webhookId: string,
    event: string,
    data: any,
  ): Promise<void> {
    const webhook = await this.webhookRepo.findOne({
      where: { id: webhookId },
    });
    if (!webhook || !webhook.isActive) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      tenantId: webhook.tenantId,
      data,
    };

    const signature = createHmacSignature(
      JSON.stringify(payload),
      webhook.secret,
    );

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        timeout: 10_000,
      });

      await this.logRepo.save({
        webhookId: webhook.id,
        eventType: event,
        payload,
        httpStatus: response.status,
        success: true,
      });

      await this.webhookRepo.update(webhook.id, {
        failureCount: 0,
        lastSuccessAt: new Date(),
      });
    } catch (error: any) {
      const failureCount = webhook.failureCount + 1;

      await this.logRepo.save({
        webhookId: webhook.id,
        eventType: event,
        payload,
        httpStatus: error.response?.status || null,
        success: false,
        errorMessage: error.message,
      });

      await this.webhookRepo.update(webhook.id, {
        failureCount,
        lastFailureAt: new Date(),
        ...(failureCount >= 10 && { isActive: false }),
      });

      this.logger.warn(
        `Webhook delivery failed for tenant ${webhook.tenantId}: ${error.message}`,
      );
    }
  }
}
