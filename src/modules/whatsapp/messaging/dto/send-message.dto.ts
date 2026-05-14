import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
  IsUrl,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../../../common/enums';

export class SendMessageDto {
  @ApiProperty({
    example: '+923001234567',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +923001234567)',
  })
  to: string;

  @ApiProperty({
    example: 'Hello from WhatsApp SaaS!',
    description: 'Message body text',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    enum: MessageType,
    default: MessageType.TEXT,
    description: 'Message type',
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType = MessageType.TEXT;
}

export class SendOtpDto {
  @ApiProperty({
    example: '+923001234567',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  to: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'OTP code (4-8 digits). Auto-generated if not provided',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'OTP must be 4-8 digits' })
  otp?: string;

  @ApiPropertyOptional({ description: 'Template ID to use for OTP message' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 30,
    description: 'OTP expiry in minutes',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiryMinutes?: number = 5;
}

export class SendMediaDto {
  @ApiProperty({
    example: '+923001234567',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  to: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Public URL of the media file',
  })
  @IsUrl()
  mediaUrl: string;

  @ApiProperty({
    enum: ['image', 'video', 'document', 'audio'],
    description: 'Type of media being sent',
  })
  @IsEnum(['image', 'video', 'document', 'audio'] as const)
  mediaType: 'image' | 'video' | 'document' | 'audio';

  @ApiPropertyOptional({
    example: 'Check this out!',
    description: 'Media caption',
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({
    example: 'report.pdf',
    description: 'Filename for documents',
  })
  @IsOptional()
  @IsString()
  filename?: string;
}

export class SendTemplateMessageDto {
  @ApiProperty({
    example: '+923001234567',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  to: string;

  @ApiProperty({ description: 'Template UUID to use' })
  @IsUUID()
  templateId: string;

  @ApiPropertyOptional({
    example: { name: 'John', code: '1234' },
    description: 'Template variable substitutions',
  })
  @IsOptional()
  variables?: Record<string, string>;
}

export class SendBulkDto {
  @ApiProperty({
    example: ['+923001234567', '+923009876543'],
    description: 'Array of recipient phone numbers',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({
    example: 'Hello everyone!',
    description: 'Message body (for text type)',
  })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({
    enum: ['text', 'template'],
    description: 'Type of bulk message',
  })
  @IsEnum(['text', 'template'] as const)
  messageType: 'text' | 'template';

  @ApiPropertyOptional({
    description: 'Template UUID (required for template type)',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description:
      'Template variables — single object or array matching recipients',
  })
  @IsOptional()
  variables?: Record<string, string>[] | Record<string, string>;

  @ApiPropertyOptional({
    example: 500,
    minimum: 100,
    maximum: 5000,
    description: 'Delay between messages in ms',
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  batchDelay?: number = 500;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Unique message ID' })
  messageId: string;

  @ApiProperty({ description: 'Recipient phone number' })
  to: string;

  @ApiProperty({ description: 'Current message status' })
  status: string;

  @ApiProperty({ description: 'Timestamp when message was queued' })
  queuedAt: Date;
}
