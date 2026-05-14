import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QueueService } from '../../shared/queue/queue.service';
import { Message } from '../../database/entities/message.entity';
import { MessageStatusLog } from '../../database/entities/message-status-log.entity';
import { Template } from '../../database/entities/template.entity';
import {
  MessageStatus,
  MessageType,
  MessageDirection,
} from '../../common/enums';
import { SessionManagerService } from '../../modules/whatsapp/session/session-manager.service';
import { WebhookService } from '../../modules/webhook/webhook.service';
import { toWhatsAppJid, fromWhatsAppJid } from '../../common/utils/phone.util';
import { chunkArray } from '../../common/utils/chunk.util';
import { sleep } from '../../common/utils/retry.util';

@Injectable()
export class MessageWorkerService implements OnModuleInit {
  private readonly logger = new Logger(MessageWorkerService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageStatusLog)
    private readonly statusLogRepo: Repository<MessageStatusLog>,
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    private readonly dataSource: DataSource,
    private readonly queueService: QueueService,
    private readonly sessionManager: SessionManagerService,
    private readonly webhookService: WebhookService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.work('message.send', {}, async (job: any) => {
      const { messageId, tenantId } = job.data;
      this.logger.log(`Processing message ${messageId} for tenant ${tenantId}`);
      await this.processMessage(messageId, tenantId);
    });

    await this.queueService.work('message.bulk', {}, async (job: any) => {
      await this.processBulk(job.data);
    });

    await this.queueService.work(
      'message.status.update',
      {},
      async (job: any) => {
        await this.processStatusUpdate(job.data);
      },
    );

    await this.queueService.work('incoming.message', {}, async (job: any) => {
      await this.processIncoming(job.data);
    });

    await this.queueService.work('webhook.dispatch', {}, async (job: any) => {
      const { webhookId, event, data } = job.data;
      this.logger.log(`Dispatching webhook ${event} for webhook ${webhookId}`);
      await this.webhookService.executeDispatch(webhookId, event, data);
    });

    this.logger.log('Message workers registered.');
  }

  private async processMessage(
    messageId: string,
    tenantId: string,
  ): Promise<void> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message || message.status === MessageStatus.SENT) return;

    try {
      await this.updateStatus(messageId, MessageStatus.PROCESSING, 'worker');

      const sock = this.sessionManager.get(tenantId);
      if (!sock) throw new Error('No active socket for tenant');

      const jid = toWhatsAppJid(message.toNumber);
      let result: any;

      switch (message.messageType) {
        case MessageType.TEXT:
        case MessageType.OTP:
          result = await sock.sendMessage(jid, { text: message.body });
          break;
        case MessageType.IMAGE:
          result = await sock.sendMessage(jid, {
            image: { url: message.mediaMetadata?.url },
            caption: message.body || undefined,
          });
          break;
        case MessageType.VIDEO:
          result = await sock.sendMessage(jid, {
            video: { url: message.mediaMetadata?.url },
            caption: message.body || undefined,
          });
          break;
        case MessageType.DOCUMENT:
          result = await sock.sendMessage(jid, {
            document: { url: message.mediaMetadata?.url },
            fileName: message.mediaMetadata?.fileName || 'document',
            mimetype: message.mediaMetadata?.mimeType,
          });
          break;
        case MessageType.AUDIO:
          result = await sock.sendMessage(jid, {
            audio: { url: message.mediaMetadata?.url },
            mimetype: 'audio/ogg; codecs=opus',
          });
          break;
        case MessageType.TEMPLATE:
          let body = message.body || '';
          if (message.templateId) {
            const tpl = await this.templateRepo.findOne({
              where: { id: message.templateId },
            });
            if (tpl && message.templateVariables) {
              body = tpl.body;
              for (const [key, val] of Object.entries(
                message.templateVariables,
              )) {
                body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
              }
            }
          }
          result = await sock.sendMessage(jid, { text: body });
          break;
      }

      await this.messageRepo.update(messageId, {
        status: MessageStatus.SENT,
        sentAt: new Date(),
        whatsappMessageId: result?.key?.id || null,
      });

      await this.updateStatus(messageId, MessageStatus.SENT, 'worker', {
        waMessageId: result?.key?.id,
      });

      await this.webhookService.dispatch(tenantId, 'message.sent', {
        messageId,
        to: message.toNumber,
        status: 'sent',
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to send message ${messageId}: ${error.message}`,
      );

      await this.messageRepo.update(messageId, {
        status: MessageStatus.FAILED,
        failedAt: new Date(),
        errorReason: error.message,
      });

      await this.updateStatus(messageId, MessageStatus.FAILED, 'worker', {
        error: error.message,
      });

      await this.webhookService.dispatch(tenantId, 'message.failed', {
        messageId,
        to: message.toNumber,
        error: error.message,
      });

      throw error;
    }
  }

  private async processBulk(data: any): Promise<void> {
    const {
      tenantId,
      batchId,
      recipients,
      body,
      messageType,
      templateId,
      variables,
      batchDelay,
    } = data;
    const chunks = chunkArray(recipients, 50);

    for (const chunk of chunks) {
      for (let i = 0; i < chunk.length; i++) {
        const recipient = chunk[i];
        const vars = Array.isArray(variables) ? variables[i] : variables;

        const message = await this.messageRepo.save({
          tenantId,
          toNumber: recipient,
          body: messageType === 'text' ? body : null,
          messageType:
            messageType === 'template'
              ? MessageType.TEMPLATE
              : MessageType.TEXT,
          templateId: templateId || null,
          templateVariables: vars || null,
          status: MessageStatus.QUEUED,
          direction: MessageDirection.OUTBOUND,
          batchId,
          queuedAt: new Date(),
        } as any);

        await this.statusLogRepo.save({
          messageId: message.id,
          status: MessageStatus.QUEUED,
          source: 'bulk_worker',
        });

        await this.queueService.enqueue(
          'message.send',
          {
            messageId: message.id,
            tenantId,
          },
          { retryLimit: 3, retryDelay: 5000, retryBackoff: true },
        );

        await sleep(batchDelay || 500);
      }
    }
  }

  private async processStatusUpdate(data: any): Promise<void> {
    const { tenantId, waMessageId, status } = data;
    if (!waMessageId || !status) return;

    const statusMap: Record<number, MessageStatus> = {
      2: MessageStatus.SENT,
      3: MessageStatus.DELIVERED,
      4: MessageStatus.READ,
    };

    const newStatus = statusMap[status];
    if (!newStatus) return;

    const message = await this.messageRepo.findOne({
      where: { whatsappMessageId: waMessageId, tenantId },
    });
    if (!message) return;

    const updateData: any = { status: newStatus };
    if (newStatus === MessageStatus.DELIVERED)
      updateData.deliveredAt = new Date();
    if (newStatus === MessageStatus.READ) updateData.readAt = new Date();

    await this.messageRepo.update(message.id, updateData);
    await this.updateStatus(message.id, newStatus, 'baileys_event');

    await this.webhookService.dispatch(tenantId, `message.${newStatus}`, {
      messageId: message.id,
      to: message.toNumber,
      status: newStatus,
    });
  }

  private async processIncoming(data: any): Promise<void> {
    const { tenantId, messages } = data;

    for (const msg of messages) {
      if (msg.key?.fromMe) continue;

      const from = fromWhatsAppJid(msg.key?.remoteJid || '');
      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '[media]';

      const message = await this.messageRepo.save({
        tenantId,
        fromNumber: from,
        toNumber: '',
        body,
        direction: MessageDirection.INBOUND,
        messageType: MessageType.TEXT,
        status: MessageStatus.DELIVERED,
        whatsappMessageId: msg.key?.id,
      } as any);

      await this.webhookService.dispatch(tenantId, 'message.incoming', {
        messageId: message.id,
        from,
        body,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async updateStatus(
    messageId: string,
    status: MessageStatus,
    source: string,
    metadata?: any,
  ): Promise<void> {
    await this.statusLogRepo.save({ messageId, status, source, metadata });
  }
}
