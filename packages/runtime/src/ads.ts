/**
 * Ad banner.
 *  - web mode: asks the platform which ad this visitor sees (Forjapp's or the creator's),
 *    so the 80/20 split and the Adfree rule are decided server-side and can't be tampered with.
 *  - preview mode: shows the creator's banner plus a note explaining Forjapp's share.
 *  - app mode (APK): no ads.
 */
import type { AppConfig } from "@forjapp/shared";
import { h } from "./dom";
import { assetUrl, env, safeUrl } from "./platform";

interface Decision {
  source: "forjapp" | "creator" | "none";
  ad?: { imageUrl: string; text: string; clickUrl: string };
}

let decision: Decision | null = null;
let requested = false;

function creatorAd(cfg: AppConfig) {
  const a = cfg.ads;
  return a && a.enabled && a.imageUrl && a.linkUrl ? a : null;
}

function bar(img: string, text: string, href: string, label: string): HTMLElement {
  return h(
    "a",
    { class: "adbar", href: safeUrl(href) || undefined, target: "_blank", rel: "noopener sponsored", "aria-label": "Publicidad" },
    img ? h("img", { src: img, alt: text || "Publicidad" }) : null,
    text ? h("span", { class: "adtext" }, text) : null,
    h("em", { class: "adlabel" }, label),
  );
}

export function adBar(cfg: AppConfig, rerender: () => void): { el: HTMLElement; pos: "top" | "bottom" } | null {
  const { mode, apiBase, projectId, visitor } = env();
  if (mode === "app") return null;
  const mine = creatorAd(cfg);

  if (mode === "preview") {
    const wrap = h("div", { style: { display: "contents" } });
    if (mine) wrap.appendChild(bar(assetUrl(mine.imageUrl), mine.label, mine.linkUrl, "Tu anuncio"));
    wrap.appendChild(
      h("div", { class: "adnote" }, mine ? "Forjapp mostrará su publicidad al 20 % de los visitantes; el resto verá tu anuncio." : "Sin anuncio propio, Forjapp mostrará su publicidad al 100 % de los visitantes."),
    );
    return { el: wrap, pos: mine ? mine.position : "bottom" };
  }

  if (!requested) {
    requested = true;
    const url = `${apiBase}/api/public/apps/${encodeURIComponent(projectId)}/ad${visitor ? `?v=${encodeURIComponent(visitor)}` : ""}`;
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<Decision>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => { decision = d; })
      .catch(() => { decision = { source: mine ? "creator" : "none" }; })
      .finally(rerender);
  }
  if (!decision) return null;
  if (decision.source === "forjapp" && decision.ad) {
    return { el: bar(assetUrl(decision.ad.imageUrl), decision.ad.text, decision.ad.clickUrl, "Publicidad · Forjapp"), pos: "bottom" };
  }
  if (decision.source === "creator" && mine) return { el: bar(assetUrl(mine.imageUrl), mine.label, mine.linkUrl, "Publicidad"), pos: mine.position };
  return null;
}
