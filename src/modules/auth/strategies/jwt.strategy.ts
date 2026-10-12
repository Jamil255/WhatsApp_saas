import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { Role } from '../../../common/enums';
import { getTenantAccessDenial } from '../../../common/utils/tenant-access.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') || 'fallback-secret',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
  }) {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['tenant'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found or deactivated.');
    }
    if (user.role !== Role.SUPER_ADMIN) {
      const denial = getTenantAccessDenial(user.tenant);
      if (denial) throw new UnauthorizedException(denial.message);
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
      phoneNumber: user.phoneNumber,
    };
  }
}
