import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { ApiKeyService } from './api-key.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../../database/entities/user.entity';
import { ApiCredential } from '../../database/entities/api-credential.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { OtpVerification } from '../../database/entities/otp-verification.entity';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn') },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      ApiCredential,
      RefreshToken,
      Tenant,
      OtpVerification,
    ]),
    WhatsAppModule,
    AdminModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    ApiKeyService,
    TokenService,
    PasswordService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    OtpService,
    ApiKeyService,
    PasswordService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
