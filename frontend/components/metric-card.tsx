import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({ title, value, change, trend = "up", icon: Icon, tone = "green" }: { title: string; value: string; change: string; trend?: "up" | "down"; icon: LucideIcon; tone?: "green" | "blue" | "violet" | "orange" }) {
  const colors = { green: "bg-emerald-50 text-primary", blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", orange: "bg-orange-50 text-orange-600" };
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{title}</p><p className="mt-2 font-display text-[27px] font-extrabold tracking-[-0.04em] text-ink">{value}</p></div><span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colors[tone])}><Icon className="h-[18px] w-[18px]" /></span></div><div className={cn("mt-4 flex items-center gap-1 text-xs font-semibold", trend === "up" ? "text-emerald-600" : "text-red-500")}>{trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{change}<span className="font-normal text-muted-foreground">vs last month</span></div></div>;
}
