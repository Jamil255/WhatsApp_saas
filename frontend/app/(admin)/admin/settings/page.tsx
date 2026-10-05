import { Bell, Database, KeyRound, Save, Settings2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const alerts = [{ icon: Database, label: "Database and queue incidents", checked: true }, { icon: ShieldCheck, label: "Suspended organization activity", checked: true }, { icon: KeyRound, label: "API key rotation events", checked: false }];

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Control center preferences" title="Admin settings" description="Configure Nexora platform defaults and operational notifications." action={<Button><Save className="mr-2 h-4 w-4" /> Save changes</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" /> Platform defaults</CardTitle><p className="mt-1 text-xs text-muted-foreground">Applied when a new organization is provisioned.</p></CardHeader><CardContent className="space-y-5"><div><label className="mb-2 block text-xs font-bold text-ink">Default rate limit / minute</label><Input defaultValue="60" /></div><div><label className="mb-2 block text-xs font-bold text-ink">Default daily message limit</label><Input defaultValue="1000" /></div><div><label className="mb-2 block text-xs font-bold text-ink">Support email</label><Input defaultValue="support@nexora.dev" /></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4 text-violet-600" /> Operational alerts</CardTitle><p className="mt-1 text-xs text-muted-foreground">Choose where important platform events are sent.</p></CardHeader><CardContent className="space-y-3">{alerts.map(({ icon: Icon, label, checked }) => <label key={label} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3"><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checked ? "border-primary bg-primary text-white" : "border-slate-300"}`}>{checked && <span className="text-xs">✓</span>}</span><Icon className="h-4 w-4 text-slate-400" /><span className="text-xs font-semibold text-ink">{label}</span></label>)}</CardContent></Card>
      </div>
    </>
  );
}
