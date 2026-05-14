import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { HealthController } from './health.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [TypeOrmModule.forFeature([WhatsAppSession]), WhatsAppModule],
  controllers: [HealthController],
})
export class MonitoringModule {}
