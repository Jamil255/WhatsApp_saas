"use client";

import { useMemo, useState } from "react";
import { Activity, Eye, Globe2, MousePointer2 } from "lucide-react";
import { AdminVisitorChart } from "@/components/admin-visitor-chart";
import { DashboardError, DashboardLoading, DashboardPageHeader, DashboardStat, EmptyState } from "@/components/dashboard-page";
import { DataTablePagination, DataTableToolbar, pageSlice, RecordDetailsDialog, RowActionsMenu } from "@/components/dashboard-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type AdminVisitor, useAdminVisitors } from "@/lib/queries";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const shortId = (value: string) => `${value.slice(0, 8)}…${value.slice(-4)}`;
const visitorSource = (visitor: AdminVisitor) => visitor.utmSource || (visitor.referrer ? "Referral" : "Direct");

export default function AdminVisitorsPage() {
  const query = useAdminVisitors();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<AdminVisitor | null>(null);
  const visitors = query.data?.visitors || [];
  const sources = useMemo(() => Array.from(new Set(visitors.map(visitorSource))).sort(), [visitors]);
  const filtered = useMemo(() => visitors.filter((visitor) => (source === "all" || visitorSource(visitor) === source) && `${visitor.visitorId} ${visitor.ipAddress || ""} ${visitor.landingPath} ${visitor.lastVisitedPath} ${visitor.referrer || ""}`.toLowerCase().includes(search.toLowerCase())), [visitors, source, search]);
  const rows = pageSlice(filtered, page, pageSize);

  if (query.isLoading) return <DashboardLoading />;
  if (query.isError || !query.data) return <DashboardError title="Visitor analytics are unavailable" message={query.error instanceof Error ? query.error.message : "The visitor API did not respond."} onRetry={() => query.refetch()} />;
  const stats = query.data.stats;

  return <div>
    <DashboardPageHeader eyebrow="Acquisition intelligence" title="Website visitors" description="Understand how people discover Nexora and which pages move them toward a workspace." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="Unique visitors" value={stats.uniqueVisitors.toLocaleString()} detail="Known anonymous browsers" icon={Globe2} tone="violet" /><DashboardStat label="Visitors today" value={stats.visitorsToday.toLocaleString()} detail="Seen since midnight" icon={MousePointer2} tone="blue" /><DashboardStat label="Page views" value={stats.pageViews.toLocaleString()} detail="Lifetime tracked views" icon={Eye} tone="amber" /><DashboardStat label="Active now" value={stats.activeNow.toLocaleString()} detail="Seen in the last 15 minutes" icon={Activity} /></div>
    <Card className="mt-6"><CardHeader><CardTitle>Acquisition trend</CardTitle><CardDescription>New unique visitors over the last 14 days.</CardDescription></CardHeader><CardContent><AdminVisitorChart activity={query.data.activity} /></CardContent></Card>
    <section className="mt-6"><div className="mb-3"><h2 className="text-base font-semibold">Visitor activity</h2><p className="mt-1 text-sm text-muted-foreground">First-touch attribution, recent page, and engagement depth for every anonymous visitor.</p></div><DataTableToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(0); }} placeholder="Search visitor, IP or page..."><select className="h-9 rounded-md border bg-white px-3 text-sm" value={source} onChange={(event) => { setSource(event.target.value); setPage(0); }}><option value="all">All sources</option>{sources.map((value) => <option key={value} value={value}>{value}</option>)}</select></DataTableToolbar>
      <div className="overflow-hidden rounded-lg border bg-white">{rows.length ? <Table className="min-w-[1020px]"><TableHeader className="sticky top-0 z-10 bg-muted"><TableRow className="hover:bg-transparent"><TableHead className="pl-4">Visitor</TableHead><TableHead>Source</TableHead><TableHead>Landing page</TableHead><TableHead>Last page</TableHead><TableHead>Views</TableHead><TableHead>Last seen</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{rows.map((visitor) => <TableRow key={visitor.id} className="cursor-pointer" onClick={() => setSelected(visitor)}><TableCell className="pl-4"><div><p className="font-mono text-xs font-medium">{shortId(visitor.visitorId)}</p><p className="mt-1 text-xs text-muted-foreground">{visitor.ipAddress || "IP unavailable"}</p></div></TableCell><TableCell><Badge variant={visitor.utmSource ? "blue" : "outline"}>{visitorSource(visitor)}</Badge></TableCell><TableCell className="max-w-52 truncate text-sm" title={visitor.landingPath}>{visitor.landingPath}</TableCell><TableCell className="max-w-52 truncate text-sm" title={visitor.lastVisitedPath}>{visitor.lastVisitedPath}</TableCell><TableCell className="text-sm tabular-nums">{visitor.pageViews}</TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(visitor.lastSeenAt)}</TableCell><TableCell onClick={(event) => event.stopPropagation()}><RowActionsMenu label={visitor.visitorId} actions={[{ label: "View journey", onSelect: () => setSelected(visitor) }, { label: "Copy visitor ID", onSelect: () => void navigator.clipboard.writeText(visitor.visitorId) }]} /></TableCell></TableRow>)}</TableBody></Table> : <div className="p-8"><EmptyState icon={MousePointer2} title="No visitors found" description="Public-site activity will appear here as it is recorded." /></div>}<DataTablePagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} /></div>
    </section>
    {selected && <RecordDetailsDialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} icon={MousePointer2} title={`Visitor ${shortId(selected.visitorId)}`} description={`${selected.pageViews} tracked page views`} badge={<Badge variant="success">Tracked</Badge>} sections={[{ title: "Journey", fields: [{ label: "First page", value: selected.landingPath }, { label: "Latest page", value: selected.lastVisitedPath }, { label: "First seen", value: formatDate(selected.firstSeenAt) }, { label: "Last seen", value: formatDate(selected.lastSeenAt) }] }, { title: "Acquisition", fields: [{ label: "Source", value: visitorSource(selected) }, { label: "Medium", value: selected.utmMedium || "—" }, { label: "Campaign", value: selected.utmCampaign || "—" }, { label: "Referrer", value: selected.referrer || "Direct visit" }] }, { title: "Technical", fields: [{ label: "Visitor ID", value: selected.visitorId }, { label: "Session ID", value: selected.sessionId || "—" }, { label: "IP address", value: selected.ipAddress || "—" }, { label: "User agent", value: selected.userAgent || "—" }] }]} />}
  </div>;
}
