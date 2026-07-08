import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { User } from '../../database/entities/user.entity';
import { OtpVerification } from '../../database/entities/otp-verification.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { TokenService } from './token.service';
import { SessionManagerService } from '../whatsapp/session/session-manager.service';
import { generateOtp } from '../../common/utils/crypto.util';
import { normalizeE164, toWhatsAppJid } from '../../common/utils/phone.util';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly tokenService: TokenService,
    private readonly sessionManager: SessionManagerService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Request OTP — generates OTP, sends via WhatsApp, stores hash in DB
   */
  async requestOtp(phoneNumber: string) {
    const normalized = normalizeE164(phoneNumber);

    // 1. Check rate limit
    await this.checkRateLimit(normalized);

    // 2. Verify user exists with this phone number
    const user = await this.userRepo.findOne({
      where: { phoneNumber: normalized, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      throw new BadRequestException(
        'No active account found with this phone number.',
      );
    }

    if (user.tenant?.status !== 'active' && user.role !== 'super_admin') {
      throw new UnauthorizedException('Your account has been suspended.');
    }

    // 3. Get system tenant's WhatsApp socket
    const systemTenant = await this.tenantRepo.findOne({
      where: { slug: 'platform-admin' },
      select: ['id'],
    });

    if (!systemTenant) {
      throw new ServiceUnavailableException(
        'System tenant not found. Cannot send OTP.',
      );
    }

    const systemTenantId = systemTenant.id;
    const sock = this.sessionManager.get(systemTenantId);
    if (!sock) {
      throw new ServiceUnavailableException(
        'System WhatsApp is not connected. Please try again later.',
      );
    }

    // 4. Generate OTP
    const otpLength = this.config.get<number>('otp.otpLength', 6);
    const otp = generateOtp(otpLength);
    const otpHash = this.hashOtp(otp);

    // 5. Store OTP in DB
    const expirySeconds = this.config.get<number>('otp.expirySeconds', 300);
    const maxAttempts = this.config.get<number>('otp.maxAttempts', 3);

    await this.otpRepo.save({
      phoneNumber: normalized,
      otpHash,
      tenantId: systemTenantId,
      maxAttempts,
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
    });

    // 6. Send OTP via WhatsApp (direct — not queued)
    const expiryMinutes = Math.ceil(expirySeconds / 60);
    const messageTemplate = this.config.get<string>(
      'otp.messageTemplate',
      'Your verification code is: {otp}. Valid for {minutes} minutes. Do not share this code.',
    );
    const messageBody = messageTemplate
      .replace('{otp}', otp)
      .replace('{minutes}', expiryMinutes.toString());

    try {
      const jid = toWhatsAppJid(normalized);
      await sock.sendMessage(jid, { text: messageBody });
      this.logger.log(`OTP sent to ${normalized} via WhatsApp`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${normalized}`, error.message);
      throw new ServiceUnavailableException(
        'Failed to send OTP via WhatsApp. Please try again.',
      );
    }

    return {
      message: 'OTP sent successfully to your WhatsApp.',
      expiresIn: expirySeconds,
      phoneNumber: normalized,
    };
  }

  /**
   * Verify OTP — validates code, returns JWT tokens
   */
  async verifyOtp(phoneNumber: string, otp: string) {
    const user = await this.verifyOtpBase(phoneNumber, otp);

    // 6. Generate JWT tokens
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    // 7. Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Verify OTP for actions (no JWT issued)
   */
  async verifyOtpAction(phoneNumber: string, otp: string): Promise<boolean> {
    await this.verifyOtpBase(phoneNumber, otp);
    return true;
  }

  private async verifyOtpBase(phoneNumber: string, otp: string): Promise<User> {
    const normalized = normalizeE164(phoneNumber);

    const otpRecord = await this.otpRepo.findOne({
      where: {
        phoneNumber: normalized,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException(
        'OTP expired or not found. Please request a new one.',
      );
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new UnauthorizedException(
        'Too many incorrect attempts. Please request a new OTP.',
      );
    }

    const otpHash = this.hashOtp(otp);
    if (otpHash !== otpRecord.otpHash) {
      await this.otpRepo.update(otpRecord.id, {
        attempts: otpRecord.attempts + 1,
      });
      const remaining = otpRecord.maxAttempts - otpRecord.attempts - 1;
      throw new UnauthorizedException(
        `Invalid OTP. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new OTP.'}`,
      );
    }

    await this.otpRepo.update(otpRecord.id, { isUsed: true });

    const user = await this.userRepo.findOne({
      where: { phoneNumber: normalized, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deactivated.');
    }

    return user;
  }

  /**
   * Check rate limit — max N OTP requests per phone in X seconds window
   */
  private async checkRateLimit(phoneNumber: string): Promise<void> {
    const windowSeconds = this.config.get<number>('otp.rateLimitWindow', 600);
    const maxRequests = this.config.get<number>('otp.rateLimitMax', 3);

    const windowStart = new Date(Date.now() - windowSeconds * 1000);

    const recentCount = await this.otpRepo.count({
      where: {
        phoneNumber,
        createdAt: MoreThan(windowStart),
      },
    });

    if (recentCount >= maxRequests) {
      const retryMinutes = Math.ceil(windowSeconds / 60);
      throw new HttpException(
        `Too many OTP requests. Please try again after ${retryMinutes} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Hash OTP with SHA256
   */
  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }
}
