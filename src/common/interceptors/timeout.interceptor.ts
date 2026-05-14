import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import {
  Observable,
  timeout,
  catchError,
  throwError,
  TimeoutError,
} from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutMs: number;

  constructor(timeoutMs = 30000) {
    this.timeoutMs = timeoutMs;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Skip timeout for SSE (Server-Sent Events) connections
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
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timed out.'),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
