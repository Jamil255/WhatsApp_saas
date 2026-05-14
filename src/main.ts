import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get('app.port', 3000);
  const corsOrigins = config.get('app.corsOrigins', ['http://localhost:3001']);

  // Security (CSP disabled in dev for QR viewer page)
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client-Id',
      'X-Api-Secret',
      'X-Request-Id',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['health', 'docs', 'docs/(.*)', 'qr-viewer'],
  });

  // Serve static files (QR viewer page)
  const path = require('path');
  app.useStaticAssets(path.join(__dirname, '..', 'public'));

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseTransformInterceptor(),
    new TimeoutInterceptor(30000),
  );

  // Swagger API docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WhatsApp SaaS Platform API')
    .setDescription(
      'Multi-tenant WhatsApp Communication Platform — Twilio-like API',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-Client-Id' },
      'X-Client-Id',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-Api-Secret' },
      'X-Api-Secret',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 WhatsApp SaaS Platform running on http://localhost:${port}`);
  logger.log(`📚 API Docs available at http://localhost:${port}/docs`);
}

bootstrap();
