"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; text: string }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  const color = { success: "text-emerald-500", error: "text-red-500", info: "text-brand-500" };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className="animate-slide-up flex items-start gap-3 rounded-xl border border-line bg-card p-3 shadow-lg">
              <I className={`mt-0.5 size-5 shrink-0 ${color[t.kind]}`} />
              <p className="flex-1 text-sm">{t.text}</p>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-muted hover:text-fg" aria-label="Cerrar"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
