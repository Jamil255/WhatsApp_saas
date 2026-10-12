"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, KeyRound, Plus, RotateCw, Trash2, Webhook, X } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardPageHeader, EmptyState } from "@/components/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { queryKeys, useDeveloperSettings } from "@/lib/queries";

const code = `const response = await fetch('http://localhost:3030/api/messaging/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Id': process.env.NEXORA_CLIENT_ID,
    'X-Api-Secret': process.env.NEXORA_API_SECRET,
  },
  body: JSON.stringify({
    to: '+923001234567',
    body: 'Your order is on the way',
  }),
});`;

export default function DeveloperPage() {
  const queryClient = useQueryClient();
  const developer = useDeveloperSettings();
  const [copied, setCopied] = useState("");
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [oneTimeSecret, setOneTimeSecret] = useState("");
  const [rotatedKeys, setRotatedKeys] = useState<{ clientId: string; apiSecret: string } | null>(null);
  const register = useMutation({ mutationFn: () => apiFetch<{ url: string; events: string[]; isActive: boolean; signingSecret: string }>("/dashboard/developer/webhook", { method: "POST", body: JSON.stringify({ url: webhookUrl, events: ["*"] }) }), onSuccess: async (result) => { setOneTimeSecret(result.signingSecret); setWebhookOpen(false); await queryClient.invalidateQueries({ queryKey: queryKeys.developer }); } });
  const remove = useMutation({ mutationFn: () => apiFetch("/dashboard/developer/webhook", { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.developer }) });
  const rotate = useMutation({ mutationFn: () => apiFetch<{ message: string; data: { clientId: string; apiSecret: string } }>("/auth/api-keys/rotate", { method: "POST" }), onSuccess: async (result) => { setRotatedKeys(result.data); await queryClient.invalidateQueries({ queryKey: queryKeys.developer }); } });
  async function copy(value: string, key: string) { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(""), 1400); }

  if (developer.isLoading) return <DashboardLoading />;
  if (developer.isError || !developer.data) return <DashboardError message={developer.error instanceof Error ? developer.error.message : "Developer settings API is unavailable."} onRetry={() => developer.refetch()} />;
  const { credential, webhook } = developer.data;

  return <div><DashboardPageHeader eyebrow="Developer tools" title="API and webhooks" description="Live credential metadata and webhook delivery configuration for this tenant." actions={<Button asChild variant="outline"><Link href="/docs"><ExternalLink className="mr-2 h-4 w-4" />API documentation</Link></Button>} />
    {(rotatedKeys || oneTimeSecret) && <Card className="mb-6 border-amber-200 bg-amber-50/60"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Save these secrets now</CardTitle><CardDescription>They are shown once and cannot be retrieved from this screen later.</CardDescription></div><Button size="icon" variant="ghost" onClick={() => { setRotatedKeys(null); setOneTimeSecret(""); }}><X className="h-4 w-4" /></Button></CardHeader><CardContent className="space-y-3">{rotatedKeys && <><SecretRow label="Client ID" value={rotatedKeys.clientId} onCopy={() => copy(rotatedKeys.clientId, "new-client")} copied={copied === "new-client"} /><SecretRow label="API secret" value={rotatedKeys.apiSecret} onCopy={() => copy(rotatedKeys.apiSecret, "new-secret")} copied={copied === "new-secret"} /></>}{oneTimeSecret && <SecretRow label="Webhook signing secret" value={oneTimeSecret} onCopy={() => copy(oneTimeSecret, "webhook-secret")} copied={copied === "webhook-secret"} />}</CardContent></Card>}
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <Card className="shadow-soft"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>API credentials</CardTitle><CardDescription>Use server-side only with the API-key headers.</CardDescription></div><Badge variant={credential?.isActive ? "success" : "warning"}>{credential?.isActive ? "Active" : "Not configured"}</Badge></CardHeader><CardContent>{credential ? <><div className="rounded-xl bg-[#112c25] p-5 text-white"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2 text-xs font-semibold"><KeyRound className="h-4 w-4 text-lime" />Production credential</div><span className="text-[10px] text-white/40">Created {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(credential.createdAt))}</span></div><div className="mt-5 space-y-4 font-mono text-xs"><SecretRow dark label="Client ID" value={credential.clientId} onCopy={() => copy(credential.clientId, "client-id")} copied={copied === "client-id"} /><div><p className="mb-2 font-sans text-[10px] uppercase tracking-wider text-white/40">API secret</p><div className="rounded-lg bg-white/5 px-3 py-2.5 text-white/60">{credential.secretPrefix}••••••••••••••••••••••••</div></div></div></div><div className="mt-5 flex items-center justify-between gap-4"><p className="text-[10px] leading-5 text-muted-foreground">Rotation immediately invalidates the current secret.</p><Button variant="outline" size="sm" disabled={rotate.isPending} onClick={() => rotate.mutate()}><RotateCw className="mr-2 h-3.5 w-3.5" />{rotate.isPending ? "Rotating…" : "Rotate keys"}</Button></div>{rotate.isError && <p className="mt-3 text-xs text-red-600">{rotate.error instanceof Error ? rotate.error.message : "Rotation failed."}</p>}</> : <EmptyState icon={KeyRound} title="No active API credential" description="Create credentials through tenant provisioning or rotate keys to generate a new pair." />}</CardContent></Card>
      <Card className="shadow-soft"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Webhook endpoint</CardTitle><CardDescription>Receive signed message events.</CardDescription></div><Webhook className="h-5 w-5 text-primary" /></CardHeader><CardContent>{webhook ? <div><div className="rounded-xl border bg-slate-50 p-4"><div className="flex items-center justify-between"><Badge variant={webhook.isActive ? "success" : "danger"}>{webhook.isActive ? "Active" : "Disabled"}</Badge><span className="text-[10px] text-muted-foreground">{webhook.failureCount} failures</span></div><p className="mt-4 break-all font-mono text-xs text-ink">{webhook.url}</p><div className="mt-4 flex flex-wrap gap-1.5">{webhook.events.map((event) => <Badge key={event} variant="outline">{event}</Badge>)}</div></div><div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => { setWebhookUrl(webhook.url); setWebhookOpen(true); }}>Update</Button><Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}><Trash2 className="mr-2 h-3.5 w-3.5" />Remove</Button></div></div> : <EmptyState icon={Webhook} title="No webhook configured" description="Register an HTTPS endpoint to receive real-time events." action={<Button size="sm" onClick={() => setWebhookOpen(true)}><Plus className="mr-2 h-3.5 w-3.5" />Register endpoint</Button>} />}{webhookOpen && <div className="mt-5 rounded-xl border border-primary/20 bg-emerald-50/40 p-4"><label className="mb-2 block text-xs font-bold text-ink">HTTPS endpoint</label><Input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://api.example.com/webhooks/nexora" /><div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setWebhookOpen(false)}>Cancel</Button><Button size="sm" disabled={!webhookUrl.startsWith("https://") || register.isPending} onClick={() => register.mutate()}>{register.isPending ? "Saving…" : "Save endpoint"}</Button></div>{register.isError && <p className="mt-2 text-xs text-red-600">{register.error instanceof Error ? register.error.message : "Unable to register webhook."}</p>}</div>}</CardContent></Card>
    </div>
    <Card className="mt-6 shadow-soft"><CardHeader><CardTitle>Server example</CardTitle><CardDescription>Send a text message using API-key authentication.</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto rounded-xl bg-[#112c25] p-5 text-xs leading-6 text-white/75"><code>{code}</code></pre></CardContent></Card>
  </div>;
}

function SecretRow({ label, value, copied, onCopy, dark = false }: { label: string; value: string; copied: boolean; onCopy: () => void; dark?: boolean }) {
  return <div><p className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-500"}`}>{label}</p><div className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 font-mono text-xs ${dark ? "bg-white/5 text-white/75" : "border bg-white text-ink"}`}><span className="truncate">{value}</span><button onClick={onCopy} className={dark ? "text-white/45 hover:text-white" : "text-slate-400 hover:text-primary"}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></div></div>;
}
