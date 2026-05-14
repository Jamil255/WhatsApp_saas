import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  whatsappConfig,
  queueConfig,
  otpConfig,
} from './config';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './shared/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { TemplateModule } from './modules/template/template.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { AdminModule } from './modules/admin/admin.module';
import { JobsModule } from './jobs/jobs.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        whatsappConfig,
        queueConfig,
        otpConfig,
      ],
      envFilePath: ['.env'],
    }),

    // Infrastructure
    DatabaseModule,
    QueueModule,

    // Feature Modules
    AuthModule,
    TenantModule,
    WhatsAppModule,
    TemplateModule,
    WebhookModule,
    MonitoringModule,
    AdminModule,

    // Background Jobs
    JobsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
