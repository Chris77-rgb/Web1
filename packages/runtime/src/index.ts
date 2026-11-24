/**
 * Forjapp runtime entry point.
 *
 * Boot sources (first found wins):
 *  - window.FORJAPP_CONFIG (embedded by the Android builder)
 *  - postMessage {type:"forjapp:config", config} from the editor (preview)
 */
import type { AppConfig, Page } from "@forjapp/shared";
import { h } from "./dom";
import { icon } from "./icons";
import { BASE_CSS, themeCss } from "./styles";
import { renderBlock, type Ctx, type RssItem } from "./blocks";
import { assetUrl, env } from "./platform";
import { adBar } from "./ads";

declare global {
  interface Window {
    FORJAPP_CONFIG?: AppConfig;
    Forjapp?: { mount(cfg: AppConfig): void; navigate(pageId: string): void };
  }
}

interface State {
  cfg: AppConfig | null;
  pageId: string;
  history: string[];
  /** Transient detail view stacked over the page */
  view: { title: string; content: HTMLElement } | null;
  drawerOpen: boolean;
  selectedBlock: string | null;
}

const state: State = { cfg: null, pageId: "", history: [], view: null, drawerOpen: false, selectedBlock: null };
const rssCache = new Map<string, RssItem>();
const isPreview = () => env().mode === "preview";

function postToEditor(msg: Record<string, unknown>) {
  if (isPreview() && window.parent !== window) window.parent.postMessage({ source: "forjapp-runtime", ...msg }, "*");
}

function ensureStyle(id: string, css: string) {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

function loadFont(font: string) {
  if (font === "Inter" && env().mode === "app") return; // system fallback is fine inside the APK (offline)
  const id = "forjapp-font";
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700;800&display=swap`;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

function currentPage(cfg: AppConfig): Page {
  return cfg.pages.find((p) => p.id === state.pageId) ?? cfg.pages.find((p) => p.id === cfg.homePageId) ?? cfg.pages[0]!;
}

function navigate(pageId: string) {
  const cfg = state.cfg;
  if (!cfg || !cfg.pages.some((p) => p.id === pageId)) return;
  if (pageId !== state.pageId) state.history.push(state.pageId);
  state.pageId = pageId;
  state.view = null;
  state.drawerOpen = false;
  render();
  postToEditor({ type: "page-changed", pageId });
}

function back(): boolean {
  if (state.view) {
    state.view = null;
    render();
    return true;
  }
  if (state.drawerOpen) {
    state.drawerOpen = false;
    render();
    return true;
  }
  const prev = state.history.pop();
  if (prev) {
    state.pageId = prev;
    render();
    postToEditor({ type: "page-changed", pageId: prev });
    return true;
  }
  return false;
}
// Called by Android's back button handler: returns "true" if handled.
(window as unknown as { forjappBack: () => boolean }).forjappBack = back;

const ctx = (cfg: AppConfig): Ctx => ({
  cfg,
  navigate,
  rssCache,
  pushView(title, content) {
    state.view = { title, content };
    render();
  },
});

function render() {
  const cfg = state.cfg;
  const root = document.getElementById("app");
  if (!cfg || !root) return;
  const scrollKey = `${state.pageId}|${state.view ? "v" : ""}`;
  const prevMain = root.querySelector("main");
  const prevScroll = prevMain?.dataset.key === scrollKey ? prevMain.scrollTop : 0;

  const page = currentPage(cfg);
  state.pageId = page.id;
  const nav = cfg.navigation;
  const canGoBack = !!state.view || (state.history.length > 0 && !nav.items.some((n) => n.pageId === page.id));
  const logo = assetUrl(cfg.branding.logoUrl);

  const showHeader = !!state.view || !page.hideHeader;
  const header = showHeader
    ? h(
        "header",
        { class: "topbar" },
        canGoBack
          ? h("button", { class: "iconbtn", "aria-label": "Atrás", onclick: back }, icon("back"))
          : nav.type === "drawer"
            ? h("button", { class: "iconbtn", "aria-label": "Menú", onclick: () => { state.drawerOpen = true; render(); } }, icon("menu"))
            : logo
              ? h("img", { class: "logo", src: logo, alt: "" })
              : null,
        h("h1", {}, state.view ? state.view.title || cfg.meta.name : page.id === cfg.homePageId && !logo ? cfg.meta.name : page.title),
      )
    : null;

  const onlyFullWeb = !state.view && page.blocks.length === 1 && page.blocks[0]!.type === "webview" && !Number(page.blocks[0]!.props.height);
  const pageEl = h("div", { class: `page ${onlyFullWeb ? "flush" : ""}` });
  if (state.view) pageEl.appendChild(state.view.content);
  else if (!page.blocks.length) pageEl.appendChild(h("div", { class: "center" }, isPreview() ? "Página vacía: añade bloques desde el editor" : ""));
  else for (const b of page.blocks) {
    const el = renderBlock(b, ctx(cfg));
    if (isPreview()) {
      if (b.id === state.selectedBlock) el.classList.add("sel");
      el.addEventListener("click", () => postToEditor({ type: "block-click", pageId: page.id, blockId: b.id }), true);
    }
    pageEl.appendChild(el);
  }

  const main = h("main", { class: onlyFullWeb ? "full" : "", dataset: { key: scrollKey } }, pageEl);

  const tabbar =
    nav.type === "bottom" && nav.items.length
      ? h(
          "nav",
          { class: "tabbar" },
          nav.items.map((it) => h("button", { class: it.pageId === page.id ? "on" : "", onclick: () => navigate(it.pageId) }, icon(it.icon), it.label)),
        )
      : null;

  const drawer =
    nav.type === "drawer" && state.drawerOpen
      ? [
          h("div", { class: "drawer-bg", onclick: () => { state.drawerOpen = false; render(); } }),
          h(
            "aside",
            { class: "drawer" },
            h("header", {}, logo ? h("img", { src: logo, alt: "", style: { width: "36px", height: "36px", borderRadius: "8px" } }) : null, cfg.meta.name),
            nav.items.map((it) => h("button", { class: it.pageId === page.id ? "on" : "", onclick: () => navigate(it.pageId) }, icon(it.icon), it.label)),
          ),
        ]
      : [];

  const ad = adBar(cfg, render);
  const adTop = ad && ad.pos === "top" ? ad.el : null;
  const adBottom = ad && ad.pos === "bottom" ? ad.el : null;
  root.replaceChildren(...[header, adTop, main, adBottom, tabbar, ...drawer].filter(Boolean) as HTMLElement[]);
  if (prevScroll) main.scrollTop = prevScroll;
}

function splash(cfg: AppConfig) {
  if (isPreview() || env().mode === "web") return;
  const logo = assetUrl(cfg.branding.iconUrl || cfg.branding.logoUrl);
  const s = h(
    "div",
    { class: "splash", style: { background: cfg.branding.splashColor, color: "#fff" } },
    logo ? h("img", { src: logo, alt: "" }) : h("div", { class: "nm" }, cfg.meta.name),
  );
  document.body.appendChild(s);
  setTimeout(() => {
    s.style.opacity = "0";
    setTimeout(() => s.remove(), 450);
  }, 900);
}

function mount(cfg: AppConfig) {
  const first = !state.cfg;
  state.cfg = cfg;
  ensureStyle("forjapp-base", BASE_CSS);
  ensureStyle("forjapp-theme", themeCss(cfg));
  loadFont(cfg.theme.font);
  document.documentElement.style.colorScheme = cfg.theme.mode;
  document.body.classList.toggle("preview", isPreview());
  if (!document.getElementById("app")) document.body.appendChild(h("div", { id: "app" }));
  if (first) {
    state.pageId = cfg.homePageId;
    splash(cfg);
  }
  render();
}

window.Forjapp = { mount, navigate };

window.addEventListener("message", (e: MessageEvent) => {
  const d = e.data as { type?: string; config?: AppConfig; pageId?: string; blockId?: string | null };
  if (!d || typeof d !== "object") return;
  if (d.type === "forjapp:config" && d.config) mount(d.config);
  if (d.type === "forjapp:navigate" && d.pageId) navigate(d.pageId);
  if (d.type === "forjapp:select") {
    state.selectedBlock = d.blockId ?? null;
    document.querySelectorAll("[data-block-id]").forEach((el) => el.classList.toggle("sel", (el as HTMLElement).dataset.blockId === state.selectedBlock));
  }
});

function boot() {
  if (window.FORJAPP_CONFIG) mount(window.FORJAPP_CONFIG);
  else postToEditor({ type: "ready" });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
