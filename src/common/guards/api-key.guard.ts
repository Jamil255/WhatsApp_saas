import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ApiCredential } from '../../database/entities/api-credential.entity';
import { decryptAES } from '../utils/crypto.util';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiCredential)
    private readonly apiCredRepo: Repository<ApiCredential>,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientId = request.headers['x-client-id'] as string;
    const apiSecret = request.headers['x-api-secret'] as string;

    if (!clientId || !apiSecret) {
      throw new UnauthorizedException(
        'Missing API credentials. Provide X-Client-Id and X-Api-Secret headers.',
      );
    }

    const credential = await this.apiCredRepo.findOne({
      where: { clientId, isActive: true },
      relations: ['tenant'],
    });

    if (!credential) {
      throw new UnauthorizedException('Invalid API credentials.');
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      throw new UnauthorizedException('API credentials have expired.');
    }

    try {
      const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new InternalServerErrorException('ENCRYPTION_KEY is not configured.');
      }
      const decryptedSecret = decryptAES(credential.apiSecretHash, encryptionKey);
      if (decryptedSecret !== apiSecret) {
        throw new UnauthorizedException('Invalid API secret.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid API secret.');
    }

    if (credential.tenant?.status !== 'active') {
      throw new UnauthorizedException(
        'Tenant account is suspended or inactive.',
      );
    }

    // Attach tenant context to request
    request.tenantId = credential.tenant.id;
    request.user = {
      tenantId: credential.tenant.id,
      credentialId: credential.id,
      authType: 'api_key',
    };

    // Update last used timestamp (non-blocking)
    this.apiCredRepo
      .update(credential.id, { lastUsedAt: new Date() })
      .catch(() => {});

    return true;
  }
}
