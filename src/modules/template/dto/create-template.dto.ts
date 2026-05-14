import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateCategory, TemplateStatus } from '../../../common/enums';

export class CreateTemplateDto {
  @ApiProperty({ example: 'otp_verification', description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: TemplateCategory, description: 'Template category' })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({
    example: 'Your OTP code is {{code}}. Valid for {{minutes}} minutes.',
    description: 'Template body with {{variables}}',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    example: ['code', 'minutes'],
    description: 'List of variable names used in the body',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ example: 'en', description: 'Template language code' })
  @IsOptional()
  @IsString()
  language?: string = 'en';
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({
    example: 'otp_verification_v2',
    description: 'Template name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Your code is {{code}}',
    description: 'Template body',
  })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: ['code'], description: 'Variable names' })
  @IsOptional()
  @IsArray()
  variables?: string[];

  @ApiPropertyOptional({ enum: TemplateStatus, description: 'Template status' })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}
