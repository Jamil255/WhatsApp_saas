import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ActiveSessionGuard } from '../guards/active-session.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';

/** Combines API Key auth + Active Session check + Rate Limiting */
export function ApiAuth() {
  return applyDecorators(
    UseGuards(ApiKeyGuard, ActiveSessionGuard, RateLimitGuard),
  );
}

/** API Key auth without session check (for session management endpoints) */
export function ApiAuthNoSession() {
  return applyDecorators(UseGuards(ApiKeyGuard, RateLimitGuard));
}
