"use client";

import { Clock3, Code2, Database, Globe2, KeyRound, Server, ShieldCheck } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardPageHeader, EmptyState } from "@/components/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAdminSettings } from "@/lib/queries";

function SettingRow({ icon: Icon, label, value, detail }: { icon: typeof Server; label: string; value: string; detail: string }) {
  return <div className="flex items-start gap-3 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-ink">{label}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{detail}</p></div><code className="max-w-[45%] break-all rounded-lg bg-slate-50 px-2.5 py-1.5 text-right text-[11px] font-semibold text-ink">{value}</code></div>;
}

export default function AdminSettingsPage() {
  const query = useAdminSettings();
  if (query.isLoading) return <DashboardLoading rows={4} />;
  if (query.isError || !query.data) return <DashboardError message={query.error instanceof Error ? query.error.message : "Runtime configuration API is unavailable."} onRetry={() => query.refetch()} />;
  const settings = query.data;

  return <div>
    <DashboardPageHeader eyebrow="Platform configuration" title="Admin settings" description="A safe, read-only view of the backend configuration currently controlling Nexora." actions={<Badge variant={settings.environment === "production" ? "success" : "warning"} className="px-3 py-1.5 capitalize">{settings.environment} environment</Badge>} />
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="shadow-soft"><CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-4 w-4 text-primary" />Runtime</CardTitle><CardDescription>Resolved values returned by the live admin API.</CardDescription></CardHeader><CardContent><SettingRow icon={Code2} label="API prefix" value={`/${settings.apiPrefix}`} detail="Base path applied to every public backend route." /><Separator /><SettingRow icon={Database} label="Queue schema" value={settings.queueSchema} detail="PostgreSQL schema used by the background job queue." /><Separator /><SettingRow icon={Clock3} label="Queue monitor interval" value={`${settings.queueMonitorIntervalSeconds}s`} detail="Frequency used to observe queue state." /><Separator /><SettingRow icon={KeyRound} label="OTP expiry" value={`${settings.otpExpirySeconds}s`} detail="Lifetime of a WhatsApp connection verification code." /></CardContent></Card>
      <Card className="shadow-soft"><CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-blue-600" />Allowed frontend origins</CardTitle><CardDescription>CORS origins currently accepted by the backend.</CardDescription></CardHeader><CardContent>{settings.corsOrigins.length ? <div className="space-y-3">{settings.corsOrigins.map((origin) => <div key={origin} className="flex items-center gap-3 rounded-xl border bg-slate-50/50 p-3"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><code className="min-w-0 break-all text-xs font-semibold text-ink">{origin}</code></div>)}</div> : <EmptyState icon={Globe2} title="No explicit CORS origins" description="The backend did not return an origin allow-list for this environment." />}</CardContent></Card>
    </div>
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-xs font-bold text-emerald-900">Secrets stay server-side</p><p className="mt-1 text-xs leading-5 text-emerald-800">This endpoint intentionally exposes operational metadata only. Database credentials, signing keys and token secrets are never sent to the dashboard.</p></div></div>
  </div>;
}
