import { cn } from "@/lib/utils";

export function StatusDot({ status = "online", label, className }: { status?: "online" | "warning" | "offline"; label?: string; className?: string }) {
  const colors = { online: "bg-emerald-500", warning: "bg-amber-500", offline: "bg-slate-400" };
  return <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}><span className={cn("h-2 w-2 rounded-full", colors[status])} />{label}</span>;
}
