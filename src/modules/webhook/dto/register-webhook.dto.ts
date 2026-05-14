import { IsString, IsUrl, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterWebhookDto {
  @ApiProperty({
    example: 'https://your-server.com/webhook',
    description: 'Webhook URL to receive events',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    example: ['message.sent', 'message.delivered', 'message.failed'],
    description: 'Events to subscribe to. Use ["*"] for all events',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({
    example: 'whsec_your_secret_key',
    description: 'Webhook signing secret. Auto-generated if not provided',
  })
  @IsOptional()
  @IsString()
  secret?: string;
}
