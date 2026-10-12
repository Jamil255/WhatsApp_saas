import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Growth' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'growth' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must use lowercase letters, numbers and hyphens only',
  })
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 4900, description: 'Monthly price in cents' })
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  monthlyPriceCents: number;

  @ApiPropertyOptional({
    example: 14,
    default: 14,
    description:
      'Free-trial duration before the paid subscription begins; use 0 to disable trials',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number = 14;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter code' })
  currency?: string = 'USD';

  @ApiProperty({ example: 10000 })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  dailyMessageLimit: number;

  @ApiProperty({ example: 300 })
  @IsInt()
  @Min(1)
  @Max(10_000)
  rateLimitPerMinute: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number = 0;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
  @ApiPropertyOptional({
    default: false,
    description: 'Apply plan quota changes to all assigned organizations',
  })
  @IsOptional()
  @IsBoolean()
  syncAssignedLimits?: boolean;
}
