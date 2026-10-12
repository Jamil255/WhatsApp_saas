"use client";

import { CheckCheck, Download, MessageCircleReply, Send, Users } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardPageHeader, DashboardStat, EmptyState } from "@/components/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWorkspaceAnalytics } from "@/lib/queries";

const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AnalyticsPage() {
  const analytics = useWorkspaceAnalytics();
  if (analytics.isLoading) return <DashboardLoading />;
  if (analytics.isError || !analytics.data) return <DashboardError message={analytics.error instanceof Error ? analytics.error.message : "Analytics API is unavailable."} onRetry={() => analytics.refetch()} />;

  const { metrics, activity, statusBreakdown, periodDays } = analytics.data;
  const max = Math.max(...activity.map((item) => item.total), 1);
  const statusTotal = statusBreakdown.reduce((sum, item) => sum + item.count, 0);

  function exportReport() {
    const rows = ["date,total,delivered,failed", ...activity.map((item) => `${item.date},${item.total},${item.delivered},${item.failed}`)];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nexora-analytics.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div><DashboardPageHeader eyebrow="Workspace insights" title="Analytics" description="Live message performance, delivery health, and contact activity from the last 30 days." actions={<Button variant="outline" onClick={exportReport}><Download className="mr-2 h-4 w-4" />Export CSV</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="Total messages" value={compact(metrics.totalMessages)} detail={`${periodDays}-day volume`} icon={Send} /><DashboardStat label="Unique contacts" value={compact(metrics.uniqueContacts)} detail="Distinct phone numbers" icon={Users} tone="violet" /><DashboardStat label="Reply rate" value={`${metrics.replyRate.toFixed(1)}%`} detail={`${compact(metrics.inboundMessages)} inbound messages`} icon={MessageCircleReply} tone="blue" /><DashboardStat label="Delivery rate" value={`${metrics.deliveryRate.toFixed(1)}%`} detail={`${metrics.averageDeliverySeconds.toFixed(1)}s average delivery`} icon={CheckCheck} tone="amber" /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
      <Card className="shadow-soft"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Messages over time</CardTitle><CardDescription>Daily total and delivered volume.</CardDescription></div><Badge variant="outline">Last {periodDays} days</Badge></CardHeader><CardContent>{activity.length ? <><div className="flex h-64 items-end gap-1.5 sm:gap-2">{activity.map((item) => <div key={item.date} className="group flex min-w-0 flex-1 items-end"><div className="relative w-full overflow-hidden rounded-t bg-emerald-100" style={{ height: `${Math.max((item.total / max) * 100, 3)}%` }} title={`${item.date}: ${item.total} messages`}><div className="absolute inset-x-0 bottom-0 bg-primary" style={{ height: `${item.total ? (item.delivered / item.total) * 100 : 0}%` }} /></div></div>)}</div><div className="mt-4 flex items-center gap-4 border-t pt-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Delivered</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-100 ring-1 ring-emerald-200" />Total</span></div></> : <EmptyState icon={Send} title="No activity yet" description="Analytics will appear after your workspace starts processing messages." />}</CardContent></Card>
      <Card className="shadow-soft"><CardHeader><CardTitle>Delivery status</CardTitle><CardDescription>Current status distribution for the period.</CardDescription></CardHeader><CardContent className="space-y-5">{statusBreakdown.length ? statusBreakdown.sort((a, b) => b.count - a.count).map((item) => { const percentage = statusTotal ? (item.count / statusTotal) * 100 : 0; return <div key={item.status}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-ink">{label(item.status)}</span><span className="text-muted-foreground">{compact(item.count)} · {percentage.toFixed(1)}%</span></div><Progress value={percentage} indicatorClassName={item.status === "failed" ? "bg-red-500" : item.status === "queued" ? "bg-amber-400" : "bg-primary"} /></div>; }) : <EmptyState icon={CheckCheck} title="No status data" description="Message status distribution will appear here." />}</CardContent></Card>
    </div>
  </div>;
}
