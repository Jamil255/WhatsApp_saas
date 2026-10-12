"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CircleOff, QrCode, Smartphone, Wifi } from "lucide-react";
import { ConnectionManagerCard } from "@/components/connection-manager-card";
import { DashboardError, DashboardLoading, DashboardPageHeader, DashboardStat, EmptyState } from "@/components/dashboard-page";
import { DataTablePagination, DataTableToolbar, pageSlice, RowActionsMenu } from "@/components/dashboard-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, type SessionStatus } from "@/lib/api";
import { queryKeys, type AdminTenant, useAdminTenants } from "@/lib/queries";

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
const sessionLabel = (status?: string) => status === "connected" ? "Connected" : status === "pending_verification" ? "Verification required" : status === "connecting" ? "Generating QR" : "Not connected";
const sessionVariant = (status?: string): "success" | "warning" | "outline" => status === "connected" ? "success" : ["connecting", "pending_verification"].includes(status || "") ? "warning" : "outline";

function ConnectionDialog({ tenant, onOpenChange }: { tenant: AdminTenant | null; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["admin", "connection", tenant?.id], queryFn: () => apiFetch<SessionStatus>(`/admin/tenants/${tenant!.id}/connection`), enabled: Boolean(tenant), refetchInterval: 15_000 });
  async function refresh() {
    await Promise.all([status.refetch(), queryClient.invalidateQueries({ queryKey: queryKeys.adminTenants }), queryClient.invalidateQueries({ queryKey: queryKeys.adminOverview })]);
  }
  return <Dialog open={Boolean(tenant)} onOpenChange={onOpenChange}><DialogContent className="grid max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 p-0"><DialogHeader className="border-b px-6 py-5 pr-14"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary"><QrCode className="h-5 w-5" /></span><div><DialogTitle>{tenant?.companyName}</DialogTitle><DialogDescription className="mt-1">Connect and manage this organization&apos;s WhatsApp linked device.</DialogDescription></div></div></DialogHeader><div className="min-h-0 overflow-y-auto p-5 sm:p-6">{status.isLoading ? <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">Loading connection state…</div> : status.isError ? <DashboardError title="Connection state unavailable" message={status.error instanceof Error ? status.error.message : "Session API did not respond."} onRetry={() => status.refetch()} /> : <ConnectionManagerCard session={status.data} adminTenantId={tenant?.id} workspaceName={tenant?.companyName} onChanged={() => void refresh()} />}</div></DialogContent></Dialog>;
}

export default function AdminConnectionsPage() {
  const tenants = useAdminTenants();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<AdminTenant | null>(null);
  const filtered = useMemo(() => (tenants.data || []).filter((tenant) => (filter === "all" || (filter === "connected") === (tenant.whatsappSession?.status === "connected")) && `${tenant.companyName} ${tenant.slug} ${tenant.whatsappSession?.phoneNumber || ""}`.toLowerCase().includes(search.toLowerCase())), [tenants.data, filter, search]);
  const rows = pageSlice(filtered, page, pageSize);

  useEffect(() => {
    if (!tenants.data?.length || selected) return;
    const requested = new URLSearchParams(window.location.search).get("tenant");
    if (requested) setSelected(tenants.data.find((tenant) => tenant.id === requested) || null);
  }, [selected, tenants.data]);

  if (tenants.isLoading) return <DashboardLoading />;
  if (tenants.isError || !tenants.data) return <DashboardError title="Connections are unavailable" message={tenants.error instanceof Error ? tenants.error.message : "Organization API did not respond."} onRetry={() => tenants.refetch()} />;
  const connected = tenants.data.filter((tenant) => tenant.whatsappSession?.status === "connected").length;
  const pending = tenants.data.filter((tenant) => ["connecting", "pending_verification"].includes(tenant.whatsappSession?.status || "")).length;

  return <div><DashboardPageHeader eyebrow="Channel operations" title="WhatsApp connections" description="Generate tenant QR codes, complete verification, and monitor every organization connection from one place." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="Organizations" value={tenants.data.length.toLocaleString()} detail="Tenant workspaces" icon={Building2} tone="violet" /><DashboardStat label="Connected" value={connected.toLocaleString()} detail="Ready for messaging" icon={Wifi} /><DashboardStat label="In progress" value={pending.toLocaleString()} detail="QR or OTP pending" icon={QrCode} tone="amber" /><DashboardStat label="Not connected" value={(tenants.data.length - connected - pending).toLocaleString()} detail="Require linked device setup" icon={CircleOff} tone="blue" /></div>
    <section className="mt-6"><div className="mb-3"><h2 className="text-base font-semibold">Organization connections</h2><p className="mt-1 text-sm text-muted-foreground">Open any organization to generate and scan its tenant-isolated QR code.</p></div><DataTableToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(0); }} placeholder="Search organization or number..."><select className="h-9 rounded-md border bg-white px-3 text-sm" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}><option value="all">All connections</option><option value="connected">Connected</option><option value="disconnected">Not connected</option></select></DataTableToolbar><div className="overflow-hidden rounded-lg border bg-white">{rows.length ? <Table className="min-w-[850px]"><TableHeader className="bg-muted"><TableRow className="hover:bg-transparent"><TableHead className="pl-4">Organization</TableHead><TableHead>WhatsApp number</TableHead><TableHead>Connection</TableHead><TableHead>Connected at</TableHead><TableHead className="text-right">Action</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{rows.map((tenant) => <TableRow key={tenant.id}><TableCell className="pl-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold">{tenant.companyName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="text-sm font-medium">{tenant.companyName}</p><p className="text-xs text-muted-foreground">{tenant.slug}</p></div></div></TableCell><TableCell className="text-sm">{tenant.whatsappSession?.phoneNumber || "—"}</TableCell><TableCell><Badge variant={sessionVariant(tenant.whatsappSession?.status)}>{sessionLabel(tenant.whatsappSession?.status)}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(tenant.whatsappSession?.connectedAt || null)}</TableCell><TableCell className="text-right"><Button size="sm" variant={tenant.whatsappSession?.status === "connected" ? "outline" : "default"} onClick={() => setSelected(tenant)}><Smartphone className="mr-2 h-3.5 w-3.5" />{tenant.whatsappSession?.status === "connected" ? "Manage" : "Connect"}</Button></TableCell><TableCell><RowActionsMenu label={tenant.companyName} actions={[{ label: "Manage connection", onSelect: () => setSelected(tenant) }, { label: "Copy organization ID", onSelect: () => void navigator.clipboard.writeText(tenant.id) }]} /></TableCell></TableRow>)}</TableBody></Table> : <div className="p-8"><EmptyState icon={QrCode} title="No organizations found" description="Adjust the search or connection filter." /></div>}<DataTablePagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} /></div></section>
    <ConnectionDialog tenant={selected} onOpenChange={(open) => { if (!open) { setSelected(null); window.history.replaceState({}, "", "/admin/connections"); } }} />
  </div>;
}
