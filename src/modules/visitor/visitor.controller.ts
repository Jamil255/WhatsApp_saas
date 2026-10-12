import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { Visitor } from '../../database/entities/visitor.entity';
import { TrackVisitorDto } from './dto/track-visitor.dto';

@ApiTags('Visitors')
@Controller('visitors')
export class VisitorController {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepo: Repository<Visitor>,
  ) {}

  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record an anonymous public-site visit' })
  @ApiResponse({ status: 204, description: 'Visit recorded' })
  async track(
    @Body() dto: TrackVisitorDto,
    @Req() request: Request,
  ): Promise<void> {
    const now = new Date();
    const forwarded = request.headers['x-forwarded-for'];
    const ipAddress = (Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim()) || request.ip || null;
    const userAgent = request.get('user-agent')?.slice(0, 500) || null;
    const existing = await this.visitorRepo.findOne({
      where: { visitorKey: dto.visitorId },
    });

    if (existing) {
      existing.sessionId = dto.sessionId || existing.sessionId;
      existing.lastVisitedPath = dto.path;
      existing.lastSeenAt = now;
      existing.pageViews += 1;
      existing.ipAddress = ipAddress;
      existing.userAgent = userAgent;
      if (!existing.referrer && dto.referrer) existing.referrer = dto.referrer;
      if (!existing.utmSource && dto.utmSource) existing.utmSource = dto.utmSource;
      if (!existing.utmMedium && dto.utmMedium) existing.utmMedium = dto.utmMedium;
      if (!existing.utmCampaign && dto.utmCampaign) existing.utmCampaign = dto.utmCampaign;
      await this.visitorRepo.save(existing);
      return;
    }

    await this.visitorRepo.save(
      this.visitorRepo.create({
        visitorKey: dto.visitorId,
        sessionId: dto.sessionId || null,
        ipAddress,
        userAgent,
        landingPath: dto.path,
        lastVisitedPath: dto.path,
        referrer: dto.referrer || null,
        utmSource: dto.utmSource || null,
        utmMedium: dto.utmMedium || null,
        utmCampaign: dto.utmCampaign || null,
        pageViews: 1,
        lastSeenAt: now,
      }),
    );
  }
}
