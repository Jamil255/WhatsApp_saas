import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { WhatsAppSession } from '../../../database/entities/whatsapp-session.entity';
import { QrSession } from '../../../database/entities/qr-session.entity';
import { OtpVerification } from '../../../database/entities/otp-verification.entity';
import { SessionStatus, QrStatus } from '../../../common/enums';
import { SessionManagerService } from './session-manager.service';
import { AuthStateService } from './auth-state.service';
import { QrEventService } from '../qr/qr-event.service';
import { calculateBackoff } from '../../../common/utils/retry.util';
import { QueueService } from '../../../shared/queue/queue.service';
import { generateOtp } from '../../../common/utils/crypto.util';
import * as QRCode from 'qrcode';

@Injectable()
export class SessionLifecycleService {
  private readonly logger = new Logger(SessionLifecycleService.name);
  private readonly qrAttempts = new Map<string, number>();

  constructor(
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    @InjectRepository(QrSession)
    private readonly qrSessionRepo: Repository<QrSession>,
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
    private readonly sessionManager: SessionManagerService,
    private readonly authStateService: AuthStateService,
    private readonly qrEventService: QrEventService,
    private readonly queueService: QueueService,
    private readonly config: ConfigService,
  ) {}

  async connect(tenantId: string): Promise<void> {
    // Cleanup existing socket if any
    if (this.sessionManager.has(tenantId)) {
      this.sessionManager.delete(tenantId);
    }

    // Ensure session record exists
    let session = await this.sessionRepo.findOne({ where: { tenantId } });
    if (!session) {
      session = await this.sessionRepo.save({
        tenantId,
        status: SessionStatus.CONNECTING,
      });
    } else {
      await this.sessionRepo.update(session.id, {
        status: SessionStatus.CONNECTING,
        reconnectCount: 0,
        disconnectedAt: null,
      });
    }

    // Load auth state from PostgreSQL
    const { state, saveCreds } =
      await this.authStateService.getAuthState(tenantId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: [
        this.config.get('whatsapp.browserName', 'WhatsApp SaaS'),
        'Chrome',
        '120.0',
      ],
      connectTimeoutMs: 60_000,
    });

    this.sessionManager.set(tenantId, sock);

    // Handle creds update
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates (QR, connected, disconnected)
    sock.ev.on('connection.update', async (update: any) => {
      await this.handleConnectionUpdate(tenantId, update, sock);
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (msg: any) => {
      if (msg.type === 'notify') {
        await this.queueService.enqueue('incoming.message', {
          tenantId,
          messages: msg.messages.map((m: any) => ({
            key: m.key,
            message: m.message,
            messageTimestamp: m.messageTimestamp,
          })),
        });
      }
    });

    // Handle message status updates
    sock.ev.on('messages.update', async (updates: any[]) => {
      for (const update of updates) {
        await this.queueService.enqueue('message.status.update', {
          tenantId,
          waMessageId: update.key?.id,
          status: update.update?.status,
        });
      }
    });
  }

  private async handleConnectionUpdate(
    tenantId: string,
    update: any,
    sock: any,
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    // QR received
    if (qr) {
      const attempt = (this.qrAttempts.get(tenantId) || 0) + 1;
      this.qrAttempts.set(tenantId, attempt);
      const maxAttempts = this.config.get('whatsapp.maxQrAttempts', 5);

      const qrImage = await QRCode.toDataURL(qr, { width: 256, margin: 2 });

      // Update QR session in DB
      await this.qrSessionRepo.upsert(
        {
          tenantId,
          qrData: qr,
          status: QrStatus.ACTIVE,
          attempt,
          maxAttempts,
          expiresAt: new Date(Date.now() + 20_000),
        },
        { conflictPaths: ['tenantId'] },
      );

      // Emit SSE to frontend
      this.qrEventService.emit(tenantId, {
        event: 'qr_update',
        data: {
          qrCode: qrImage,
          attempt,
          maxAttempts,
          expiresAt: new Date(Date.now() + 20_000),
        },
      });

      if (attempt >= maxAttempts) {
        this.qrEventService.emit(tenantId, { event: 'qr_expired', data: {} });
        this.qrAttempts.delete(tenantId);
        this.sessionManager.delete(tenantId);
        await this.sessionRepo.update(
          { tenantId },
          { status: SessionStatus.DISCONNECTED },
        );
      }
    }

    // Connected
    if (connection === 'open') {
      this.qrAttempts.delete(tenantId);

      const phoneNumber = sock.user?.id?.split(':')[0];
      const formattedPhone = phoneNumber ? `+${phoneNumber}` : null;

      // Check if this is a reconnection (session already had phone number = previously verified)
      const existingSession = await this.sessionRepo.findOne({
        where: { tenantId },
      });
      const isReconnection =
        existingSession?.phoneNumber && existingSession?.connectedAt;

      if (isReconnection) {
        // Reconnection — skip OTP, go straight to CONNECTED
        this.logger.log(
          `WhatsApp reconnected for tenant ${tenantId} — skipping OTP (previously verified)`,
        );
        await this.sessionRepo.update(
          { tenantId },
          {
            status: SessionStatus.CONNECTED,
            phoneNumber: formattedPhone,
            connectedAt: new Date(),
            accountInfo: sock.user || null,
            reconnectCount: 0,
            lastHeartbeatAt: new Date(),
          },
        );
      } else {
        // Fresh QR scan — require OTP verification
        this.logger.log(
          `WhatsApp linked for tenant ${tenantId} — sending verification OTP`,
        );

        await this.sessionRepo.update(
          { tenantId },
          {
            status: SessionStatus.PENDING_VERIFICATION,
            phoneNumber: formattedPhone,
            connectedAt: new Date(),
            accountInfo: sock.user || null,
            reconnectCount: 0,
            lastHeartbeatAt: new Date(),
          },
        );

        try {
          await this.qrSessionRepo.update(
            { tenantId },
            { status: QrStatus.CONNECTED, scannedAt: new Date() },
          );
        } catch {}

        // Generate and send OTP via the newly connected socket
        if (formattedPhone) {
          try {
            await this.sendSessionOtp(tenantId, formattedPhone, sock);
          } catch (err) {
            this.logger.error(
              `Failed to send session OTP for tenant ${tenantId}`,
              err.message,
            );
          }
        }

        // Emit SSE — frontend should show OTP input
        const maskedPhone = formattedPhone
          ? formattedPhone.slice(0, 4) + '****' + formattedPhone.slice(-3)
          : null;

        this.qrEventService.emit(tenantId, {
          event: 'otp_required',
          data: {
            phoneNumber: maskedPhone,
            sessionStatus: 'pending_verification',
            message:
              'OTP sent to your WhatsApp. Please verify to activate session.',
          },
        });
      }
    }

    // Disconnected
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut &&
        statusCode !== DisconnectReason.forbidden &&
        statusCode !== DisconnectReason.multideviceMismatch;

      this.sessionManager.delete(tenantId);

      if (shouldReconnect) {
        const session = await this.sessionRepo.findOne({ where: { tenantId } });
        const reconnectCount = (session?.reconnectCount || 0) + 1;
        const maxRetries = this.config.get('whatsapp.reconnectMaxRetries', 10);

        if (reconnectCount <= maxRetries) {
          await this.sessionRepo.update(
            { tenantId },
            {
              status: SessionStatus.CONNECTING,
              reconnectCount,
              disconnectedAt: new Date(),
            },
          );

          const delay = calculateBackoff(
            reconnectCount,
            this.config.get('whatsapp.reconnectBaseDelayMs', 2000),
            this.config.get('whatsapp.reconnectMaxDelayMs', 60000),
          );

          this.logger.log(
            `Reconnecting tenant ${tenantId} in ${delay}ms (attempt ${reconnectCount})`,
          );

          setTimeout(() => {
            this.connect(tenantId).catch((err) => {
              this.logger.error(
                `Reconnect failed for tenant ${tenantId}`,
                err.message,
              );
            });
          }, delay);
        } else {
          this.logger.warn(
            `Max reconnect retries exceeded for tenant ${tenantId}`,
          );
          await this.sessionRepo.update(
            { tenantId },
            {
              status: SessionStatus.DISCONNECTED,
              disconnectedAt: new Date(),
            },
          );
        }
      } else {
        // Permanent disconnect — clear credentials
        this.logger.log(
          `Permanent disconnect for tenant ${tenantId} (code: ${statusCode})`,
        );
        await this.destroySession(tenantId);
      }
    }
  }

  async disconnect(tenantId: string): Promise<void> {
    const sock = this.sessionManager.get(tenantId);
    if (sock) {
      try {
        await sock.logout();
      } catch {}
    }
    await this.destroySession(tenantId);
  }

  async destroySession(tenantId: string): Promise<void> {
    this.sessionManager.delete(tenantId);
    this.qrAttempts.delete(tenantId);
    await this.authStateService.clearAuthState(tenantId);
    await this.sessionRepo.update(
      { tenantId },
      {
        status: SessionStatus.DESTROYED,
        creds: null as any,
        phoneNumber: null as any,
        connectedAt: null as any,
        accountInfo: null as any,
        reconnectCount: 0,
        disconnectedAt: new Date(),
      },
    );
  }

  async getStatus(tenantId: string) {
    const session = await this.sessionRepo.findOne({ where: { tenantId } });
    if (!session) return { status: 'no_session' };

    const isSocketAlive = this.sessionManager.has(tenantId);
    return {
      status: session.status,
      phoneNumber: session.phoneNumber,
      connectedAt: session.connectedAt,
      disconnectedAt: session.disconnectedAt,
      reconnectCount: session.reconnectCount,
      lastHeartbeat: session.lastHeartbeatAt,
      isSocketAlive,
    };
  }

  // ─── SESSION OTP VERIFICATION ──────────────────────────────────────

  /**
   * Send OTP to the connected phone number via the Baileys socket
   */
  private async sendSessionOtp(
    tenantId: string,
    phoneNumber: string,
    sock: any,
  ): Promise<void> {
    const otpLength = this.config.get<number>('otp.otpLength', 6);
    const otp = generateOtp(otpLength);
    const otpHash = this.hashOtp(otp);

    const expirySeconds = this.config.get<number>('otp.expirySeconds', 300);
    const maxAttempts = this.config.get<number>('otp.maxAttempts', 3);

    // Save OTP to DB
    await this.otpRepo.save({
      phoneNumber,
      otpHash,
      tenantId,
      maxAttempts,
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
    });

    // Send OTP message via WhatsApp
    const expiryMinutes = Math.ceil(expirySeconds / 60);
    const messageTemplate = this.config.get<string>(
      'otp.messageTemplate',
      'Your WhatsApp SaaS session verification code is: {otp}. Valid for {minutes} minutes. Do not share this code.',
    );
    const messageBody = messageTemplate
      .replace('{otp}', otp)
      .replace('{minutes}', expiryMinutes.toString());

    const jid = phoneNumber.replace('+', '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text: messageBody });

    this.logger.log(
      `Session OTP sent to ${phoneNumber} for tenant ${tenantId}`,
    );
  }

  /**
   * Verify the session OTP — if valid, mark session as CONNECTED
   */
  async verifySessionOtp(tenantId: string, otp: string) {
    const session = await this.sessionRepo.findOne({ where: { tenantId } });

    if (!session || session.status !== SessionStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('No session pending verification.');
    }

    if (!session.phoneNumber) {
      throw new UnauthorizedException('Session has no phone number.');
    }

    // Find latest unexpired OTP for this phone + tenant
    const otpRecord = await this.otpRepo.findOne({
      where: {
        phoneNumber: session.phoneNumber,
        tenantId,
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
        'Too many incorrect attempts. Please reconnect and try again.',
      );
    }

    // Verify hash
    const otpHash = this.hashOtp(otp);
    if (otpHash !== otpRecord.otpHash) {
      await this.otpRepo.update(otpRecord.id, {
        attempts: otpRecord.attempts + 1,
      });
      const remaining = otpRecord.maxAttempts - otpRecord.attempts - 1;
      throw new UnauthorizedException(
        `Invalid OTP. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please reconnect and try again.'}`,
      );
    }

    // OTP valid — mark as used and activate session
    await this.otpRepo.update(otpRecord.id, { isUsed: true });

    await this.sessionRepo.update(
      { tenantId },
      {
        status: SessionStatus.CONNECTED,
      },
    );

    // Emit SSE — session is now fully active
    this.qrEventService.emit(tenantId, {
      event: 'verified',
      data: {
        phoneNumber: session.phoneNumber,
        sessionStatus: 'connected',
        message: 'Session verified and activated.',
      },
    });

    this.logger.log(
      `Session OTP verified for tenant ${tenantId} — session CONNECTED`,
    );

    return {
      status: 'connected',
      phoneNumber: session.phoneNumber,
      message: 'Session verified and activated successfully.',
    };
  }

  /**
   * Resend session OTP (if session is still pending_verification)
   */
  async resendSessionOtp(tenantId: string) {
    const session = await this.sessionRepo.findOne({ where: { tenantId } });

    if (!session || session.status !== SessionStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('No session pending verification.');
    }

    const sock = this.sessionManager.get(tenantId);
    if (!sock) {
      throw new UnauthorizedException(
        'WhatsApp socket is no longer active. Please reconnect.',
      );
    }

    if (!session.phoneNumber) {
      throw new UnauthorizedException('Session has no phone number.');
    }

    await this.sendSessionOtp(tenantId, session.phoneNumber, sock);

    const maskedPhone =
      session.phoneNumber.slice(0, 4) + '****' + session.phoneNumber.slice(-3);

    return {
      message: 'OTP resent successfully.',
      phoneNumber: maskedPhone,
    };
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }
}
