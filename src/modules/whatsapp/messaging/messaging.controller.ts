import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { ActiveSessionGuard } from '../../../common/guards/active-session.guard';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { MessageService } from './message.service';
import {
  SendMessageDto,
  SendOtpDto,
  SendMediaDto,
  SendTemplateMessageDto,
  SendBulkDto,
} from './dto/send-message.dto';

@ApiTags('Messaging')
@ApiSecurity('X-Client-Id')
@ApiSecurity('X-Api-Secret')
@Controller('messaging')
@UseGuards(ApiKeyGuard)
export class MessagingController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send-message')
  @UseGuards(ActiveSessionGuard, RateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send text message',
    description:
      'Send a text message to a WhatsApp number. The message is queued and processed asynchronously.',
  })
  @ApiResponse({ status: 201, description: 'Message queued for delivery' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(tenantId, dto);
  }

  @Post('send-otp')
  @UseGuards(ActiveSessionGuard, RateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send OTP',
    description:
      'Send a one-time password via WhatsApp. Auto-generates a 6-digit OTP if not provided.',
  })
  @ApiResponse({ status: 201, description: 'OTP message queued' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendOtp(@CurrentTenant() tenantId: string, @Body() dto: SendOtpDto) {
    return this.messageService.sendOtp(tenantId, dto);
  }

  @Post('send-media')
  @UseGuards(ActiveSessionGuard, RateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send media message',
    description: 'Send image, video, document, or audio file via WhatsApp.',
  })
  @ApiResponse({ status: 201, description: 'Media message queued' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid media URL',
  })
  @ApiResponse({ status: 401, description: 'Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendMedia(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendMediaDto,
  ) {
    return this.messageService.sendMedia(tenantId, dto);
  }

  @Post('send-template')
  @UseGuards(ActiveSessionGuard, RateLimitGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send template message',
    description:
      'Send a pre-defined template message with variable substitution.',
  })
  @ApiResponse({ status: 201, description: 'Template message queued' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or template not found',
  })
  @ApiResponse({ status: 401, description: 'Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendTemplate(
    @CurrentTenant() tenantId: string,
    @Body() dto: SendTemplateMessageDto,
  ) {
    return this.messageService.sendTemplate(tenantId, dto);
  }

  @Post('send-bulk')
  @UseGuards(ActiveSessionGuard, RateLimitGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Send bulk messages',
    description:
      'Send messages to multiple recipients (up to 10,000). Processed asynchronously with configurable delay.',
  })
  @ApiResponse({ status: 202, description: 'Bulk job accepted and queued' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendBulk(@CurrentTenant() tenantId: string, @Body() dto: SendBulkDto) {
    return this.messageService.sendBulk(tenantId, dto);
  }

  @Get('messages')
  @ApiOperation({
    summary: 'List messages',
    description: 'Retrieve paginated list of messages for the tenant.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Items per page',
  })
  @ApiResponse({ status: 200, description: 'Paginated message list' })
  @ApiResponse({ status: 401, description: 'Invalid API credentials' })
  async getMessages(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messageService.getMessages(tenantId, page || 1, limit || 20);
  }

  @Get('messages/:id')
  @ApiOperation({
    summary: 'Get message details',
    description: 'Retrieve a specific message with full status log history.',
  })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({ status: 200, description: 'Message details with status logs' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessageById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.messageService.getMessageById(tenantId, id);
  }
}
