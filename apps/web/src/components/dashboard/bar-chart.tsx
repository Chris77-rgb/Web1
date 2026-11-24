"use client";
import { useState } from "react";

/** Single-series daily bar chart. One hue (brand), thin bars with 4px rounded tops, hover tooltip, table fallback via sr-only. */
export function DailyBars({ data, label }: { data: { day: string; value: number }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const h = 140;
  return (
    <div className="relative">
      <div className="flex h-[140px] items-end gap-[2px] border-b border-line" role="img" aria-label={label}>
        {data.map((d, i) => (
          <div key={d.day} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div
              className={`w-full max-w-6 rounded-t-[4px] transition-colors ${hover === i ? "bg-brand-700 dark:bg-brand-300" : "bg-brand-500 dark:bg-brand-400"}`}
              style={{ height: d.value ? Math.max(3, (d.value / max) * (h - 8)) : 0 }}
            />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg border border-line bg-card px-2 py-1 text-xs shadow-lg">
                <span className="text-muted">{d.day}</span> · <span className="font-semibold text-fg">{d.value}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
