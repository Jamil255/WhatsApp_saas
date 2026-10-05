import { cn } from "@/lib/utils";

export function MiniBarChart({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values);
  return <div className={cn("flex h-28 items-end gap-1.5", className)}>{values.map((value, index) => <div key={`${value}-${index}`} className="group relative flex h-full flex-1 items-end"><div className={cn("w-full rounded-t-md transition-all group-hover:bg-primary", index === values.length - 1 ? "bg-primary" : "bg-emerald-100")} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} /></div>)}</div>;
}

export function Sparkline({ values, color = "#0b7a50", className }: { values: number[]; color?: string; className?: string }) {
  const width = 180;
  const height = 52;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * width},${height - ((value - min) / (max - min || 1)) * (height - 8) - 4}`).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-12 w-full", className)} preserveAspectRatio="none"><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
