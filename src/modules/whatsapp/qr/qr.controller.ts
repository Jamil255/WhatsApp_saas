import { Controller, ForbiddenException, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { QrEventService } from './qr-event.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('QR Code')
@Controller('qr')
@UseGuards(JwtAuthGuard)
export class QrController {
  constructor(private readonly qrEventService: QrEventService) {}

  @Sse('stream')
  @ApiOperation({
    summary: 'QR code SSE stream',
    description:
      'Server-Sent Events stream that emits QR codes in real-time. Pass tenantId as query param.',
  })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Must match the authenticated tenant when provided' })
  @ApiResponse({ status: 200, description: 'SSE stream opened' })
  stream(
    @CurrentTenant() currentTenantId: string,
    @Query('tenantId') tenantId?: string,
  ): Observable<MessageEvent> {
    if (tenantId && tenantId !== currentTenantId) {
      throw new ForbiddenException('You cannot subscribe to another workspace QR stream.');
    }
    return this.qrEventService.getStream(currentTenantId);
  }
}
