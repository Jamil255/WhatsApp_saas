"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, CheckCircle2, CircleAlert, MessageCircle, ReceiptText, Send, Wifi } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardStat, EmptyState } from "@/components/dashboard-page";
import { RecordDetailsDialog, RowActionsMenu } from "@/components/dashboard-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DashboardMessage, useWorkspaceBilling, useWorkspaceOverview } from "@/lib/queries";

const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const humanize = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusVariant = (status: string): "success" | "warning" | "danger" | "blue" | "outline" => {
  if (["delivered", "read"].includes(status)) return "success";
  if (status === "sent") return "blue";
  if (["queued", "processing"].includes(status)) return "warning";
  return status === "failed" ? "danger" : "outline";
};

function ActivityChart({ activity }: { activity: { date: string; total: number; delivered: number; failed: number }[] }) {
  const max = Math.max(...activity.map((item) => item.total), 1);
  if (!activity.length) return <EmptyState icon={BarChart3} title="No message activity" description="The seven-day delivery chart will appear when your workspace starts messaging." />;
  return <div>
    <div className="flex h-64 items-end gap-3 border-b px-1 pb-4 sm:gap-6">{activity.map((item) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="relative flex h-48 w-full max-w-14 items-end overflow-hidden rounded-md bg-slate-100"><div className="absolute inset-x-0 bottom-0 bg-primary/20 transition-all" style={{ height: `${Math.max((item.total / max) * 100, 3)}%` }} /><div className="absolute inset-x-0 bottom-0 bg-primary transition-all group-hover:bg-emerald-700" style={{ height: `${item.total ? (item.delivered / item.total) * Math.max((item.total / max) * 100, 3) : 0}%` }} /></div>
      <span className="text-[11px] text-muted-foreground">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(item.date))}</span>
    </div>)}</div>
    <div className="flex flex-wrap items-center gap-4 pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-primary" />Delivered</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-primary/20" />Total</span><span className="ml-auto">Last 7 days</span></div>
  </div>;
}

function MessageRow({ message, onView }: { message: DashboardMessage; onView: () => void }) {
  return <TableRow><TableCell className="pl-6"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-muted-foreground">{message.direction === "inbound" ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}</span><div className="min-w-0"><p className="max-w-72 truncate text-sm font-medium text-foreground">{message.bodyPreview || `${humanize(message.type)} message`}</p><p className="mt-0.5 max-w-72 truncate text-xs text-muted-foreground">{message.direction === "inbound" ? "Inbound" : `To ${message.to}`}</p></div></div></TableCell><TableCell className="text-sm capitalize text-muted-foreground">{message.type}</TableCell><TableCell><Badge variant={statusVariant(message.status)}>{humanize(message.status)}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(message.createdAt)}</TableCell><TableCell className="pr-4"><RowActionsMenu label={message.id} actions={[{ label: "View details", onSelect: onView }, { label: "Copy message ID", onSelect: () => void navigator.clipboard.writeText(message.id) }]} /></TableCell></TableRow>;
}

export default function DashboardPage() {
  const overview = useWorkspaceOverview();
  const billing = useWorkspaceBilling();
  const [selectedMessage, setSelectedMessage] = useState<DashboardMessage | null>(null);
  if (overview.isLoading) return <DashboardLoading rows={5} />;
  if (overview.isError || !overview.data) return <DashboardError message={overview.error instanceof Error ? overview.error.message : "Workspace API is unavailable."} onRetry={() => overview.refetch()} />;

  const { tenant, session, metrics, activity, recentMessages, webhook, templatesCount, teamMembers } = overview.data;
  const connected = session?.status === "connected";
  const setupItems = [connected, templatesCount > 0, teamMembers > 0, webhook.configured];
  const setupProgress = (setupItems.filter(Boolean).length / setupItems.length) * 100;
  const billingData = billing.data;
  const estimatedApiCost = billingData ? new Intl.NumberFormat("en-US", { style: "currency", currency: billingData.plan.currency }).format(billingData.billing.estimatedApiCostCents / 100) : "—";

  return <div className="flex flex-col gap-4 md:gap-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStat label="Total messages" value={compact(metrics.totalMessages)} detail={`${compact(metrics.outboundMessages)} outbound · ${compact(metrics.inboundMessages)} inbound`} icon={MessageCircle} />
      <DashboardStat label="Delivery rate" value={`${metrics.deliveryRate.toFixed(1)}%`} detail={`${compact(metrics.deliveredMessages)} delivered or read`} icon={CheckCircle2} tone="blue" />
      <DashboardStat label="In progress" value={compact(metrics.queuedMessages + metrics.processingMessages)} detail={`${compact(metrics.queuedMessages)} currently queued`} icon={Send} tone="amber" />
      <DashboardStat label="Failed" value={compact(metrics.failedMessages)} detail={metrics.failedMessages ? "Needs delivery review" : "No failures recorded"} icon={CircleAlert} tone="red" />
    </div>

    <Card className="rounded-xl shadow-sm"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Message activity</CardTitle><CardDescription>Daily volume and delivered traffic from the live API.</CardDescription></div><Badge variant="outline">7 days</Badge></CardHeader><CardContent><ActivityChart activity={activity} /></CardContent></Card>

    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden rounded-xl shadow-sm"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Recent messages</CardTitle><CardDescription>Latest inbound and outbound workspace activity.</CardDescription></div><Button asChild size="sm" variant="outline"><Link href="/dashboard/inbox">Open inbox</Link></Button></CardHeader><CardContent className="px-0 pb-0">{recentMessages.length ? <Table className="min-w-[720px]"><TableHeader className="bg-muted"><TableRow className="hover:bg-transparent"><TableHead className="pl-6">Message</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="w-12 pr-4" /></TableRow></TableHeader><TableBody>{recentMessages.map((message) => <MessageRow key={message.id} message={message} onView={() => setSelectedMessage(message)} />)}</TableBody></Table> : <div className="p-6"><EmptyState icon={MessageCircle} title="No messages yet" description="New conversations will appear here." /></div>}</CardContent></Card>
      <Card className="rounded-xl shadow-sm"><CardHeader><CardTitle>Workspace status</CardTitle><CardDescription>{tenant?.companyName || "Current workspace"}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">WhatsApp</span><Badge variant={connected ? "success" : "warning"}>{connected ? "Connected" : humanize(session?.status || "Not connected")}</Badge></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Current plan</span><span className="text-sm font-medium capitalize">{billingData?.plan.name || tenant?.plan || "Unassigned"}</span></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">API usage this month</span><span className="text-sm font-medium tabular-nums">{billingData?.usage.outboundMessages.toLocaleString() || "—"}</span></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Estimated API cost</span><span className="text-sm font-medium tabular-nums">{estimatedApiCost}</span></div><div><div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Setup progress</span><span className="font-medium">{Math.round(setupProgress)}%</span></div><Progress value={setupProgress} /></div><div className="grid gap-2"><Button asChild variant="outline" className="w-full"><Link href="/dashboard/billing"><ReceiptText className="mr-2 h-4 w-4" />Billing & usage</Link></Button><Button asChild variant="outline" className="w-full"><Link href="/dashboard/connect"><Wifi className="mr-2 h-4 w-4" />Manage connection</Link></Button></div></CardContent></Card>
    </div>
    {selectedMessage && <RecordDetailsDialog open onOpenChange={(open) => !open && setSelectedMessage(null)} icon={MessageCircle} title={selectedMessage.bodyPreview || `${humanize(selectedMessage.type)} message`} description={selectedMessage.id} badge={<Badge variant={statusVariant(selectedMessage.status)}>{humanize(selectedMessage.status)}</Badge>} sections={[{ title: "Message", fields: [{ label: "Message ID", value: selectedMessage.id }, { label: "Direction", value: humanize(selectedMessage.direction) }, { label: "Type", value: humanize(selectedMessage.type) }, { label: "Created", value: formatDate(selectedMessage.createdAt) }, { label: "Recipient", value: selectedMessage.to }, { label: "Delivered", value: selectedMessage.deliveredAt ? formatDate(selectedMessage.deliveredAt) : "Not delivered" }, { label: "Error", value: selectedMessage.errorReason || "None" }] }]} />}
  </div>;
}
