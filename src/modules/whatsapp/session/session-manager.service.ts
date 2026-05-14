import { Injectable, Logger } from '@nestjs/common';

/** In-memory map of active Baileys sockets per tenant */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly sockets = new Map<string, any>();

  set(tenantId: string, socket: any): void {
    this.sockets.set(tenantId, socket);
    this.logger.log(
      `Socket stored for tenant ${tenantId}. Active sessions: ${this.sockets.size}`,
    );
  }

  get(tenantId: string): any | undefined {
    return this.sockets.get(tenantId);
  }

  has(tenantId: string): boolean {
    return this.sockets.has(tenantId);
  }

  delete(tenantId: string): void {
    const sock = this.sockets.get(tenantId);
    if (sock) {
      try {
        sock.end(undefined);
      } catch {}
    }
    this.sockets.delete(tenantId);
    this.logger.log(
      `Socket removed for tenant ${tenantId}. Active sessions: ${this.sockets.size}`,
    );
  }

  getAllTenantIds(): string[] {
    return Array.from(this.sockets.keys());
  }

  getActiveCount(): number {
    return this.sockets.size;
  }
}
