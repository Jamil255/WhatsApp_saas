import { HttpStatus } from '@nestjs/common';
import { SubscriptionStatus, TenantStatus } from '../enums';

type TenantAccessRecord = {
  status: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt: Date | null;
};

export type TenantAccessDenial = {
  code:
    | 'ORGANIZATION_NOT_FOUND'
    | 'ORGANIZATION_BLOCKED'
    | 'SUBSCRIPTION_INACTIVE'
    | 'SUBSCRIPTION_EXPIRED';
  message: string;
  statusCode: number;
};

const inactiveSubscriptionStatuses = new Set<SubscriptionStatus>([
  SubscriptionStatus.SUSPENDED,
  SubscriptionStatus.CANCELLED,
  SubscriptionStatus.EXPIRED,
]);

export function getTenantAccessDenial(
  tenant: TenantAccessRecord | null | undefined,
  now = new Date(),
): TenantAccessDenial | null {
  if (!tenant) {
    return {
      code: 'ORGANIZATION_NOT_FOUND',
      message: 'The organization account is unavailable.',
      statusCode: HttpStatus.UNAUTHORIZED,
    };
  }

  if (tenant.status !== TenantStatus.ACTIVE) {
    return {
      code: 'ORGANIZATION_BLOCKED',
      message:
        'This organization has been blocked. Contact the platform administrator to restore access.',
      statusCode: HttpStatus.FORBIDDEN,
    };
  }

  if (tenant.subscriptionEndsAt && tenant.subscriptionEndsAt <= now) {
    return {
      code: 'SUBSCRIPTION_EXPIRED',
      message:
        'This organization subscription has expired. Renew it to restore access.',
      statusCode: HttpStatus.PAYMENT_REQUIRED,
    };
  }

  if (inactiveSubscriptionStatuses.has(tenant.subscriptionStatus)) {
    return {
      code: 'SUBSCRIPTION_INACTIVE',
      message:
        'This organization subscription is inactive. Contact the platform administrator to restore access.',
      statusCode: HttpStatus.PAYMENT_REQUIRED,
    };
  }

  return null;
}
