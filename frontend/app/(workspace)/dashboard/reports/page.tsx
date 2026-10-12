"use client";

import { useState } from "react";
import { CheckCheck, Clock3, Download, MessageCircleReply, Send, Users } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardPageHeader, DashboardStat, EmptyState } from "@/components/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspaceReport } from "@/lib/queries";

type ReportDays = 7 | 30 | 90;
const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const dayLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));

export default function ReportsPage() {
  const [days, setDays] = useState<ReportDays>(30);
  const report = useWorkspaceReport(days);
  if (report.isLoading) return <DashboardLoading rows={5} />;
  if (report.isError || !report.data) return <DashboardError message={report.error instanceof Error ? report.error.message : "Reports API is unavailable."} onRetry={() => report.refetch()} />;

  const { summary, activity, statusBreakdown, typeBreakdown, generatedAt } = report.data;
  const max = Math.max(...activity.map((item) => item.total), 1);
  const statusTotal = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  const typeTotal = typeBreakdown.reduce((sum, item) => sum + item.count, 0);

  function exportReport() {
    const rows = ["date,total,delivered,failed", ...activity.map((item) => `${item.date},${item.total},${item.delivered},${item.failed}`)];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nexora-message-report-${days}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const filters = <div className="flex items-center rounded-lg border bg-white p-1">{([7, 30, 90] as ReportDays[]).map((value) => <Button key={value} size="sm" variant={days === value ? "default" : "ghost"} className="h-8 px-3" onClick={() => setDays(value)}>{value} days</Button>)}</div>;

  return <div>
    <DashboardPageHeader eyebrow="Workspace insights" title="Reports" description="Analyze live volume, delivery quality, message mix, and customer engagement across a selected period." actions={<>{filters}<Button variant="outline" onClick={exportReport}><Download className="mr-2 h-4 w-4" />Export CSV</Button></>} />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="Total messages" value={compact(summary.totalMessages)} detail={`${compact(summary.outboundMessages)} outbound · ${compact(summary.inboundMessages)} inbound`} icon={Send} /><DashboardStat label="Unique contacts" value={compact(summary.uniqueContacts)} detail={`Across the last ${days} days`} icon={Users} tone="violet" /><DashboardStat label="Delivery rate" value={`${summary.deliveryRate.toFixed(1)}%`} detail={`${compact(summary.deliveredMessages)} delivered or read`} icon={CheckCheck} tone="blue" /><DashboardStat label="Reply rate" value={`${summary.replyRate.toFixed(1)}%`} detail={`${summary.averageDeliverySeconds.toFixed(1)}s average delivery`} icon={MessageCircleReply} tone="amber" /></div>

    <Card className="mt-6 shadow-sm"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Message volume</CardTitle><CardDescription>Daily total with delivered traffic highlighted.</CardDescription></div><Badge variant="outline">Last {days} days</Badge></CardHeader><CardContent>{activity.length ? <><div className="flex h-64 items-end gap-1 overflow-hidden border-b pb-4">{activity.map((item) => <div key={item.date} className="group flex h-full min-w-0 flex-1 items-end" title={`${dayLabel(item.date)} · ${item.total} total · ${item.delivered} delivered`}><div className="relative w-full overflow-hidden rounded-t-sm bg-emerald-100 transition-opacity group-hover:opacity-80" style={{ height: `${Math.max((item.total / max) * 100, 3)}%` }}><div className="absolute inset-x-0 bottom-0 bg-primary" style={{ height: `${item.total ? (item.delivered / item.total) * 100 : 0}%` }} /></div></div>)}</div><div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-primary" />Delivered</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-emerald-100 ring-1 ring-emerald-200" />Total</span><span className="ml-auto flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />Generated {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(generatedAt))}</span></div></> : <EmptyState icon={Send} title="No report activity" description="Message volume will appear here once the workspace starts processing traffic." />}</CardContent></Card>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="shadow-sm"><CardHeader><CardTitle>Delivery status</CardTitle><CardDescription>Message lifecycle distribution for this period.</CardDescription></CardHeader><CardContent className="space-y-5">{statusBreakdown.length ? statusBreakdown.slice().sort((a, b) => b.count - a.count).map((item) => { const percentage = statusTotal ? (item.count / statusTotal) * 100 : 0; return <div key={item.status}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{label(item.status)}</span><span className="tabular-nums text-muted-foreground">{item.count.toLocaleString()} · {percentage.toFixed(1)}%</span></div><Progress value={percentage} indicatorClassName={item.status === "failed" ? "bg-red-500" : item.status === "queued" ? "bg-amber-500" : "bg-primary"} /></div>; }) : <EmptyState icon={CheckCheck} title="No delivery data" description="Status distribution will appear after messages are processed." />}</CardContent></Card>
      <Card className="shadow-sm"><CardHeader><CardTitle>Message types</CardTitle><CardDescription>Traffic mix by payload type.</CardDescription></CardHeader><CardContent className="space-y-5">{typeBreakdown.length ? typeBreakdown.slice().sort((a, b) => b.count - a.count).map((item) => { const percentage = typeTotal ? (item.count / typeTotal) * 100 : 0; return <div key={item.type}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{label(item.type)}</span><span className="tabular-nums text-muted-foreground">{item.count.toLocaleString()} · {percentage.toFixed(1)}%</span></div><Progress value={percentage} indicatorClassName="bg-blue-500" /></div>; }) : <EmptyState icon={MessageCircleReply} title="No message-type data" description="Payload distribution will appear after messages are processed." />}</CardContent></Card></div>

    <Card className="mt-6 overflow-hidden shadow-sm"><CardHeader><CardTitle>Daily report</CardTitle><CardDescription>Auditable daily totals used by the CSV export.</CardDescription></CardHeader><CardContent className={activity.length ? "px-0 pb-0" : "pt-0"}>{activity.length ? <div className="max-h-[460px] overflow-auto"><Table><TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead className="pl-6">Date</TableHead><TableHead>Total</TableHead><TableHead>Delivered</TableHead><TableHead>Failed</TableHead><TableHead className="pr-6 text-right">Delivery rate</TableHead></TableRow></TableHeader><TableBody>{activity.slice().reverse().map((item) => <TableRow key={item.date}><TableCell className="pl-6 font-medium">{dayLabel(item.date)}</TableCell><TableCell className="tabular-nums">{item.total.toLocaleString()}</TableCell><TableCell className="tabular-nums">{item.delivered.toLocaleString()}</TableCell><TableCell className="tabular-nums">{item.failed.toLocaleString()}</TableCell><TableCell className="pr-6 text-right tabular-nums">{item.total ? ((item.delivered / item.total) * 100).toFixed(1) : "0.0"}%</TableCell></TableRow>)}</TableBody></Table></div> : <EmptyState icon={Send} title="No daily records" description="Daily reporting rows will appear after traffic is recorded." />}</CardContent></Card>
  </div>;
}
