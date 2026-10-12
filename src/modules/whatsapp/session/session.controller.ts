import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { SessionLifecycleService } from './session-lifecycle.service';

// DTO for session OTP verification
export class VerifySessionOtpDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP received on WhatsApp',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  otp: string;
}

@ApiTags('WhatsApp Sessions')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionLifecycle: SessionLifecycleService) {}

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connect WhatsApp',
    description:
    'Initiate a WhatsApp linked-device session. A QR code will be generated and can be read from the authenticated QR state endpoint. After scanning, an OTP will be sent to the connected number for verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection initiated — poll /sessions/qr for the QR state',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Session already connected' })
  async connect(@CurrentTenant() tenantId: string) {
    await this.sessionLifecycle.connect(tenantId);
    return {
      message: 'Connection initiated. Poll the authenticated QR endpoint.',
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify session OTP',
    description:
      'After QR scan, an OTP is sent to the connected WhatsApp number. Submit the OTP here to activate the session.',
  })
  @ApiResponse({ status: 200, description: 'Session verified and activated' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @CurrentTenant() tenantId: string,
    @Body() dto: VerifySessionOtpDto,
  ) {
    return this.sessionLifecycle.verifySessionOtp(tenantId, dto.otp);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend session OTP',
    description:
      'Resend the verification OTP to the connected WhatsApp number.',
  })
  @ApiResponse({ status: 200, description: 'OTP resent to WhatsApp' })
  @ApiResponse({ status: 401, description: 'No session pending verification' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests' })
  async resendOtp(@CurrentTenant() tenantId: string) {
    return this.sessionLifecycle.resendSessionOtp(tenantId);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get session status',
    description:
      'Returns the current WhatsApp session status, phone number, and connection details.',
  })
  @ApiResponse({ status: 200, description: 'Session status returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(@CurrentTenant() tenantId: string) {
    return this.sessionLifecycle.getStatus(tenantId);
  }

  @Get('qr')
  @ApiOperation({ summary: 'Get the current authenticated QR connection state' })
  async getQr(@CurrentTenant() tenantId: string) {
    return this.sessionLifecycle.getQrCode(tenantId);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disconnect WhatsApp',
    description: 'Disconnect and destroy the current WhatsApp session.',
  })
  @ApiResponse({ status: 200, description: 'Session disconnected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disconnect(@CurrentTenant() tenantId: string) {
    await this.sessionLifecycle.disconnect(tenantId);
    return { message: 'WhatsApp session disconnected.' };
  }

  @Post('restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restart session',
    description:
    'Disconnect the existing session and initiate a new connection with a fresh QR code.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session restarted — poll /sessions/qr for the new QR state',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async restart(@CurrentTenant() tenantId: string) {
    await this.sessionLifecycle.disconnect(tenantId);
    await this.sessionLifecycle.connect(tenantId);
    return { message: 'Session restarted. Poll the authenticated QR endpoint.' };
  }
}
