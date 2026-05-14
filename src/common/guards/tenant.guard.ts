import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../enums';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantIdParam = request.params?.tenantId;

    // Super admins can access any tenant
    if (user?.role === Role.SUPER_ADMIN) {
      return true;
    }

    // If there's a tenant ID in the route, ensure it matches the user's tenant
    if (tenantIdParam && user?.tenantId !== tenantIdParam) {
      throw new ForbiddenException(
        'Access denied. You can only access your own tenant resources.',
      );
    }

    return true;
  }
}
