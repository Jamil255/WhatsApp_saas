'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, MessageSquare, Plus, Users, Wifi } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  type AdminTenant,
  queryKeys,
  useAdminPlans,
  useAdminTenants,
} from '@/lib/queries';

type ProvisionResult = {
  tenant: { id: string; companyName: string };
  adminPassword: string;
  apiKeys: { clientId: string; apiSecret: string };
};
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);

export default function OrganizationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenants = useAdminTenants();
  const plans = useAdminPlans();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<AdminTenant | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plan, setPlan] = useState('');
  const [provisioned, setProvisioned] = useState<ProvisionResult | null>(null);
  const filtered = useMemo(
    () =>
      (tenants.data || []).filter(
        (tenant) =>
          (status === 'all' || tenant.status === status) &&
          `${tenant.companyName} ${tenant.slug} ${tenant.planName} ${tenant.whatsappSession?.phoneNumber || ''}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [tenants.data, search, status],
  );
  const rows = pageSlice(filtered, page, pageSize);
  const create = useMutation({
    mutationFn: () =>
      apiFetch<ProvisionResult>('/tenants', {
        method: 'POST',
        body: JSON.stringify({
          companyName,
          adminName,
          adminEmail,
          subscriptionPlanId: plan,
        }),
      }),
    onSuccess: async (result) => {
      setCreateOpen(false);
      setProvisioned(result);
      setCompanyName('');
      setAdminName('');
      setAdminEmail('');
      setPlan(plans.data?.find((item) => item.isActive)?.id || '');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminTenants });
    },
  });
  const statusChange = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'suspend' | 'activate';
    }) => apiFetch(`/tenants/${id}/${action}`, { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTenants }),
  });

  useEffect(() => {
    if (!plan && plans.data) {
      setPlan(plans.data.find((item) => item.isActive)?.id || '');
    }
  }, [plan, plans.data]);

  if (tenants.isLoading || plans.isLoading) return <DashboardLoading />;
  if (tenants.isError || plans.isError || !tenants.data || !plans.data)
    return (
      <DashboardError
        message={
          tenants.error instanceof Error
            ? tenants.error.message
            : plans.error instanceof Error
              ? plans.error.message
              : 'Organization API is unavailable.'
        }
        onRetry={() => {
          void tenants.refetch();
          void plans.refetch();
        }}
      />
    );
  const connected = tenants.data.filter(
    (tenant) => tenant.whatsappSession?.status === 'connected',
  ).length;
  const users = tenants.data.reduce((sum, tenant) => sum + tenant.userCount, 0);
  const messages = tenants.data.reduce(
    (sum, tenant) => sum + tenant.messageCount,
    0,
  );

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Tenant management"
        title="Organizations"
        description="Provision and manage tenant accounts, users and WhatsApp connectivity."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create organization
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Organizations"
          value={tenants.data.length.toLocaleString()}
          detail="Tenant accounts"
          icon={Building2}
          tone="violet"
        />
        <DashboardStat
          label="Connected WhatsApp"
          value={connected.toLocaleString()}
          detail="Active sessions"
          icon={Wifi}
        />
        <DashboardStat
          label="Tenant users"
          value={users.toLocaleString()}
          detail="Across organizations"
          icon={Users}
          tone="blue"
        />
        <DashboardStat
          label="Messages"
          value={messages.toLocaleString()}
          detail="Platform lifetime total"
          icon={MessageSquare}
          tone="amber"
        />
      </div>
      <section className="mt-6">
        <DataTableToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder="Search organizations..."
        >
          <select
            className="h-9 rounded-md border bg-white px-3 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </DataTableToolbar>
        <div className="overflow-hidden rounded-lg border">
          {rows.length ? (
            <Table className="min-w-[920px]">
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-medium">
                          {tenant.companyName
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {tenant.companyName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tenant.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {tenant.planName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {tenant.userCount}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {tenant.messageCount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span
                          className={`h-2 w-2 rounded-full ${tenant.whatsappSession?.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                        {tenant.whatsappSession?.phoneNumber || 'Not connected'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tenant.status === 'active' ? 'success' : 'danger'
                        }
                        className="capitalize"
                      >
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RowActionsMenu
                        label={tenant.companyName}
                        actions={[
                          {
                            label: 'View details',
                            onSelect: () => setSelected(tenant),
                          },
                          {
                            label: 'Manage subscription',
                            onSelect: () =>
                              router.push(
                                `/admin/subscriptions?tenant=${tenant.id}`,
                              ),
                          },
                          {
                            label: 'Manage WhatsApp',
                            onSelect: () =>
                              router.push(
                                `/admin/connections?tenant=${tenant.id}`,
                              ),
                          },
                          {
                            label:
                              tenant.status === 'active'
                                ? 'Suspend'
                                : 'Activate',
                            destructive: tenant.status === 'active',
                            separatorBefore: true,
                            disabled: statusChange.isPending,
                            onSelect: () =>
                              statusChange.mutate({
                                id: tenant.id,
                                action:
                                  tenant.status === 'active'
                                    ? 'suspend'
                                    : 'activate',
                              }),
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
                icon={Building2}
                title="No organizations found"
                description="Adjust your search or create the first organization."
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Provision a tenant, its first administrator and API credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Company name
              <Input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Administrator name
              <Input
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Administrator email
              <Input
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Plan
              <select
                className="h-10 rounded-md border bg-white px-3 font-normal"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
              >
                <option value="" disabled>
                  Select a plan
                </option>
                {plans.data
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ·{' '}
                      {formatMoney(item.monthlyPriceCents, item.currency)}/month
                    </option>
                  ))}
              </select>
            </label>
            {create.isError && (
              <p className="text-sm text-red-600">
                {create.error instanceof Error
                  ? create.error.message
                  : 'Provisioning failed.'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !companyName ||
                !adminName ||
                !adminEmail ||
                !plan ||
                create.isPending
              }
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Provisioning...' : 'Create organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(provisioned)}
        onOpenChange={(open) => !open && setProvisioned(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization provisioned</DialogTitle>
            <DialogDescription>
              Copy these one-time credentials before closing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {provisioned &&
              [
                {
                  label: 'Temporary password',
                  value: provisioned.adminPassword,
                },
                { label: 'Client ID', value: provisioned.apiKeys.clientId },
                { label: 'API secret', value: provisioned.apiKeys.apiSecret },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border bg-muted/40 p-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 break-all font-mono text-sm">
                    {item.value}
                  </p>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setProvisioned(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selected && (
        <RecordDetailsDialog
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
          icon={Building2}
          title={selected.companyName}
          description={selected.slug}
          badge={
            <Badge
              variant={selected.status === 'active' ? 'success' : 'danger'}
              className="capitalize"
            >
              {selected.status}
            </Badge>
          }
          sections={[
            {
              title: 'Organization',
              fields: [
                { label: 'Organization ID', value: selected.id },
                { label: 'Plan', value: selected.planName },
                { label: 'Created', value: formatDate(selected.createdAt) },
                { label: 'Status', value: selected.status },
              ],
            },
            {
              title: 'Usage',
              fields: [
                { label: 'Users', value: selected.userCount.toLocaleString() },
                {
                  label: 'Messages',
                  value: selected.messageCount.toLocaleString(),
                },
              ],
            },
            {
              title: 'WhatsApp',
              fields: [
                {
                  label: 'Connection status',
                  value: selected.whatsappSession?.status || 'No session',
                },
                {
                  label: 'Phone number',
                  value:
                    selected.whatsappSession?.phoneNumber || 'Not connected',
                },
                {
                  label: 'Connected at',
                  value: formatDate(
                    selected.whatsappSession?.connectedAt || null,
                  ),
                },
              ],
            },
          ]}
        />
      )}
    </div>
  );
}
