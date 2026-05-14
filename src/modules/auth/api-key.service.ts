import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ApiCredential } from '../../database/entities/api-credential.entity';
import {
  generateClientId,
  generateApiSecret,
  encryptAES,
  decryptAES,
} from '../../common/utils/crypto.util';

export interface ApiKeyPair {
  clientId: string;
  apiSecret: string;
}

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiCredential)
    private readonly credRepo: Repository<ApiCredential>,
    private readonly configService: ConfigService,
  ) {}

  private getEncryptionKey(): string {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key || key.length !== 64) {
      throw new InternalServerErrorException(
        'System ENCRYPTION_KEY is not configured or invalid (must be 64 hex chars)',
      );
    }
    return key;
  }

  async generateKeyPair(tenantId: string): Promise<ApiKeyPair> {
    const clientId = generateClientId();
    const apiSecret = generateApiSecret();

    const encryptionKey = this.getEncryptionKey();
    const apiSecretEncrypted = encryptAES(apiSecret, encryptionKey);
    const apiSecretPrefix = apiSecret.substring(0, 8);

    await this.credRepo.save({
      tenantId,
      clientId,
      apiSecretHash: apiSecretEncrypted,
      apiSecretPrefix,
      isActive: true,
    });

    return { clientId, apiSecret };
  }

  async rotateKey(tenantId: string): Promise<ApiKeyPair> {
    await this.credRepo.update(
      { tenantId, isActive: true },
      { isActive: false },
    );
    return this.generateKeyPair(tenantId);
  }

  async validateKey(
    clientId: string,
    apiSecret: string,
  ): Promise<ApiCredential | null> {
    const credential = await this.credRepo.findOne({
      where: { clientId, isActive: true },
      relations: ['tenant'],
    });

    if (!credential) return null;

    try {
      const encryptionKey = this.getEncryptionKey();
      const decryptedSecret = decryptAES(
        credential.apiSecretHash,
        encryptionKey,
      );
      if (decryptedSecret !== apiSecret) return null;
      return credential;
    } catch (e) {
      return null;
    }
  }

  async getDecryptedSecret(
    tenantId: string,
  ): Promise<{ clientId: string; apiSecret: string } | null> {
    const credential = await this.credRepo.findOne({
      where: { tenantId, isActive: true },
    });

    if (!credential) return null;

    try {
      const encryptionKey = this.getEncryptionKey();
      const decryptedSecret = decryptAES(
        credential.apiSecretHash,
        encryptionKey,
      );
      return {
        clientId: credential.clientId,
        apiSecret: decryptedSecret,
      };
    } catch (e) {
      return null;
    }
  }
}
