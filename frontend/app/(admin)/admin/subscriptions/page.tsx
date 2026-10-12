'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Gauge,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  ShieldBan,
} from 'lucide-react';
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  DashboardStat,
  EmptyState,
} from '@/components/dashboard-page';
import {
  DataTablePagination,
  DataTableToolbar,
  pageSlice,
  RecordDetailsDialog,
  RowActionsMenu,
} from '@/components/dashboard-table';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import {
  type AdminSubscription,
  type AdminPlan,
  type SubscriptionStatus,
  queryKeys,
  useAdminPlans,
  useAdminSubscriptions,
} from '@/lib/queries';

type SubscriptionForm = {
  subscriptionPlanId: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt: string;
  subscriptionAutoRenew: boolean;
  dailyMessageLimit: string;
  rateLimitPerMinute: string;
};

type PlanForm = {
  name: string;
  slug: string;
  description: string;
  monthlyPrice: string;
  trialDays: string;
  currency: string;
  dailyMessageLimit: string;
  rateLimitPerMinute: string;
  isActive: boolean;
  isPublic: boolean;
  syncAssignedLimits: boolean;
};

const emptyPlanForm: PlanForm = {
  name: '',
  slug: '',
  description: '',
  monthlyPrice: '',
  trialDays: '14',
  currency: 'USD',
  dailyMessageLimit: '1000',
  rateLimitPerMinute: '60',
  isActive: true,
  isPublic: true,
  syncAssignedLimits: false,
};

const statusLabel = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusVariant = (value: SubscriptionStatus): BadgeProps['variant'] => {
  if (value === 'active') return 'success';
  if (value === 'trialing') return 'blue';
  if (value === 'past_due') return 'warning';
  return 'danger';
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : 'No expiry';

const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);

const toDateInput = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

function formFromSubscription(item: AdminSubscription): SubscriptionForm {
  return {
    subscriptionPlanId: item.subscriptionPlanId || '',
    subscriptionStatus: item.subscriptionStatus,
    subscriptionEndsAt: toDateInput(item.subscriptionEndsAt),
    subscriptionAutoRenew: item.subscriptionAutoRenew,
    dailyMessageLimit: String(item.dailyMessageLimit),
    rateLimitPerMinute: String(item.rateLimitPerMinute),
  };
}

export default function AdminSubscriptionsPage() {
  const query = useAdminSubscriptions();
  const plans = useAdminPlans();
  const queryClient = useQueryClient();
  const selectedFromUrl = useRef(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [details, setDetails] = useState<AdminSubscription | null>(null);
  const [editing, setEditing] = useState<AdminSubscription | null>(null);
  const [renewing, setRenewing] = useState<AdminSubscription | null>(null);
  const [suspending, setSuspending] = useState<AdminSubscription | null>(null);
  const [accountAction, setAccountAction] = useState<AdminSubscription | null>(
    null,
  );
  const [form, setForm] = useState<SubscriptionForm | null>(null);
  const [renewMonths, setRenewMonths] = useState('1');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [planEditor, setPlanEditor] = useState<AdminPlan | 'new' | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);

  const refreshPortfolio = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSubscriptions }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTenants }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAudit }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) =>
      apiFetch(`/admin/tenants/${id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      setEditing(null);
      setForm(null);
      await refreshPortfolio();
    },
  });
  const renewMutation = useMutation({
    mutationFn: ({ id, months }: { id: string; months: number }) =>
      apiFetch(`/admin/tenants/${id}/subscription/renew`, {
        method: 'POST',
        body: JSON.stringify({ months }),
      }),
    onSuccess: async () => {
      setRenewing(null);
      await refreshPortfolio();
    },
  });
  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/admin/tenants/${id}/subscription/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      }),
    onSuccess: async () => {
      setSuspending(null);
      setSuspensionReason('');
      await refreshPortfolio();
    },
  });
  const resumeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/tenants/${id}/subscription/resume`, { method: 'POST' }),
    onSuccess: refreshPortfolio,
  });
  const accountMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'suspend' | 'activate';
    }) => apiFetch(`/tenants/${id}/${action}`, { method: 'POST' }),
    onSuccess: async () => {
      setAccountAction(null);
      await refreshPortfolio();
    },
  });
  const savePlanMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id?: string;
      payload: Record<string, unknown>;
    }) =>
      apiFetch(id ? `/admin/plans/${id}` : '/admin/plans', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      setPlanEditor(null);
      setPlanForm(emptyPlanForm);
      await refreshPortfolio();
    },
  });
  const planStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/admin/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: refreshPortfolio,
  });

  const filtered = useMemo(
    () =>
      (query.data?.subscriptions || []).filter((item) => {
        const matchesSearch =
          `${item.companyName} ${item.slug} ${item.planName} ${item.planSlug}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStatus =
          status === 'all' || item.effectiveSubscriptionStatus === status;
        const matchesPlan = plan === 'all' || item.planSlug === plan;
        return matchesSearch && matchesStatus && matchesPlan;
      }),
    [query.data, search, status, plan],
  );
  const rows = pageSlice(filtered, page, pageSize);

  useEffect(() => {
    if (selectedFromUrl.current || !query.data || !plans.data) return;
    selectedFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create-plan') {
      setPlanEditor('new');
      setPlanForm(emptyPlanForm);
    }
    const tenantId = params.get('tenant');
    const item = query.data.subscriptions.find(
      (entry) => entry.id === tenantId,
    );
    if (item) {
      setEditing(item);
      setForm(formFromSubscription(item));
    }
  }, [query.data, plans.data]);

  if (query.isLoading || plans.isLoading) return <DashboardLoading rows={5} />;
  if (query.isError || plans.isError || !query.data || !plans.data) {
    return (
      <DashboardError
        title="Subscription portfolio is unavailable"
        message={
          query.error instanceof Error
            ? query.error.message
            : plans.error instanceof Error
              ? plans.error.message
              : 'The subscriptions API did not respond.'
        }
        onRetry={() => {
          void query.refetch();
          void plans.refetch();
        }}
      />
    );
  }

  const { stats, currency, pricingConfigured } = query.data;
  const busy =
    updateMutation.isPending ||
    renewMutation.isPending ||
    suspendMutation.isPending ||
    resumeMutation.isPending ||
    accountMutation.isPending;
  const operationError =
    updateMutation.error ||
    renewMutation.error ||
    suspendMutation.error ||
    resumeMutation.error ||
    accountMutation.error;

  function openPlanEditor(item?: AdminPlan) {
    savePlanMutation.reset();
    if (!item) {
      setPlanEditor('new');
      setPlanForm(emptyPlanForm);
      return;
    }
    setPlanEditor(item);
    setPlanForm({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      monthlyPrice: String(item.monthlyPriceCents / 100),
      trialDays: String(item.trialDays),
      currency: item.currency,
      dailyMessageLimit: String(item.dailyMessageLimit),
      rateLimitPerMinute: String(item.rateLimitPerMinute),
      isActive: item.isActive,
      isPublic: item.isPublic,
      syncAssignedLimits: false,
    });
  }

  function savePlan() {
    if (!planEditor) return;
    savePlanMutation.mutate({
      id: planEditor === 'new' ? undefined : planEditor.id,
      payload: {
        name: planForm.name,
        slug: planForm.slug || undefined,
        description: planForm.description || undefined,
        monthlyPriceCents: Math.round(Number(planForm.monthlyPrice || 0) * 100),
        trialDays: Number(planForm.trialDays),
        currency: planForm.currency.toUpperCase(),
        dailyMessageLimit: Number(planForm.dailyMessageLimit),
        rateLimitPerMinute: Number(planForm.rateLimitPerMinute),
        isActive: planForm.isActive,
        isPublic: planForm.isPublic,
        syncAssignedLimits: planForm.syncAssignedLimits,
      },
    });
  }

  function openEdit(item: AdminSubscription) {
    updateMutation.reset();
    setEditing(item);
    setForm(formFromSubscription(item));
  }

  function saveSubscription() {
    if (!editing || !form) return;
    updateMutation.mutate({
      id: editing.id,
      payload: {
        subscriptionPlanId: form.subscriptionPlanId,
        subscriptionStatus: form.subscriptionStatus,
        subscriptionEndsAt: form.subscriptionEndsAt
          ? new Date(`${form.subscriptionEndsAt}T23:59:59.999Z`).toISOString()
          : null,
        subscriptionAutoRenew: form.subscriptionAutoRenew,
        dailyMessageLimit: Number(form.dailyMessageLimit),
        rateLimitPerMinute: Number(form.rateLimitPerMinute),
      },
    });
  }

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Revenue operations"
        title="Plans & subscriptions"
        description="Control organization access, renewal periods and messaging capacity from one audited workspace."
        actions={
          <>
            <Button onClick={() => openPlanEditor()}>
              <Plus className="mr-2 h-4 w-4" />
              Create plan
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void query.refetch();
                void plans.refetch();
              }}
              disabled={query.isFetching || plans.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${query.isFetching || plans.isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Monthly recurring revenue"
          value={formatMoney(stats.monthlyRecurringRevenueCents, currency)}
          detail={
            pricingConfigured
              ? 'Active and collectible plans'
              : 'Add billing prices in backend environment'
          }
          icon={CreditCard}
          tone="violet"
        />
        <DashboardStat
          label="Active subscriptions"
          value={stats.active.toLocaleString()}
          detail={`${stats.trialing} currently trialing`}
          icon={Gauge}
        />
        <DashboardStat
          label="Needs attention"
          value={stats.attention.toLocaleString()}
          detail="Past due, suspended or expired"
          icon={AlertTriangle}
          tone={stats.attention ? 'red' : 'green'}
        />
        <DashboardStat
          label="Renewing soon"
          value={stats.expiringSoon.toLocaleString()}
          detail="Periods ending in the next 7 days"
          icon={CalendarClock}
          tone="amber"
        />
      </div>

      {!pricingConfigured && (
        <Card className="mt-5 rounded-xl border-blue-200 bg-blue-50/60 shadow-none">
          <CardContent className="flex gap-3 p-4 text-sm text-blue-900">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                Revenue reporting is ready for your prices
              </p>
              <p className="mt-1 text-blue-700">
                Edit the plan catalog below and set monthly prices to calculate
                live MRR. Existing organizations keep their current access until
                you change their assigned plan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Product catalog
            </p>
            <h2 className="mt-1 text-base font-semibold">Subscription plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Define pricing and default capacity once, then assign the plan to
              any organization.
            </p>
          </div>
          <Button size="sm" onClick={() => openPlanEditor()}>
            <PackagePlus className="mr-2 h-4 w-4" />
            New plan
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data.map((item) => (
            <Card
              key={item.id}
              className={`overflow-hidden rounded-xl shadow-sm ${item.isActive ? '' : 'bg-slate-50 opacity-75'}`}
            >
              <CardHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate">{item.name}</CardTitle>
                      <Badge variant={item.isActive ? 'success' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1 line-clamp-2 min-h-10">
                      {item.description || 'No plan description added.'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => openPlanEditor(item)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit {item.name}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {formatMoney(item.monthlyPriceCents, item.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      per organization / month
                    </p>
                  </div>
                  <Badge variant="outline">
                    {item.isPublic ? 'Public' : 'Private'}
                  </Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Daily messages
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {item.dailyMessageLimit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      API / minute
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {item.rateLimitPerMinute.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {item.trialDays > 0
                    ? `${item.trialDays}-day free trial`
                    : 'Free trial disabled'}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {item.organizationCount} organization
                    {item.organizationCount === 1 ? '' : 's'} assigned
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={planStatusMutation.isPending}
                    onClick={() =>
                      planStatusMutation.mutate({
                        id: item.id,
                        isActive: !item.isActive,
                      })
                    }
                  >
                    {item.isActive ? 'Archive' : 'Restore'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-1">
          <h2 className="text-base font-semibold">Subscription portfolio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily usage is live. Subscription suspension stops sending while
            account blocking stops all tenant access.
          </p>
        </div>
        <DataTableToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder="Search organization or plan..."
        >
          <select
            className="h-9 rounded-md border bg-white px-3 text-sm"
            value={plan}
            onChange={(event) => {
              setPlan(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All plans</option>
            {plans.data.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
                {item.isActive ? '' : ' (archived)'}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-white px-3 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All subscription states</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </DataTableToolbar>

        <div className="overflow-hidden rounded-xl border bg-white">
          {rows.length ? (
            <Table className="min-w-[1180px]">
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Organization</TableHead>
                  <TableHead>Plan & status</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead className="w-56">Daily usage</TableHead>
                  <TableHead>API capacity</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => setDetails(item)}
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold">
                          {item.companyName
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-56 truncate text-sm font-medium">
                            {item.companyName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.activeUsers} active users
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">{item.planName}</p>
                        <Badge
                          variant={statusVariant(
                            item.effectiveSubscriptionStatus,
                          )}
                        >
                          {statusLabel(item.effectiveSubscriptionStatus)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {formatDate(item.subscriptionEndsAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.daysRemaining === null
                          ? 'Manual / no fixed term'
                          : item.daysRemaining < 0
                            ? `${Math.abs(item.daysRemaining)} days overdue`
                            : `${item.daysRemaining} days remaining`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium tabular-nums">
                            {item.todayUsage.toLocaleString()} sent
                          </span>
                          <span className="text-muted-foreground">
                            {item.dailyMessageLimit.toLocaleString()} limit
                          </span>
                        </div>
                        <Progress
                          value={item.dailyUsagePercent}
                          indicatorClassName={
                            item.dailyUsagePercent >= 90
                              ? 'bg-red-500'
                              : item.dailyUsagePercent >= 70
                                ? 'bg-amber-500'
                                : undefined
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium tabular-nums">
                        {item.rateLimitPerMinute.toLocaleString()} / min
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.currentPeriodMessages.toLocaleString()} this month
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.accountStatus === 'active' ? 'outline' : 'danger'
                        }
                      >
                        {item.accountStatus === 'active'
                          ? 'Access enabled'
                          : 'Blocked'}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <RowActionsMenu
                        label={item.companyName}
                        actions={[
                          {
                            label: 'View subscription',
                            onSelect: () => setDetails(item),
                          },
                          {
                            label: 'Edit plan & limits',
                            onSelect: () => openEdit(item),
                          },
                          {
                            label: 'Renew subscription',
                            onSelect: () => {
                              renewMutation.reset();
                              setRenewMonths('1');
                              setRenewing(item);
                            },
                          },
                          item.effectiveSubscriptionStatus === 'suspended'
                            ? {
                                label: 'Resume subscription',
                                disabled: busy,
                                onSelect: () => resumeMutation.mutate(item.id),
                              }
                            : {
                                label: 'Suspend subscription',
                                destructive: true,
                                disabled: busy,
                                onSelect: () => {
                                  suspendMutation.reset();
                                  setSuspending(item);
                                },
                              },
                          {
                            label:
                              item.accountStatus === 'active'
                                ? 'Block organization'
                                : 'Unblock organization',
                            destructive: item.accountStatus === 'active',
                            separatorBefore: true,
                            disabled: busy,
                            onSelect: () => {
                              accountMutation.reset();
                              setAccountAction(item);
                            },
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={CreditCard}
                title="No subscriptions found"
                description="Adjust the search or filters to see more organizations."
              />
            </div>
          )}
          <DataTablePagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>
      </section>

      {details && (
        <RecordDetailsDialog
          open
          onOpenChange={(open) => !open && setDetails(null)}
          icon={CreditCard}
          title={details.companyName}
          description={details.slug}
          badge={
            <Badge variant={statusVariant(details.effectiveSubscriptionStatus)}>
              {statusLabel(details.effectiveSubscriptionStatus)}
            </Badge>
          }
          sections={[
            {
              title: 'Subscription',
              fields: [
                { label: 'Plan', value: details.planName },
                {
                  label: 'Status',
                  value: statusLabel(details.effectiveSubscriptionStatus),
                },
                {
                  label: 'Started',
                  value: formatDate(details.subscriptionStartedAt),
                },
                {
                  label: 'Period ends',
                  value: formatDate(details.subscriptionEndsAt),
                },
                {
                  label: 'Auto renew',
                  value: details.subscriptionAutoRenew ? 'Enabled' : 'Disabled',
                },
                {
                  label: 'Last renewed',
                  value: formatDate(details.subscriptionLastRenewedAt),
                },
              ],
            },
            {
              title: 'Usage controls',
              fields: [
                {
                  label: 'Today',
                  value: `${details.todayUsage.toLocaleString()} / ${details.dailyMessageLimit.toLocaleString()} messages`,
                },
                {
                  label: 'Daily remaining',
                  value: details.todayRemaining.toLocaleString(),
                },
                {
                  label: 'Per-minute limit',
                  value: details.rateLimitPerMinute.toLocaleString(),
                },
                {
                  label: 'Current month',
                  value: details.currentPeriodMessages.toLocaleString(),
                },
              ],
            },
            {
              title: 'Access & revenue',
              fields: [
                {
                  label: 'Organization access',
                  value: statusLabel(details.accountStatus),
                },
                {
                  label: 'WhatsApp',
                  value: statusLabel(details.whatsappStatus),
                },
                {
                  label: 'Monthly plan value',
                  value: formatMoney(
                    details.monthlyPriceCents,
                    details.currency,
                  ),
                },
                {
                  label: 'Suspension reason',
                  value: details.subscriptionSuspensionReason || '—',
                },
              ],
            },
          ]}
        />
      )}

      <Dialog
        open={Boolean(planEditor)}
        onOpenChange={(open) => !open && setPlanEditor(null)}
      >
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogHeader className="border-b px-6 py-5 pr-14">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary">
                <PackagePlus className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle>
                  {planEditor === 'new'
                    ? 'Create subscription plan'
                    : 'Edit subscription plan'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Set commercial pricing and the default messaging capacity for
                  this plan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid max-h-[68vh] gap-5 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Plan name
              <Input
                autoFocus
                value={planForm.name}
                onChange={(event) =>
                  setPlanForm({ ...planForm, name: event.target.value })
                }
                placeholder="Growth"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Slug
              <Input
                value={planForm.slug}
                onChange={(event) =>
                  setPlanForm({
                    ...planForm,
                    slug: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ''),
                  })
                }
                placeholder="Generated from name"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Description
              <Textarea
                value={planForm.description}
                onChange={(event) =>
                  setPlanForm({ ...planForm, description: event.target.value })
                }
                placeholder="Who this plan is for and what it includes."
                className="min-h-20"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Monthly price
              <div className="flex">
                <select
                  className="h-10 rounded-l-md border border-r-0 bg-slate-50 px-3 text-sm font-normal"
                  value={planForm.currency}
                  onChange={(event) =>
                    setPlanForm({ ...planForm, currency: event.target.value })
                  }
                >
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={planForm.monthlyPrice}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      monthlyPrice: event.target.value,
                    })
                  }
                  placeholder="49.00"
                  className="rounded-l-none"
                />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Free trial days
              <Input
                type="number"
                min={0}
                max={365}
                value={planForm.trialDays}
                onChange={(event) =>
                  setPlanForm({ ...planForm, trialDays: event.target.value })
                }
              />
              <span className="text-xs font-normal text-muted-foreground">
                Use 0 to disable the free trial for this paid plan.
              </span>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Daily message limit
              <Input
                type="number"
                min={1}
                max={1000000}
                value={planForm.dailyMessageLimit}
                onChange={(event) =>
                  setPlanForm({
                    ...planForm,
                    dailyMessageLimit: event.target.value,
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              API messages per minute
              <Input
                type="number"
                min={1}
                max={10000}
                value={planForm.rateLimitPerMinute}
                onChange={(event) =>
                  setPlanForm({
                    ...planForm,
                    rateLimitPerMinute: event.target.value,
                  })
                }
              />
            </label>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={(event) =>
                    setPlanForm({ ...planForm, isActive: event.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-emerald-700"
                />
                <span>
                  <span className="block text-sm font-medium">Active plan</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Available for new organization assignments.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={planForm.isPublic}
                  onChange={(event) =>
                    setPlanForm({ ...planForm, isPublic: event.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-emerald-700"
                />
                <span>
                  <span className="block text-sm font-medium">Public plan</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Shown on the public home-page pricing section.
                  </span>
                </span>
              </label>
            </div>
            {planEditor !== 'new' && (
              <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={planForm.syncAssignedLimits}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      syncAssignedLimits: event.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 accent-blue-700"
                />
                <span>
                  <span className="block text-sm font-medium text-blue-950">
                    Apply quota changes to assigned organizations
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-blue-800">
                    Updates daily and per-minute limits for every organization
                    currently using this plan. Leave off to preserve custom
                    overrides.
                  </span>
                </span>
              </label>
            )}
            {savePlanMutation.isError && (
              <p className="text-sm text-red-600 sm:col-span-2">
                {savePlanMutation.error instanceof Error
                  ? savePlanMutation.error.message
                  : 'Unable to save this plan.'}
              </p>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setPlanEditor(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !planForm.name.trim() ||
                !planForm.dailyMessageLimit ||
                !planForm.rateLimitPerMinute ||
                savePlanMutation.isPending
              }
              onClick={savePlan}
            >
              {savePlanMutation.isPending
                ? 'Saving…'
                : planEditor === 'new'
                  ? 'Create plan'
                  : 'Save plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogHeader className="border-b px-6 py-5 pr-14">
            <DialogTitle>Edit plan & usage controls</DialogTitle>
            <DialogDescription className="mt-1">
              {editing?.companyName} · Changes apply to API and dashboard sends
              immediately.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid max-h-[65vh] gap-5 overflow-y-auto px-6 py-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Plan
                <select
                  className="h-10 rounded-md border bg-white px-3 font-normal"
                  value={form.subscriptionPlanId}
                  onChange={(event) => {
                    const selected = plans.data.find(
                      (item) => item.id === event.target.value,
                    );
                    setForm({
                      ...form,
                      subscriptionPlanId: event.target.value,
                      dailyMessageLimit: selected
                        ? String(selected.dailyMessageLimit)
                        : form.dailyMessageLimit,
                      rateLimitPerMinute: selected
                        ? String(selected.rateLimitPerMinute)
                        : form.rateLimitPerMinute,
                    });
                  }}
                >
                  <option value="" disabled>
                    Select a plan
                  </option>
                  {plans.data
                    .filter(
                      (item) =>
                        item.isActive || item.id === form.subscriptionPlanId,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.isActive ? '' : ' (archived)'}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Subscription status
                <select
                  className="h-10 rounded-md border bg-white px-3 font-normal"
                  value={form.subscriptionStatus}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      subscriptionStatus: event.target
                        .value as SubscriptionStatus,
                    })
                  }
                >
                  <option value="trialing">Trialing</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past due</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Renewal / period end
                <Input
                  type="date"
                  value={form.subscriptionEndsAt}
                  onChange={(event) =>
                    setForm({ ...form, subscriptionEndsAt: event.target.value })
                  }
                />
                <span className="text-xs font-normal text-muted-foreground">
                  Leave empty for a subscription without a fixed expiry.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Daily message limit
                <Input
                  type="number"
                  min={1}
                  max={1000000}
                  value={form.dailyMessageLimit}
                  onChange={(event) =>
                    setForm({ ...form, dailyMessageLimit: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                API messages per minute
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={form.rateLimitPerMinute}
                  onChange={(event) =>
                    setForm({ ...form, rateLimitPerMinute: event.target.value })
                  }
                />
              </label>
              <label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.subscriptionAutoRenew}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      subscriptionAutoRenew: event.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 accent-emerald-700"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Auto-renew enabled
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Records the commercial renewal policy. Payment collection
                    remains with the configured billing provider.
                  </span>
                </span>
              </label>
              {updateMutation.isError && (
                <p className="text-sm text-red-600 sm:col-span-2">
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : 'Unable to update subscription.'}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !form?.subscriptionPlanId ||
                !form?.dailyMessageLimit ||
                !form?.rateLimitPerMinute ||
                updateMutation.isPending
              }
              onClick={saveSubscription}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renewing)}
        onOpenChange={(open) => !open && setRenewing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew subscription</DialogTitle>
            <DialogDescription>
              Extend {renewing?.companyName}&apos;s service period. An expired
              subscription will resume automatically.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-medium">
            Renewal term
            <select
              className="h-10 rounded-md border bg-white px-3 font-normal"
              value={renewMonths}
              onChange={(event) => setRenewMonths(event.target.value)}
            >
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>
          </label>
          {renewMutation.isError && (
            <p className="text-sm text-red-600">
              {renewMutation.error instanceof Error
                ? renewMutation.error.message
                : 'Renewal failed.'}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewing(null)}>
              Cancel
            </Button>
            <Button
              disabled={renewMutation.isPending}
              onClick={() =>
                renewing &&
                renewMutation.mutate({
                  id: renewing.id,
                  months: Number(renewMonths),
                })
              }
            >
              {renewMutation.isPending
                ? 'Renewing…'
                : `Renew for ${renewMonths} month${renewMonths === '1' ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(suspending)}
        onOpenChange={(open) => !open && setSuspending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend messaging service?</DialogTitle>
            <DialogDescription>
              {suspending?.companyName} will be signed out. Login, API, inbox,
              broadcasts, and queued message delivery will remain blocked until
              the subscription is resumed.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-medium">
            Reason
            <Input
              value={suspensionReason}
              onChange={(event) => setSuspensionReason(event.target.value)}
              placeholder="For example: payment overdue"
            />
          </label>
          {suspendMutation.isError && (
            <p className="text-sm text-red-600">
              {suspendMutation.error instanceof Error
                ? suspendMutation.error.message
                : 'Suspension failed.'}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspending(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={suspendMutation.isPending}
              onClick={() =>
                suspending &&
                suspendMutation.mutate({
                  id: suspending.id,
                  reason: suspensionReason,
                })
              }
            >
              {suspendMutation.isPending
                ? 'Suspending…'
                : 'Suspend subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(accountAction)}
        onOpenChange={(open) => !open && setAccountAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ShieldBan className="h-5 w-5" />
            </span>
            <DialogTitle>
              {accountAction?.accountStatus === 'active'
                ? 'Block organization access?'
                : 'Restore organization access?'}
            </DialogTitle>
            <DialogDescription>
              {accountAction?.accountStatus === 'active'
                ? `${accountAction?.companyName} users will be unable to sign in and all API access will stop.`
                : `${accountAction?.companyName} users will be able to sign in again. Subscription rules will still apply.`}
            </DialogDescription>
          </DialogHeader>
          {accountMutation.isError && (
            <p className="text-sm text-red-600">
              {accountMutation.error instanceof Error
                ? accountMutation.error.message
                : 'Account update failed.'}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountAction(null)}>
              Cancel
            </Button>
            <Button
              variant={
                accountAction?.accountStatus === 'active' ? 'danger' : 'default'
              }
              disabled={accountMutation.isPending}
              onClick={() =>
                accountAction &&
                accountMutation.mutate({
                  id: accountAction.id,
                  action:
                    accountAction.accountStatus === 'active'
                      ? 'suspend'
                      : 'activate',
                })
              }
            >
              {accountMutation.isPending
                ? 'Updating…'
                : accountAction?.accountStatus === 'active'
                  ? 'Block organization'
                  : 'Restore access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {operationError &&
        !editing &&
        !renewing &&
        !suspending &&
        !accountAction && (
          <p className="mt-4 text-sm text-red-600">
            {operationError instanceof Error
              ? operationError.message
              : 'The requested operation failed.'}
          </p>
        )}
    </div>
  );
}
