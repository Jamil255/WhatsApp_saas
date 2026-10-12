"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Gauge, Save, ShieldCheck, UserRound } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardPageHeader } from "@/components/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { queryKeys, useWorkspaceSettings } from "@/lib/queries";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useWorkspaceSettings();
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => { if (settings.data) { setCompanyName(settings.data.workspace.companyName); setDescription(settings.data.workspace.description); setTimezone(settings.data.workspace.timezone); } }, [settings.data]);
  const save = useMutation({ mutationFn: () => apiFetch("/dashboard/settings", { method: "PATCH", body: JSON.stringify({ companyName, description, timezone }) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workspaceSettings }) });
  if (settings.isLoading) return <DashboardLoading />;
  if (settings.isError || !settings.data) return <DashboardError message={settings.error instanceof Error ? settings.error.message : "Workspace settings API is unavailable."} onRetry={() => settings.refetch()} />;
  const { workspace, profile } = settings.data;

  return <div><DashboardPageHeader eyebrow="Workspace preferences" title="Settings" description="Manage persisted workspace identity and review the limits applied by your current plan." actions={<Button disabled={!companyName.trim() || save.isPending} onClick={() => save.mutate()}><Save className="mr-2 h-4 w-4" />{save.isPending ? "Saving…" : "Save changes"}</Button>} />
    {save.isSuccess && <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><Check className="h-4 w-4" />Workspace settings saved.</div>}
    {save.isError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{save.error instanceof Error ? save.error.message : "Unable to save settings."}</div>}
    <div className="grid items-start gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <Card className="shadow-soft"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Workspace identity</CardTitle><CardDescription>These values are read from and saved to the tenant API.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-ink">Workspace name</label><Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></div><div><label className="mb-2 block text-xs font-bold text-ink">Workspace slug</label><Input value={workspace.slug} disabled /></div></div><div><label className="mb-2 block text-xs font-bold text-ink">Timezone</label><Input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Karachi" /></div><div><label className="mb-2 block text-xs font-bold text-ink">Description</label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe how your team uses Nexora." className="min-h-28" /></div></CardContent></Card>
      <div className="space-y-6"><Card className="shadow-soft"><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-4 w-4 text-blue-600" />Signed-in profile</CardTitle><CardDescription>Identity supplied by the authenticated session.</CardDescription></CardHeader><CardContent className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</p><p className="mt-1 text-sm font-semibold text-ink">{profile.name}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p><p className="mt-1 text-sm font-semibold text-ink">{profile.email}</p></div><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Role</span><Badge variant="blue">{profile.role.replaceAll("_", " ")}</Badge></div></CardContent></Card>
        <Card className="shadow-soft"><CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4 text-violet-600" />Plan and limits</CardTitle></CardHeader><CardContent className="space-y-4">{[{ label: "Plan", value: workspace.plan }, { label: "Messages / minute", value: workspace.rateLimitPerMinute.toLocaleString() }, { label: "Daily messages", value: workspace.dailyMessageLimit.toLocaleString() }, { label: "Workspace status", value: workspace.status }].map((item) => <div key={item.label} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"><span className="text-xs text-muted-foreground">{item.label}</span><span className="text-xs font-bold capitalize text-ink">{item.value}</span></div>)}</CardContent></Card>
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><p className="text-xs leading-5 text-emerald-800">Workspace settings are tenant-scoped and cannot modify another organization.</p></div>
      </div>
    </div>
  </div>;
}
