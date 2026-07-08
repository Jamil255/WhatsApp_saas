import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../admin/audit.service';
import { ApiKeyService } from './api-key.service';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { OtpService } from './otp.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly apiKeyService: ApiKeyService,
    private readonly auditService: AuditService,
  ) {}

  @Post('api-keys/rotate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate API Keys',
    description:
      'Generate a new Client ID and API Secret for your tenant. WARNING: This will immediately invalidate your old keys. dont share this with anyone',
  })
  @ApiResponse({
    status: 200,
    description: 'New API Keys generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async rotateApiKeys(@Req() req: express.Request) {
    const tenantId = (req as any).user?.tenantId;
    const newKeys = await this.apiKeyService.rotateKey(tenantId);

    await this.auditService.log({
      userId: (req as any).user?.sub,
      tenantId: tenantId,
      action: 'api_keys.rotate',
      resourceType: 'api_credential',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      message:
        'API keys generated successfully. Please dont share this secret with anyone.',
      data: newKeys,
    };
  }

  @Post('api-keys/view/request-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request OTP to View API Keys',
    description: 'Sends an OTP to your phone number.',
  })
  async requestViewOtp(@Req() req: express.Request) {
    const phoneNumber = (req as any).user?.phoneNumber;
    if (!phoneNumber)
      throw new UnauthorizedException(
        'No phone number attached to this user account',
      );

    await this.auditService.log({
      userId: (req as any).user?.sub,
      tenantId: (req as any).user?.tenantId,
      action: 'api_keys.view_request',
      resourceType: 'api_credential',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return this.otpService.requestOtp(phoneNumber);
  }

  @Post('api-keys/view/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and View API Keys',
    description: 'Enter the OTP to reveal your decrypted API secret.',
  })
  async verifyViewOtp(@Body() dto: VerifyOtpDto, @Req() req: express.Request) {
    const tenantId = (req as any).user?.tenantId;

    // Verify OTP (without issuing tokens)
    await (this.otpService as any).verifyOtpAction(dto.phoneNumber, dto.otp);
    const credentials = await this.apiKeyService.getDecryptedSecret(tenantId);
    if (!credentials) {
      throw new UnauthorizedException(
        'No active API keys found for this tenant.',
      );
    }

    await this.auditService.log({
      userId: (req as any).user?.sub,
      tenantId: tenantId,
      action: 'api_keys.view_success',
      resourceType: 'api_credential',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      message:
        'API Secret decrypted successfully. Do not share this with anyone.',
      data: credentials,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate user with email and password. Returns JWT access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful — returns access and refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto, @Req() req: express.Request) {
    const result = await this.authService.login(dto);
    await this.auditService.log({
      userId: result.user?.id,
      tenantId: result.user?.tenantId,
      action: 'user.login',
      resourceType: 'user',
      resourceId: result.user?.id,
      newValues: { email: dto.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request WhatsApp OTP',
    description:
      'Send a 6-digit OTP to the specified phone number via WhatsApp. The phone number must belong to an existing user. Requires a connected system WhatsApp session.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully to WhatsApp',
  })
  @ApiResponse({
    status: 400,
    description: 'No active account found with this phone number',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many OTP requests — rate limit exceeded',
  })
  @ApiResponse({
    status: 503,
    description: 'WhatsApp not connected or OTP service unavailable',
  })
  async requestOtp(@Body() dto: RequestOtpDto, @Req() req: express.Request) {
    const result = await this.otpService.requestOtp(dto.phoneNumber);
    await this.auditService.log({
      action: 'otp.request',
      resourceType: 'otp',
      newValues: { phoneNumber: dto.phoneNumber },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP & Login',
    description:
      'Verify the OTP received on WhatsApp. If valid, returns JWT access and refresh tokens to create a session.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified — returns access and refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: express.Request) {
    const result = await this.otpService.verifyOtp(dto.phoneNumber, dto.otp);
    await this.auditService.log({
      action: 'otp.verify',
      resourceType: 'otp',
      newValues: { phoneNumber: dto.phoneNumber, success: true },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Token',
    description: 'Exchange a valid refresh token for a new access token.',
  })
  @ApiResponse({ status: 200, description: 'New access token issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout',
    description: 'Revoke the refresh token to invalidate the session.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Body() dto: RefreshTokenDto, @Req() req: express.Request) {
    await this.authService.logout(dto.refreshToken);
    await this.auditService.log({
      action: 'user.logout',
      resourceType: 'user',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: 'Logged out successfully.' };
  }
}
