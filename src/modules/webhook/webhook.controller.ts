import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { WebhookService } from './webhook.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('register')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity('X-Client-Id')
  @ApiSecurity('X-Api-Secret')
  @ApiOperation({
    summary: 'Register webhook',
    description:
      'Register or update the webhook URL for receiving message events. Payloads are signed with HMAC-SHA256.',
  })
  @ApiResponse({ status: 201, description: 'Webhook registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or event types' })
  @ApiResponse({ status: 401, description: 'Invalid API credentials' })
  async register(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterWebhookDto,
  ) {
    return this.webhookService.register(
      tenantId,
      dto.url,
      dto.events,
      dto.secret,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get webhook config',
    description: 'Retrieve the current webhook configuration for the tenant.',
  })
  @ApiResponse({ status: 200, description: 'Webhook configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No webhook configured' })
  async getConfig(@CurrentTenant() tenantId: string) {
    return this.webhookService.getConfig(tenantId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove webhook',
    description:
      'Delete the webhook configuration. Events will no longer be dispatched.',
  })
  @ApiResponse({ status: 204, description: 'Webhook removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@CurrentTenant() tenantId: string) {
    await this.webhookService.remove(tenantId);
  }
}
