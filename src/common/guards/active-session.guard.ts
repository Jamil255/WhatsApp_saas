import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppSession } from '../../database/entities/whatsapp-session.entity';
import { SessionStatus } from '../enums';

@Injectable()
export class ActiveSessionGuard implements CanActivate {
  constructor(
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId || request.tenantId;

    if (!tenantId) {
      throw new HttpException(
        'Tenant context not found.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const session = await this.sessionRepo.findOne({
      where: { tenantId, status: SessionStatus.CONNECTED },
    });

    if (!session) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_ACTIVE',
            message:
              'WhatsApp session is not connected. Please reconnect via dashboard.',
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return true;
  }
}
