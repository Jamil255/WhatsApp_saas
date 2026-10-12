'use client';

import Link from 'next/link';
import {
  CalendarDays,
  CreditCard,
  Gauge,
  MessageSquareText,
  ReceiptText,
  ServerCog,
  WalletCards,
} from 'lucide-react';
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  DashboardStat,
  EmptyState,
} from '@/components/dashboard-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWorkspaceBilling } from '@/lib/queries';

const compact = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : 'No fixed expiry';
const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);

function UsageMeter({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value.toFixed(1)}%
        </span>
      </div>
      <Progress
        value={value}
        indicatorClassName={
          value >= 90
            ? 'bg-red-500'
            : value >= 75
              ? 'bg-amber-500'
              : 'bg-primary'
        }
      />
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function BillingPage() {
  const billing = useWorkspaceBilling();
  if (billing.isLoading) return <DashboardLoading rows={4} />;
  if (billing.isError || !billing.data)
    return (
      <DashboardError
        message={
          billing.error instanceof Error
            ? billing.error.message
            : 'Billing and usage API is unavailable.'
        }
        onRetry={() => billing.refetch()}
      />
    );

  const { plan, billing: cycle, usage, invoices } = billing.data;
  const price = formatMoney(plan.monthlyPriceCents, plan.currency);
  const apiCost = formatMoney(cycle.estimatedApiCostCents, plan.currency);
  const estimatedTotal = formatMoney(cycle.estimatedTotalCents, plan.currency);

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Workspace account"
        title="Billing & usage"
        description="Review your current plan, live message consumption, API cost estimate, and billing records."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/settings">
              <ServerCog className="mr-2 h-4 w-4" />
              Workspace settings
            </Link>
          </Button>
        }
      />

      {!cycle.pricingConfigured && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <WalletCards className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Commercial pricing is not configured</p>
            <p className="mt-0.5 text-xs leading-5 text-amber-800">
              Usage is live, while plan and API costs currently resolve to zero.
              Configure the BILLING_* environment values before issuing customer
              invoices.
            </p>
          </div>
        </div>
      )}

      {!['active', 'trialing'].includes(plan.status) && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              Messaging is unavailable: subscription{' '}
              {plan.status.replaceAll('_', ' ')}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-red-800">
              Contact your platform administrator to renew or resume service.
              {plan.subscriptionSuspensionReason
                ? ` Reason: ${plan.subscriptionSuspensionReason}`
                : ''}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Current plan"
          value={plan.name}
          detail={`${compact(plan.dailyMessageLimit)} outbound messages per day`}
          icon={CreditCard}
        />
        <DashboardStat
          label="Estimated bill"
          value={estimatedTotal}
          detail={`${price} plan + ${apiCost} API usage`}
          icon={ReceiptText}
          tone="blue"
        />
        <DashboardStat
          label="API usage"
          value={compact(usage.outboundMessages)}
          detail={`${compact(usage.projectedOutbound)} projected this month`}
          icon={MessageSquareText}
          tone="violet"
        />
        <DashboardStat
          label="Delivery rate"
          value={`${usage.deliveryRate.toFixed(1)}%`}
          detail={`${compact(usage.deliveredMessages)} delivered this period`}
          icon={Gauge}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-slate-50/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{plan.name} plan</CardTitle>
                <CardDescription className="mt-1">
                  Current UTC billing cycle: {formatDate(cycle.periodStart)} –{' '}
                  {formatDate(cycle.periodEnd)}
                </CardDescription>
              </div>
              <Badge
                variant={
                  plan.status === 'active'
                    ? 'success'
                    : plan.status === 'trialing'
                      ? 'blue'
                      : plan.status === 'past_due'
                        ? 'warning'
                        : 'danger'
                }
                className="w-fit capitalize"
              >
                {plan.status.replaceAll('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-7 p-6">
            <UsageMeter
              label="Today’s outbound usage"
              value={usage.dailyUsagePercent}
              detail={`${usage.todayOutbound.toLocaleString()} used · ${usage.todayRemaining.toLocaleString()} remaining of ${plan.dailyMessageLimit.toLocaleString()}`}
            />
            <UsageMeter
              label="Monthly allowance"
              value={usage.monthlyUsagePercent}
              detail={`${usage.outboundMessages.toLocaleString()} used of ${plan.monthlyMessageAllowance.toLocaleString()} calculated allowance`}
            />
            <div className="grid gap-4 border-t pt-5 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Rate limit</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {plan.rateLimitPerMinute.toLocaleString()} / minute
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Renewal date</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDate(plan.subscriptionEndsAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique contacts</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {usage.uniqueContacts.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed messages</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {usage.failedMessages.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Cost breakdown</CardTitle>
            <CardDescription>
              Estimated from live outbound message usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-medium">{plan.name} plan</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Monthly base price
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {price}
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-medium">API usage</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(cycle.apiCostPerThousandCents, plan.currency)}{' '}
                  per 1,000 outbound messages
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {apiCost}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold">Estimated total</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Final amount may change before cycle close.
                </p>
              </div>
              <span className="text-xl font-semibold tabular-nums">
                {estimatedTotal}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Next billing date: {formatDate(cycle.nextBillingAt)} ·{' '}
              {cycle.provider === 'manual' ? 'Manual billing' : cycle.provider}
            </div>
            <p className="rounded-lg border bg-white p-3 text-xs leading-5 text-muted-foreground">
              This estimate covers Nexora plan and configured API metering only.
              Hosting, infrastructure, and third-party provider costs are not
              included.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden shadow-sm">
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
          <CardDescription>
            Issued billing records for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className={invoices.length ? 'px-0 pb-0' : 'pt-0'}>
          {invoices.length ? (
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="pl-6">Invoice</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="pl-6 font-medium">
                      {invoice.number}
                    </TableCell>
                    <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'paid' ? 'success' : 'outline'
                        }
                        className="capitalize"
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 font-medium tabular-nums">
                      {formatMoney(invoice.amountCents, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="No invoices issued"
              description={
                cycle.provider === 'manual'
                  ? 'Manual billing is active. Invoices will appear after they are issued by the platform administrator.'
                  : 'Your first invoice will appear here when the billing cycle closes.'
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
