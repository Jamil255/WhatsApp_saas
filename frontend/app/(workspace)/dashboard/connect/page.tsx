import { LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { QrConnectCard } from "@/components/qr-connect-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const connectionNotes = [
  { icon: ShieldCheck, color: "text-primary", title: "Private by design", copy: "Your session credentials are encrypted at rest and isolated to this workspace." },
  { icon: RefreshCw, color: "text-blue-600", title: "Reconnects automatically", copy: "Nexora keeps your connection healthy and retries when a network drops." },
  { icon: LockKeyhole, color: "text-violet-600", title: "You are in control", copy: "Disconnect or restart the linked device at any time from this page." },
];

export default function ConnectPage() {
  return (
    <>
      <PageHeader eyebrow="Channel settings" title="Connect WhatsApp" description="Link the number your team will use to send messages and manage replies." />
      <QrConnectCard initialStatus="disconnected" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">{connectionNotes.map(({ icon: Icon, color, title, copy }) => <Card key={title} className="shadow-none"><CardHeader className="pb-3"><Icon className={`h-5 w-5 ${color}`} /><CardTitle className="mt-3">{title}</CardTitle></CardHeader><CardContent className="text-xs leading-5 text-muted-foreground">{copy}</CardContent></Card>)}</div>
    </>
  );
}
