import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && !value.trim() ? null : value;

export class CreateAdminUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(255)
  email: string;

  @Transform(emptyToNull)
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must use E.164 format, for example +923001234567.',
  })
  phoneNumber?: string | null;

  @IsUUID()
  tenantId: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must include uppercase, lowercase, and a number.',
  })
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(255)
  email?: string;

  @Transform(emptyToNull)
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must use E.164 format, for example +923001234567.',
  })
  phoneNumber?: string | null;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChangeAdminUserPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must include uppercase, lowercase, and a number.',
  })
  password: string;
}
