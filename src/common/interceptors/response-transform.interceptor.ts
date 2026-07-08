import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    // Skip transformation for SSE (Server-Sent Events) connections
    const request = context.switchToHttp().getRequest();
    const acceptHeader = request?.headers?.accept || '';
    const url = request?.url || '';

    if (
      acceptHeader.includes('text/event-stream') ||
      url.includes('/qr/stream')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If already formatted (has success property), pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - now,
          },
        };
      }),
    );
  }
}
