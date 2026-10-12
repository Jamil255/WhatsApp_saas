import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackVisitorDto {
  @IsString()
  @MaxLength(80)
  visitorId: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionId?: string;

  @IsString()
  @MaxLength(500)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmCampaign?: string;
}
