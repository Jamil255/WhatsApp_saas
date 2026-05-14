import { Controller, Sse, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { QrEventService } from './qr-event.service';

@ApiTags('QR Code')
@Controller('qr')
export class QrController {
  constructor(private readonly qrEventService: QrEventService) {}

  @Sse('stream')
  @ApiOperation({
    summary: 'QR code SSE stream',
    description:
      'Server-Sent Events stream that emits QR codes in real-time. Pass tenantId as query param.',
  })
  @ApiQuery({ name: 'tenantId', required: true, description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'SSE stream opened' })
  stream(@Query('tenantId') tenantId: string): Observable<MessageEvent> {
    return this.qrEventService.getStream(tenantId);
  }
}
