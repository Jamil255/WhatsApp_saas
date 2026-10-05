"use client";

import { Check, Copy, ExternalLink, KeyRound, Plus, RotateCw, Webhook, Zap } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const code = `const response = await fetch('/api/messaging/send-message', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${token}\` },
  body: JSON.stringify({
    to: '+923001234567',
    text: 'Your order is on the way',
  }),
});`;

export default function DeveloperPage() {
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <>
      <PageHeader eyebrow="Developer tools" title="API & webhooks" description="Connect Nexora to your product with scoped credentials and real-time events." action={<Button variant="outline"><ExternalLink className="mr-2 h-4 w-4" /> View API docs</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>API credentials</CardTitle><p className="mt-1 text-xs text-muted-foreground">Use these keys to authenticate server-side API requests.</p></div><Badge variant="success">Active</Badge></CardHeader><CardContent><div className="rounded-xl bg-[#112c25] p-5 text-white"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2 text-xs font-semibold"><KeyRound className="h-4 w-4 text-lime" /> Production keys</div><span className="text-[10px] text-white/40">Created Sep 14, 2025</span></div><div className="mt-5 space-y-4 font-mono text-xs"><div><p className="mb-2 font-sans text-[10px] uppercase tracking-wider text-white/40">Client ID</p><div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-white/70"><span>nx_live_••••••••••••••••72a9</span><button onClick={copy} className="text-white/40 hover:text-white"><Copy className="h-3.5 w-3.5" /></button></div></div><div><p className="mb-2 font-sans text-[10px] uppercase tracking-wider text-white/40">API secret</p><div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-white/70"><span>••••••••••••••••••••••••••••</span><button onClick={copy} className="text-white/40 hover:text-white"><Copy className="h-3.5 w-3.5" /></button></div></div></div></div>{copied && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Copied to clipboard</div>}<div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" size="sm"><RotateCw className="mr-2 h-3.5 w-3.5" /> Rotate keys</Button><p className="flex items-center text-[10px] text-muted-foreground">Rotating invalidates the previous secret immediately.</p></div></CardContent></Card>
        <Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Webhooks</CardTitle><p className="mt-1 text-xs text-muted-foreground">Receive delivery and inbound message events.</p></div><Webhook className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="rounded-xl border border-dashed border-slate-200 p-5 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-primary"><Webhook className="h-4 w-4" /></div><p className="mt-3 text-sm font-bold text-ink">No webhook registered</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Add an endpoint to keep your app in sync with every message.</p><Button size="sm" className="mt-4"><Plus className="mr-2 h-3.5 w-3.5" /> Register endpoint</Button></div><div className="mt-5 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-700"><Zap className="mt-0.5 h-4 w-4 shrink-0" /> Events are signed with a unique secret for verification.</div></CardContent></Card>
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Quick example</CardTitle><p className="mt-1 text-xs text-muted-foreground">Send a message from your server in a few lines.</p></CardHeader><CardContent><pre className="overflow-x-auto rounded-xl bg-[#112c25] p-5 text-xs leading-6 text-white/75"><code>{code}</code></pre></CardContent></Card>
    </>
  );
}
