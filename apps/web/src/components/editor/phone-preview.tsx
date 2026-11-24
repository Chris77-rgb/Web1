"use client";
import { useEffect, useRef, useState } from "react";
import type { AppConfig } from "@forjapp/shared";
import { cn } from "@/lib/cn";

interface Props {
  config: AppConfig;
  projectId?: string;
  /** Page to show; when it changes the preview navigates to it. */
  pageId?: string;
  selectedBlockId?: string | null;
  onPageChange?: (pageId: string) => void;
  onBlockClick?: (pageId: string, blockId: string) => void;
  className?: string;
  scale?: number;
}

/**
 * Android phone frame that renders the app with the same runtime that ships in the APK.
 * The iframe is sandboxed without allow-same-origin, so user content can never touch the
 * platform's cookies or DOM.
 */
export function PhonePreview({ config, projectId, pageId, selectedBlockId, onPageChange, onBlockClick, className, scale = 1 }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState("");
  const cbs = useRef({ onPageChange, onBlockClick });
  cbs.current = { onPageChange, onBlockClick };

  useEffect(() => setSrc(`/preview.html?api=${encodeURIComponent(location.origin)}&pid=${encodeURIComponent(projectId ?? "")}`), [projectId]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data as { source?: string; type?: string; pageId?: string; blockId?: string };
      if (d?.source !== "forjapp-runtime") return;
      if (d.type === "ready") setReady(true);
      if (d.type === "page-changed" && d.pageId) cbs.current.onPageChange?.(d.pageId);
      if (d.type === "block-click" && d.pageId && d.blockId) cbs.current.onBlockClick?.(d.pageId, d.blockId);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const post = (msg: unknown) => frame.current?.contentWindow?.postMessage(msg, "*");
  useEffect(() => { if (ready) post({ type: "forjapp:config", config }); }, [ready, config]);
  useEffect(() => { if (ready && pageId) post({ type: "forjapp:navigate", pageId }); }, [ready, pageId]);
  useEffect(() => { if (ready) post({ type: "forjapp:select", blockId: selectedBlockId ?? null }); }, [ready, selectedBlockId, config]);

  const statusColor = config.theme.primary;
  return (
    <div className={cn("relative mx-auto", className)} style={{ width: 340 * scale, height: 700 * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})`, width: 340, height: 700 }}>
        <div className="relative size-full rounded-[46px] bg-zinc-900 p-3 shadow-2xl ring-1 ring-black/40 dark:ring-white/10">
          <div className="absolute -right-[3px] top-28 h-16 w-[3px] rounded-r bg-zinc-700" />
          <div className="absolute -right-[3px] top-48 h-10 w-[3px] rounded-r bg-zinc-700" />
          <div className="relative flex size-full flex-col overflow-hidden rounded-[36px] bg-white">
            <div className="flex h-7 shrink-0 items-center justify-between px-6 text-[11px] font-semibold text-white" style={{ background: statusColor }}>
              <span>9:41</span>
              <span className="absolute left-1/2 top-1.5 size-3.5 -translate-x-1/2 rounded-full bg-black" />
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="size-3" fill="currentColor"><path d="M2 22h20V2z" /></svg>
                <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor"><rect x="2" y="7" width="18" height="10" rx="2" /><rect x="21" y="10" width="2" height="4" rx="1" /></svg>
              </span>
            </div>
            {src && <iframe ref={frame} src={src} title="Vista previa de la app" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" className="w-full flex-1 border-0" allow="autoplay; fullscreen" />}
            <div className="flex h-5 shrink-0 items-center justify-center bg-black/90"><span className="h-1 w-24 rounded-full bg-white/70" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
