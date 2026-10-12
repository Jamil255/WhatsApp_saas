import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import { Role } from '../../common/enums';
import { getTenantAccessDenial } from '../../common/utils/tenant-access.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.role !== Role.SUPER_ADMIN) {
      const denial = getTenantAccessDenial(user.tenant);
      if (denial) throw new UnauthorizedException(denial.message);
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async refresh(refreshToken: string) {
    const tokenRecord =
      await this.tokenService.validateRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.userRepo.findOne({
      where: { id: tokenRecord.userId, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.role !== Role.SUPER_ADMIN) {
      const denial = getTenantAccessDenial(user.tenant);
      if (denial) {
        await this.tokenService.revokeRefreshToken(refreshToken);
        throw new UnauthorizedException(denial.message);
      }
    }

    // Revoke old refresh token
    await this.tokenService.revokeRefreshToken(refreshToken);

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const newRefreshToken = await this.tokenService.generateRefreshToken(
      user.id,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }
}
