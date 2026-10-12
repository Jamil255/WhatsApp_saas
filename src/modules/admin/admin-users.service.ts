import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums';
import { RefreshToken, Tenant, User } from '../../database/entities';
import { PasswordService } from '../auth/password.service';
import {
  ChangeAdminUserPasswordDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from './dto/admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly passwordService: PasswordService,
  ) {}

  async create(dto: CreateAdminUserDto) {
    await Promise.all([
      this.assertTenant(dto.tenantId),
      this.assertUnique(dto.email, dto.phoneNumber),
    ]);
    const user = await this.userRepo.save(
      this.userRepo.create({
        tenantId: dto.tenantId,
        name: dto.name.trim(),
        email: dto.email,
        phoneNumber: dto.phoneNumber || null,
        passwordHash: await this.passwordService.hash(dto.password),
        role: dto.role,
        isActive: dto.isActive ?? true,
      }),
    );
    return this.getSafeUser(user.id);
  }

  async update(id: string, dto: UpdateAdminUserDto, actorId: string) {
    const user = await this.findUser(id);
    this.assertSelfAccessChange(user, dto, actorId);
    await this.assertLastPlatformAdmin(user, dto.role, dto.isActive);

    if (dto.tenantId && dto.tenantId !== user.tenantId) {
      await this.assertTenant(dto.tenantId);
    }
    if (dto.email || dto.phoneNumber !== undefined) {
      await this.assertUnique(
        dto.email || user.email,
        dto.phoneNumber === undefined ? user.phoneNumber : dto.phoneNumber,
        id,
      );
    }

    const accessChanged =
      (dto.tenantId !== undefined && dto.tenantId !== user.tenantId) ||
      (dto.role !== undefined && dto.role !== user.role) ||
      (dto.isActive !== undefined && dto.isActive !== user.isActive);
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.tenantId !== undefined) user.tenantId = dto.tenantId;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    await this.userRepo.save(user);
    if (accessChanged) await this.revokeSessions(id);
    return this.getSafeUser(id);
  }

  async changePassword(id: string, dto: ChangeAdminUserPasswordDto) {
    const user = await this.findUser(id);
    user.passwordHash = await this.passwordService.hash(dto.password);
    await this.userRepo.save(user);
    await this.revokeSessions(id);
    return { message: `Password changed for ${user.email}. Active sessions were revoked.` };
  }

  async remove(id: string, actorId: string) {
    const user = await this.findUser(id);
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own admin account.');
    }
    await this.assertLastPlatformAdmin(user, undefined, false);
    const safeUser = this.toSafeUser(user);
    await this.userRepo.remove(user);
    return safeUser;
  }

  private async findUser(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['tenant'],
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async getSafeUser(id: string) {
    return this.toSafeUser(await this.findUser(id));
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      organization: user.tenant?.companyName || 'Platform',
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private async assertTenant(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Selected organization does not exist.');
  }

  private async assertUnique(
    email: string,
    phoneNumber?: string | null,
    excludeId?: string,
  ) {
    const emailQuery = this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email });
    if (excludeId) emailQuery.andWhere('user.id != :excludeId', { excludeId });
    if (await emailQuery.getOne()) {
      throw new ConflictException('A user with this email already exists.');
    }
    if (!phoneNumber) return;
    const phoneQuery = this.userRepo
      .createQueryBuilder('user')
      .where('user.phone_number = :phoneNumber', { phoneNumber });
    if (excludeId) phoneQuery.andWhere('user.id != :excludeId', { excludeId });
    if (await phoneQuery.getOne()) {
      throw new ConflictException('A user with this phone number already exists.');
    }
  }

  private assertSelfAccessChange(
    user: User,
    dto: UpdateAdminUserDto,
    actorId: string,
  ) {
    if (user.id !== actorId) return;
    if (
      dto.isActive === false ||
      (dto.role !== undefined && dto.role !== user.role) ||
      (dto.tenantId !== undefined && dto.tenantId !== user.tenantId)
    ) {
      throw new BadRequestException(
        'You cannot deactivate or change access scope for your own account.',
      );
    }
  }

  private async assertLastPlatformAdmin(
    user: User,
    nextRole?: Role,
    nextActive?: boolean,
  ) {
    const removesActiveAdmin =
      user.role === Role.SUPER_ADMIN &&
      user.isActive &&
      (nextRole !== undefined && nextRole !== Role.SUPER_ADMIN ||
        nextActive === false);
    if (!removesActiveAdmin) return;
    const activeAdmins = await this.userRepo.count({
      where: { role: Role.SUPER_ADMIN, isActive: true },
    });
    if (activeAdmins <= 1) {
      throw new BadRequestException('At least one active platform admin is required.');
    }
  }

  private async revokeSessions(userId: string) {
    await this.refreshTokenRepo.delete({ userId });
  }
}
