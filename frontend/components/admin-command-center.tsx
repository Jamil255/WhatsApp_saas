'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CreditCard,
  FileClock,
  Globe2,
  MessageSquare,
  MousePointer2,
  ShieldCheck,
  UserRoundCog,
  Users,
  Wifi,
} from 'lucide-react';
import { AdminVisitorChart } from '@/components/admin-visitor-chart';
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
import {
  useAdminAudit,
  useAdminOverview,
  useAdminSubscriptions,
  useAdminTenants,
  useAdminUsers,
  useAdminVisitors,
} from '@/lib/queries';

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
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'Never';
const humanize = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);

export function AdminCommandCenter() {
  const overview = useAdminOverview();
  const tenants = useAdminTenants();
  const users = useAdminUsers();
  const visitors = useAdminVisitors();
  const subscriptions = useAdminSubscriptions();
  const audit = useAdminAudit();
  const required = [overview, tenants, users, visitors, subscriptions];
  if (required.some((query) => query.isLoading))
    return <DashboardLoading rows={6} />;
  if (
    required.some((query) => query.isError) ||
    !overview.data ||
    !tenants.data ||
    !users.data ||
    !visitors.data ||
    !subscriptions.data
  )
    return (
      <DashboardError
        title="Platform command center is unavailable"
        message="One or more admin services did not respond. No placeholder data is being shown."
        onRetry={() => {
          void overview.refetch();
          void tenants.refetch();
          void users.refetch();
          void visitors.refetch();
          void subscriptions.refetch();
          void audit.refetch();
        }}
      />
    );

  const activeOrganizations = tenants.data.filter(
    (tenant) => tenant.status === 'active',
  ).length;
  const connectedOrganizations = tenants.data.filter(
    (tenant) => tenant.whatsappSession?.status === 'connected',
  ).length;
  const tenantPeople = overview.data.tenantAdmins + overview.data.tenantAgents;
  const recentOrganizations = tenants.data.slice(0, 5);
  const recentUsers = users.data.users.slice(0, 6);
  const roleTotal = Math.max(overview.data.totalUsers, 1);
  const lifecycle = [
    {
      label: 'Visitors',
      value: overview.data.totalVisitors,
      detail: `${overview.data.visitorsToday} seen today`,
      href: '/admin/visitors',
      icon: MousePointer2,
      tone: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Organizations',
      value: overview.data.totalTenants,
      detail: `${activeOrganizations} active accounts`,
      href: '/admin/organizations',
      icon: Building2,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Tenant people',
      value: tenantPeople,
      detail: `${overview.data.tenantAdmins} account owners`,
      href: '/admin/users',
      icon: Users,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Connected teams',
      value: overview.data.activeSessions,
      detail: `${overview.data.totalMessages.toLocaleString()} messages handled`,
      href: '/admin/messages',
      icon: Wifi,
      tone: 'bg-emerald-50 text-emerald-700',
    },
  ];

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Platform CRM"
        title="Command center"
        description="Follow the complete customer lifecycle—from first website visit to an active WhatsApp workspace."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/health">System health</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/subscriptions">Manage subscriptions</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/subscriptions?action=create-plan">
                Create plan
              </Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Unique visitors"
          value={compact(overview.data.totalVisitors)}
          detail={`${overview.data.visitorsToday} active today`}
          icon={Globe2}
          tone="violet"
        />
        <DashboardStat
          label="Organizations"
          value={compact(overview.data.totalTenants)}
          detail={`${activeOrganizations} active · ${connectedOrganizations} connected`}
          icon={Building2}
          tone="blue"
        />
        <DashboardStat
          label="Platform users"
          value={compact(overview.data.totalUsers)}
          detail={`${overview.data.activeUsers} active accounts`}
          icon={Users}
        />
        <DashboardStat
          label="Messages processed"
          value={compact(overview.data.totalMessages)}
          detail={`${overview.data.activeSessions} live WhatsApp sessions`}
          icon={MessageSquare}
          tone="amber"
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Customer lifecycle</CardTitle>
              <CardDescription>
                The operating flow your admin team manages every day.
              </CardDescription>
            </div>
            <Badge variant="success" className="w-fit">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live platform data
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-4">
            {lifecycle.map((step, index) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.label}
                  href={step.href}
                  className="group relative border-b p-5 transition-colors hover:bg-slate-50 lg:border-b-0 lg:border-r lg:last:border-r-0"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-5 text-xs font-medium text-muted-foreground">
                    {step.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                    {step.value.toLocaleString()}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {step.detail}
                    </p>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="flex-row items-start justify-between border-b">
          <div>
            <CardTitle>Subscription health</CardTitle>
            <CardDescription>
              Revenue, renewal exposure and service access across every
              organization.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/subscriptions">Open billing control</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-px bg-slate-200 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Monthly recurring revenue',
              value: formatMoney(
                subscriptions.data.stats.monthlyRecurringRevenueCents,
                subscriptions.data.currency,
              ),
              detail: subscriptions.data.pricingConfigured
                ? 'Collectible subscriptions'
                : 'Pricing not configured',
              icon: CreditCard,
              tone: 'text-violet-600',
            },
            {
              label: 'Active service',
              value: subscriptions.data.stats.active.toLocaleString(),
              detail: `${subscriptions.data.stats.trialing} trials in progress`,
              icon: ShieldCheck,
              tone: 'text-emerald-600',
            },
            {
              label: 'Renewing in 7 days',
              value: subscriptions.data.stats.expiringSoon.toLocaleString(),
              detail: 'Requires renewal follow-up',
              icon: CalendarClock,
              tone: 'text-amber-600',
            },
            {
              label: 'Needs attention',
              value: subscriptions.data.stats.attention.toLocaleString(),
              detail: 'Past due, suspended or expired',
              icon: AlertTriangle,
              tone: subscriptions.data.stats.attention
                ? 'text-red-600'
                : 'text-emerald-600',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href="/admin/subscriptions"
                className="group bg-white p-5 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className={`h-4 w-4 ${item.tone}`} />
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
                  {item.value}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Visitor acquisition</CardTitle>
              <CardDescription>
                New unique visitors during the last seven days.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/visitors">View visitors</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AdminVisitorChart activity={visitors.data.activity} compact />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access composition</CardTitle>
            <CardDescription>
              Who can operate the platform and tenant workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                label: 'Platform admins',
                value: overview.data.platformAdmins,
                icon: ShieldCheck,
                color: 'bg-violet-500',
              },
              {
                label: 'Tenant admins',
                value: overview.data.tenantAdmins,
                icon: UserRoundCog,
                color: 'bg-blue-500',
              },
              {
                label: 'Tenant users',
                value: overview.data.tenantAgents,
                icon: Users,
                color: 'bg-emerald-500',
              },
            ].map((item) => {
              const Icon = item.icon;
              const percentage = Math.round((item.value / roleTotal) * 100);
              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {item.value}
                    </span>
                    <span className="w-9 text-right text-xs text-muted-foreground">
                      {percentage}%
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-1.5"
                    indicatorClassName={item.color}
                  />
                </div>
              );
            })}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/admin/users">Open user directory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.8fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Organization portfolio</CardTitle>
              <CardDescription>
                Newest accounts with people, usage, and connection context.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/organizations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentOrganizations.length ? (
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Organization</TableHead>
                    <TableHead>People</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrganizations.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="pl-5">
                        <Link
                          href="/admin/organizations"
                          className="flex items-center gap-3"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold">
                            {tenant.companyName
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-medium hover:underline">
                              {tenant.companyName}
                            </p>
                            <p className="text-xs capitalize text-muted-foreground">
                              {tenant.planName}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {tenant.userCount}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {tenant.messageCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span
                            className={`h-2 w-2 rounded-full ${tenant.whatsappSession?.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          />
                          <span className="text-muted-foreground">
                            {tenant.whatsappSession?.status === 'connected'
                              ? 'Connected'
                              : 'Offline'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tenant.status === 'active' ? 'success' : 'danger'
                          }
                        >
                          {humanize(tenant.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={Building2}
                  title="No organizations yet"
                  description="Provisioned customer accounts will appear here."
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Recent people</CardTitle>
              <CardDescription>
                Latest identities added to Nexora.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/users">Directory</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentUsers.length ? (
              recentUsers.map((user) => (
                <Link
                  key={user.id}
                  href="/admin/users"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold">
                    {user.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.organization}
                    </p>
                  </div>
                  <Badge
                    variant={
                      user.role === 'super_admin'
                        ? 'danger'
                        : user.role === 'tenant_admin'
                          ? 'blue'
                          : 'secondary'
                    }
                  >
                    {user.role === 'tenant_agent' ? 'User' : 'Admin'}
                  </Badge>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={Users}
                title="No users"
                description="User accounts will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Administrative activity</CardTitle>
            <CardDescription>
              Recent audited actions across organizations and the control plane.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/audit-logs">Open audit log</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading verified activity…
            </div>
          ) : audit.data?.logs.length ? (
            <div className="grid gap-x-8 md:grid-cols-2">
              {audit.data.logs.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 border-b py-3 last:border-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-muted-foreground">
                    <FileClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {humanize(entry.action)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.actorName} · {entry.tenantName || 'Platform'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileClock}
              title="No audited activity"
              description="Verified administrative events will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
