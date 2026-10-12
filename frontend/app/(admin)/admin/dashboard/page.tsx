"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, Building2, FileClock, MessageSquare, Server, Users, Wifi } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardStat, EmptyState } from "@/components/dashboard-page";
import { RecordDetailsDialog, RowActionsMenu } from "@/components/dashboard-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type AdminTenant, useAdminAudit, useAdminOverview, useAdminTenants } from "@/lib/queries";
import { AdminCommandCenter } from "@/components/admin-command-center";

const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const humanize = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusVariant = (value: string): "success" | "warning" | "danger" | "outline" => {
  if (["active", "connected", "completed"].includes(value.toLowerCase())) return "success";
  if (["pending", "connecting", "processing"].includes(value.toLowerCase())) return "warning";
  if (["suspended", "disconnected", "failed", "error"].includes(value.toLowerCase())) return "danger";
  return "outline";
};

function LegacyAdminDashboardPage() {
  const overview = useAdminOverview();
  const tenants = useAdminTenants();
  const audit = useAdminAudit();
  const [selectedTenant, setSelectedTenant] = useState<AdminTenant | null>(null);
  if (overview.isLoading || tenants.isLoading) return <DashboardLoading rows={5} />;
  if (overview.isError || tenants.isError || !overview.data || !tenants.data) return <DashboardError title="Platform data is unavailable" message={(overview.error || tenants.error) instanceof Error ? ((overview.error || tenants.error) as Error).message : "Admin API is unavailable."} onRetry={() => { void overview.refetch(); void tenants.refetch(); void audit.refetch(); }} />;

  const connected = tenants.data.filter((tenant) => tenant.whatsappSession?.status === "connected").length;
  const active = tenants.data.filter((tenant) => tenant.status === "active").length;
  const recentTenants = [...tenants.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 7);
  const totalUsers = tenants.data.reduce((sum, tenant) => sum + tenant.userCount, 0);

  return <div className="flex flex-col gap-4 md:gap-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStat label="Organizations" value={compact(overview.data.totalTenants)} detail={`${active} active tenant accounts`} icon={Building2} tone="violet" />
      <DashboardStat label="Messages" value={compact(overview.data.totalMessages)} detail="Across all organizations" icon={MessageSquare} tone="blue" />
      <DashboardStat label="Active sessions" value={compact(overview.data.activeSessions)} detail={`${connected} organizations connected`} icon={Wifi} />
      <DashboardStat label="Gateway sockets" value={compact(overview.data.inMemorySockets)} detail={`${totalUsers} tenant users`} icon={Server} tone="amber" />
    </div>

    <Card className="overflow-hidden rounded-xl shadow-sm"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Organizations</CardTitle><CardDescription>Newest tenant accounts and current WhatsApp state.</CardDescription></div><Button asChild size="sm" variant="outline"><Link href="/admin/organizations">View all</Link></Button></CardHeader><CardContent className="px-0 pb-0">{recentTenants.length ? <Table className="min-w-[820px]"><TableHeader className="bg-muted"><TableRow className="hover:bg-transparent"><TableHead className="pl-6">Organization</TableHead><TableHead>Plan</TableHead><TableHead>Users</TableHead><TableHead>Messages</TableHead><TableHead>WhatsApp</TableHead><TableHead>Status</TableHead><TableHead className="w-12 pr-4" /></TableRow></TableHeader><TableBody>{recentTenants.map((tenant) => <TableRow key={tenant.id}><TableCell className="pl-6"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-medium">{tenant.companyName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="text-sm font-medium">{tenant.companyName}</p><p className="text-xs text-muted-foreground">{tenant.slug}</p></div></div></TableCell><TableCell><Badge variant="outline" className="capitalize">{tenant.plan}</Badge></TableCell><TableCell className="text-sm tabular-nums">{tenant.userCount}</TableCell><TableCell className="text-sm tabular-nums">{tenant.messageCount.toLocaleString()}</TableCell><TableCell><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className={`h-2 w-2 rounded-full ${tenant.whatsappSession?.status === "connected" ? "bg-emerald-500" : "bg-slate-300"}`} />{tenant.whatsappSession?.phoneNumber || "Not connected"}</div></TableCell><TableCell><Badge variant={statusVariant(tenant.status)}>{humanize(tenant.status)}</Badge></TableCell><TableCell className="pr-4"><RowActionsMenu label={tenant.companyName} actions={[{ label: "View details", onSelect: () => setSelectedTenant(tenant) }, { label: "Copy organization ID", onSelect: () => void navigator.clipboard.writeText(tenant.id) }]} /></TableCell></TableRow>)}</TableBody></Table> : <div className="p-6"><EmptyState icon={Building2} title="No organizations yet" description="New tenant accounts will appear here." /></div>}</CardContent></Card>

    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="rounded-xl shadow-sm"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Recent audit activity</CardTitle><CardDescription>Latest administrative actions recorded by the backend.</CardDescription></div><Button asChild size="sm" variant="outline"><Link href="/admin/audit-logs">Open logs</Link></Button></CardHeader><CardContent>{audit.isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Loading activity...</div> : audit.isError ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Audit activity is temporarily unavailable.</div> : audit.data?.logs.length ? <div className="divide-y">{audit.data.logs.slice(0, 6).map((entry) => <div key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-muted-foreground"><FileClock className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{humanize(entry.action)}</p><p className="truncate text-xs text-muted-foreground">{entry.actorName} · {entry.tenantName || "Platform"}</p></div><span className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span></div>)}</div> : <EmptyState icon={FileClock} title="No audit activity" description="Administrative events will appear here." />}</CardContent></Card>
      <Card className="rounded-xl shadow-sm"><CardHeader><CardTitle>Platform status</CardTitle><CardDescription>Live control-plane summary.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">API</span><Badge variant="success">Operational</Badge></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Organizations</span><span className="text-sm font-medium tabular-nums">{active} active</span></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">WhatsApp sessions</span><span className="text-sm font-medium tabular-nums">{overview.data.activeSessions}</span></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Sockets</span><span className="text-sm font-medium tabular-nums">{overview.data.inMemorySockets}</span></div><Button asChild variant="outline" className="w-full"><Link href="/admin/health"><Activity className="mr-2 h-4 w-4" />System health</Link></Button></CardContent></Card>
    </div>
    {selectedTenant && <RecordDetailsDialog open onOpenChange={(open) => !open && setSelectedTenant(null)} icon={Building2} title={selectedTenant.companyName} description={selectedTenant.slug} badge={<Badge variant={statusVariant(selectedTenant.status)}>{humanize(selectedTenant.status)}</Badge>} sections={[{ title: "Organization", fields: [{ label: "Organization ID", value: selectedTenant.id }, { label: "Plan", value: selectedTenant.plan }, { label: "Created", value: formatDate(selectedTenant.createdAt) }, { label: "Users", value: selectedTenant.userCount.toLocaleString() }, { label: "Messages", value: selectedTenant.messageCount.toLocaleString() }] }, { title: "WhatsApp", fields: [{ label: "Connection status", value: selectedTenant.whatsappSession?.status || "No session" }, { label: "Phone number", value: selectedTenant.whatsappSession?.phoneNumber || "Not connected" }, { label: "Connected at", value: selectedTenant.whatsappSession?.connectedAt ? formatDate(selectedTenant.whatsappSession.connectedAt) : "—" }] }]} />}
  </div>;
}

export default function AdminDashboardPage() {
  return <AdminCommandCenter />;
}
