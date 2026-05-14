import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { WhatsAppSessionKey } from '../../database/entities/whatsapp-session-key.entity';
import { QrSession } from '../../database/entities/qr-session.entity';
import { Message } from '../../database/entities/message.entity';
import { MessageStatusLog } from '../../database/entities/message-status-log.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiCredential } from '../../database/entities/api-credential.entity';
import { OtpVerification } from '../../database/entities/otp-verification.entity';
import { SessionController } from './session/session.controller';
import { SessionManagerService } from './session/session-manager.service';
import { SessionLifecycleService } from './session/session-lifecycle.service';
import { AuthStateService } from './session/auth-state.service';
import { SessionRecoveryService } from './session/session-recovery.service';
import { QrController } from './qr/qr.controller';
import { QrEventService } from './qr/qr-event.service';
import { MessagingController } from './messaging/messaging.controller';
import { MessageService } from './messaging/message.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsAppSession,
      WhatsAppSessionKey,
      QrSession,
      Message,
      MessageStatusLog,
      Tenant,
      ApiCredential,
      OtpVerification,
    ]),
  ],
  controllers: [SessionController, QrController, MessagingController],
  providers: [
    SessionManagerService,
    SessionLifecycleService,
    AuthStateService,
    SessionRecoveryService,
    QrEventService,
    MessageService,
  ],
  exports: [
    SessionManagerService,
    SessionLifecycleService,
    MessageService,
    QrEventService,
  ],
})
export class WhatsAppModule {}
