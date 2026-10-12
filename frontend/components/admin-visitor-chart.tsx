"use client";

import { useMemo } from "react";

type ActivityPoint = { date: string; visitors: number };

export function AdminVisitorChart({ activity, compact = false }: { activity: ActivityPoint[]; compact?: boolean }) {
  const points = useMemo(() => {
    const values = new Map(activity.map((point) => [point.date, point.visitors]));
    return Array.from({ length: compact ? 7 : 14 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - ((compact ? 6 : 13) - index));
      const key = date.toISOString().slice(0, 10);
      return { key, label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date), value: values.get(key) || 0 };
    });
  }, [activity, compact]);
  const max = Math.max(...points.map((point) => point.value), 1);
  const total = points.reduce((sum, point) => sum + point.value, 0);

  return <div>
    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-2xl font-semibold tabular-nums tracking-tight">{total.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">New visitors in this period</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />Unique visitors</div></div>
    <div className={compact ? "flex h-40 items-end gap-2" : "flex h-52 items-end gap-2 sm:gap-3"}>{points.map((point, index) => <div key={point.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><div className="relative flex flex-1 items-end"><div className="absolute bottom-0 w-full rounded-t-md bg-emerald-100 transition-colors group-hover:bg-emerald-200" style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}><span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-sm group-hover:block">{point.value}</span></div></div>{(!compact || index % 2 === 0) && <span className="mt-2 truncate text-center text-[10px] text-muted-foreground">{point.label}</span>}</div>)}</div>
  </div>;
}
