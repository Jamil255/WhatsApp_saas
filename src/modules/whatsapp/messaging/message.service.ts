import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  MessageDirection,
  MessageStatus,
  MessageType,
} from '../../../common/enums';
import { generateOtp } from '../../../common/utils/crypto.util';
import { normalizeE164 } from '../../../common/utils/phone.util';
import { MessageStatusLog } from '../../../database/entities/message-status-log.entity';
import { Message } from '../../../database/entities/message.entity';
import { QueueService } from '../../../shared/queue/queue.service';
import {
  SendBulkDto,
  SendMediaDto,
  SendMessageDto,
  SendOtpDto,
  SendTemplateMessageDto,
} from './dto/send-message.dto';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageStatusLog)
    private readonly statusLogRepo: Repository<MessageStatusLog>,
    private readonly dataSource: DataSource,
    private readonly queueService: QueueService,
  ) {}

  async sendMessage(tenantId: string, dto: SendMessageDto) {
    const message = await this.createAndEnqueue(tenantId, {
      toNumber: normalizeE164(dto.to),
      body: dto.body,
      messageType: dto.messageType || MessageType.TEXT,
    });
    return this.toResponse(message);
  }

  async sendOtp(tenantId: string, dto: SendOtpDto) {
    const otp = dto.otp || generateOtp();
    const body = `Your verification code is: ${otp}. Valid for ${dto.expiryMinutes || 5} minutes.`;

    const message = await this.createAndEnqueue(tenantId, {
      toNumber: normalizeE164(dto.to),
      body,
      messageType: MessageType.OTP,
      templateId: dto.templateId || null,
    });

    return {
      ...this.toResponse(message),
      otp,
      expiresAt: new Date(Date.now() + (dto.expiryMinutes || 5) * 60_000),
    };
  }

  async sendMedia(tenantId: string, dto: SendMediaDto) {
    const message = await this.createAndEnqueue(tenantId, {
      toNumber: normalizeE164(dto.to),
      body: dto.caption || null,
      messageType: dto.mediaType as any,
      mediaMetadata: {
        url: dto.mediaUrl,
        mediaType: dto.mediaType,
        fileName: dto.filename,
      },
    });
    return this.toResponse(message);
  }

  async sendTemplate(tenantId: string, dto: SendTemplateMessageDto) {
    const message = await this.createAndEnqueue(tenantId, {
      toNumber: normalizeE164(dto.to),
      messageType: MessageType.TEMPLATE,
      templateId: dto.templateId,
      templateVariables: dto.variables || null,
    });
    return this.toResponse(message);
  }

  async sendBulk(tenantId: string, dto: SendBulkDto) {
    const batchId = `batch_${uuidv4()}`;
    const recipients = [...new Set(dto.recipients)]; // deduplicate

    // Enqueue as a single bulk job — worker will chunk and process
    await this.queueService.enqueue('message.bulk', {
      tenantId,
      batchId,
      recipients,
      body: dto.body,
      messageType: dto.messageType,
      templateId: dto.templateId,
      variables: dto.variables,
      batchDelay: dto.batchDelay || 500,
    });

    return {
      batchId,
      totalRecipients: recipients.length,
      status: 'queued',
      estimatedCompletionSeconds: Math.ceil(
        (recipients.length * (dto.batchDelay || 500)) / 1000,
      ),
    };
  }

  async getMessages(tenantId: string, page = 1, limit = 20) {
    const [messages, total] = await this.messageRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { messages, total, page, limit };
  }

  async getMessageById(tenantId: string, messageId: string) {
    return this.messageRepo.findOne({
      where: { id: messageId, tenantId },
      relations: ['statusLogs'],
    });
  }

  /* 
  @description: create and enqueue message
  @param: tenantId, data
  @returns: Promise<Message>
  */

  private async createAndEnqueue(
    tenantId: string,
    data: Partial<Message>,
  ): Promise<Message> {
    let message: Message;

    await this.dataSource.transaction(async (manager) => {
      message = await manager.save(Message, {
        tenantId,
        ...data,
        status: MessageStatus.QUEUED,
        direction: MessageDirection.OUTBOUND,
        queuedAt: new Date(),
      });

      await manager.save(MessageStatusLog, {
        messageId: message.id,
        status: MessageStatus.QUEUED,
        source: 'api',
      });
    });

    await this.queueService.enqueue(
      'message.send',
      {
        messageId: message!.id,
        tenantId,
      },
      {
        retryLimit: 3,
        retryDelay: 5000,
        retryBackoff: true,
        expireInSeconds: 1800,
      },
    );

    return message!;
  }

  /**
   * @description:
   *
   * @param: message
   * @returns: Promise<Message>
   */
  private toResponse(message: Message) {
    return {
      messageId: message.id,
      to: message.toNumber,
      status: message.status,
      queuedAt: message.queuedAt,
    };
  }
}
