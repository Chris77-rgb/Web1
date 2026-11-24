export function Stat({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function UsageBar({ label, used, limit, format = (n: number) => String(n) }: { label: string; used: number; limit: number; format?: (n: number) => string }) {
  const pct = limit < 0 ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  const warn = pct >= 85;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted">{format(used)} / {limit < 0 ? "∞" : format(limit)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-card-2">
        <div className={`h-full rounded-full ${warn ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${limit < 0 ? 4 : pct}%` }} />
      </div>
    </div>
  );
}
