"use client";

import { Activity, AlertTriangle, Database, Gauge, ListTodo, Server, Wifi } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardPageHeader, DashboardStat } from "@/components/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminHealth } from "@/lib/queries";

const serviceBadge = (status: string) => status === "up" ? "success" as const : "danger" as const;

export default function HealthPage() {
  const query = useAdminHealth();
  if (query.isLoading) return <DashboardLoading rows={4} />;
  if (query.isError || !query.data) return <DashboardError message={query.error instanceof Error ? query.error.message : "Health API is unavailable."} onRetry={() => query.refetch()} />;

  const { services } = query.data;
  const queueBacklog = services.queue.queuedMessages + services.queue.processingMessages;
  const serviceRows = [
    { name: "API service", icon: Server, status: services.api.status, detail: "Authenticated API health endpoint is responding.", metricLabel: "State", metric: services.api.status },
    { name: "PostgreSQL", icon: Database, status: services.database.status, detail: "A live database query is used for this check.", metricLabel: "Query latency", metric: `${services.database.latencyMs} ms` },
    { name: "Message queue", icon: Activity, status: services.queue.status, detail: `${services.queue.queuedMessages.toLocaleString()} queued and ${services.queue.processingMessages.toLocaleString()} processing messages.`, metricLabel: "Backlog", metric: queueBacklog.toLocaleString() },
    { name: "WhatsApp sessions", icon: Wifi, status: services.whatsapp.status, detail: `${services.whatsapp.activeSessions.toLocaleString()} database sessions and ${services.whatsapp.inMemorySockets.toLocaleString()} live sockets.`, metricLabel: "Connected", metric: services.whatsapp.activeSessions.toLocaleString() },
  ];
  const healthy = query.data.status === "healthy";

  return <div>
    <DashboardPageHeader eyebrow="Infrastructure" title="System health" description="Live checks for the services that power tenant messaging and WhatsApp connectivity." actions={<div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${healthy ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}><span className={`h-2 w-2 rounded-full ${healthy ? "bg-emerald-500" : "bg-red-500"}`} /><span className="text-xs font-bold">{healthy ? "Platform healthy" : "Platform degraded"}</span></div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="Database latency" value={`${services.database.latencyMs} ms`} detail="Live SELECT query" icon={Gauge} tone={services.database.status === "up" ? "green" : "red"} /><DashboardStat label="Queue backlog" value={queueBacklog.toLocaleString()} detail={`${services.queue.processingMessages.toLocaleString()} currently processing`} icon={ListTodo} tone={queueBacklog ? "amber" : "blue"} /><DashboardStat label="Active sessions" value={services.whatsapp.activeSessions.toLocaleString()} detail={`${services.whatsapp.inMemorySockets.toLocaleString()} in-memory sockets`} icon={Wifi} /><DashboardStat label="Failed messages" value={query.data.failedMessages.toLocaleString()} detail="Platform lifetime total" icon={AlertTriangle} tone={query.data.failedMessages ? "red" : "violet"} /></div>
    <Card className="mt-6 shadow-soft"><CardHeader><CardTitle>Service checks</CardTitle><CardDescription>Automatically refreshed from the backend every 15 seconds.</CardDescription></CardHeader><CardContent className="grid gap-3">{serviceRows.map((service) => <div key={service.name} className="grid gap-4 rounded-2xl border bg-white p-4 transition-colors hover:border-slate-300 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${service.status === "up" ? "bg-emerald-50 text-primary" : "bg-red-50 text-red-600"}`}><service.icon className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-ink">{service.name}</h3><Badge variant={serviceBadge(service.status)} className="capitalize">{service.status === "up" ? "Operational" : "Unavailable"}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{service.detail}</p></div><div className="sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{service.metricLabel}</p><p className="mt-1 text-sm font-bold capitalize text-ink">{service.metric}</p></div></div>)}</CardContent></Card>
    <p className="mt-4 text-right text-[10px] text-slate-400">Last checked {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(query.data.timestamp))}</p>
  </div>;
}
