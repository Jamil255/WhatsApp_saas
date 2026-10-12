import { registerAs } from '@nestjs/config';

function nonNegativeInteger(value: string | undefined, fallback = 0): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export default registerAs('billing', () => ({
  currency: (process.env.BILLING_CURRENCY || 'USD').toUpperCase(),
  provider: process.env.BILLING_PROVIDER || 'manual',
  pricingConfigured: [
    process.env.BILLING_STARTER_MONTHLY_CENTS,
    process.env.BILLING_PROFESSIONAL_MONTHLY_CENTS,
    process.env.BILLING_ENTERPRISE_MONTHLY_CENTS,
    process.env.BILLING_API_COST_PER_1000_CENTS,
  ].some((value) => value !== undefined),
  planMonthlyCents: {
    starter: nonNegativeInteger(process.env.BILLING_STARTER_MONTHLY_CENTS),
    professional: nonNegativeInteger(
      process.env.BILLING_PROFESSIONAL_MONTHLY_CENTS,
    ),
    enterprise: nonNegativeInteger(
      process.env.BILLING_ENTERPRISE_MONTHLY_CENTS,
    ),
  },
  apiCostPerThousandCents: nonNegativeInteger(
    process.env.BILLING_API_COST_PER_1000_CENTS,
  ),
}));
