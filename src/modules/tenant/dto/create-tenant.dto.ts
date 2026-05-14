import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantPlan } from '../../../common/enums';

export class CreateTenantDto {
  @ApiProperty({
    example: 'Acme Corp',
    description: 'Company name for the tenant',
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    example: 'admin@acme.com',
    description: 'Admin email for the new tenant',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  adminEmail: string;

  @ApiProperty({ example: 'John Doe', description: 'Admin full name' })
  @IsString()
  adminName: string;

  @ApiPropertyOptional({
    enum: TenantPlan,
    default: TenantPlan.STARTER,
    description: 'Subscription plan',
  })
  @IsEnum(TenantPlan)
  @IsOptional()
  plan?: TenantPlan = TenantPlan.STARTER;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({
    example: 'Acme Corp Updated',
    description: 'Company name',
  })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: TenantPlan, description: 'Subscription plan' })
  @IsEnum(TenantPlan)
  @IsOptional()
  plan?: TenantPlan;

  @ApiPropertyOptional({ example: 120, description: 'Max messages per minute' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Max messages per day' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyMessageLimit?: number;
}
