import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AuditService } from './audit.service';
import { Tenant } from '../../database/entities/tenant.entity';
import { Message } from '../../database/entities/message.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Message, AuditLog, WhatsAppSession]),
    WhatsAppModule,
  ],
  controllers: [AdminController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AdminModule {}
