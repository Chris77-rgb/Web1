import type { AppConfig, Block } from "@forjapp/shared";
import { h, str, num, arr } from "./dom";
import { icon } from "./icons";
import { assetUrl, enablePush, env, fetchText, openExternal, safeUrl, storage } from "./platform";

export interface Ctx {
  cfg: AppConfig;
  navigate(pageId: string): void;
  /** Push a transient detail view (article, etc.) on top of the current page. */
  pushView(title: string, content: HTMLElement): void;
  /** Search index of RSS items loaded during this session. */
  rssCache: Map<string, RssItem>;
}

export interface RssItem {
  id: string;
  title: string;
  link: string;
  date: string;
  image: string;
  summary: string;
  source?: string;
}

type Renderer = (props: Record<string, unknown>, ctx: Ctx, block: Block) => HTMLElement;

// ---------------- Favorites ----------------
const FAV_KEY = "forjapp:favorites";
export const favorites = {
  all(): RssItem[] {
    try {
      return JSON.parse(storage.get(FAV_KEY) ?? "[]") as RssItem[];
    } catch {
      return [];
    }
  },
  has(id: string) {
    return favorites.all().some((f) => f.id === id);
  },
  toggle(item: RssItem): boolean {
    const list = favorites.all();
    const i = list.findIndex((f) => f.id === item.id);
    if (i >= 0) list.splice(i, 1);
    else list.unshift(item);
    storage.set(FAV_KEY, JSON.stringify(list.slice(0, 200)));
    return i < 0;
  },
};

function favButton(item: RssItem): HTMLElement {
  const b = h("button", { class: `fav ${favorites.has(item.id) ? "on" : ""}`, "aria-label": "Favorito" }, icon("heart", 20));
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    b.classList.toggle("on", favorites.toggle(item));
  });
  return b;
}

function articleView(item: RssItem): HTMLElement {
  return h(
    "div",
    { class: "article" },
    item.image ? h("img", { class: "img rounded", src: item.image, alt: "" }) : null,
    h("h2", {}, item.title),
    h("div", { class: "muted" }, [item.source, item.date].filter(Boolean).join(" · ")),
    h("p", { class: "tx" }, item.summary),
    item.link ? h("button", { class: "btn filled", onclick: () => openExternal(item.link) }, icon("external", 18), "Leer noticia completa") : null,
    favButtonWide(item),
  );
}

function favButtonWide(item: RssItem): HTMLElement {
  const label = () => (favorites.has(item.id) ? "Quitar de favoritos" : "Guardar en favoritos");
  const b = h("button", { class: "btn outline" }, icon("heart", 18), label());
  b.addEventListener("click", () => {
    favorites.toggle(item);
    b.lastChild!.textContent = label();
  });
  return b;
}

// ---------------- RSS parsing ----------------
function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

function stripHtml(html: string): { text: string; img: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const img = doc.querySelector("img")?.getAttribute("src") ?? "";
  return { text: (doc.body.textContent ?? "").replace(/\s+/g, " ").trim(), img };
}

export function parseFeed(xml: string, source: string): RssItem[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("El feed no es un RSS/Atom válido");
  const nodes = [...doc.querySelectorAll("item, entry")];
  return nodes.map((n, i) => {
    const link = textOf(n.querySelector("link")) || n.querySelector("link")?.getAttribute("href") || "";
    const rawDesc = textOf(n.querySelector("description, summary, content"));
    const { text, img } = stripHtml(rawDesc);
    const media =
      n.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
      [...n.getElementsByTagName("*")].find((e) => /(^|:)(content|thumbnail)$/.test(e.tagName) && e.getAttribute("url"))?.getAttribute("url") ||
      img;
    const date = textOf(n.querySelector("pubDate, published, updated"));
    return {
      id: link || `${source}#${i}`,
      title: textOf(n.querySelector("title")) || "(sin título)",
      link: safeUrl(link),
      date: date ? new Date(date).toLocaleDateString() : "",
      image: safeUrl(media),
      summary: text.slice(0, 2000),
      source,
    };
  });
}

function rssRow(item: RssItem, ctx: Ctx, showImages: boolean): HTMLElement {
  return h(
    "div",
    { class: "card rss-item", onclick: () => ctx.pushView(item.source ?? "", articleView(item)) },
    showImages && item.image ? h("img", { src: item.image, alt: "", loading: "lazy" }) : null,
    h("div", { style: { flex: "1", minWidth: "0" } }, h("div", { class: "t" }, item.title), h("div", { class: "m" }, item.date)),
    favButton(item),
  );
}

// ---------------- Media helpers ----------------
function videoEmbed(url: string, autoplay: boolean): HTMLElement {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  const vm = url.match(/vimeo\.com\/(\d+)/);
  const wrap = h("div", { class: "vid" });
  if (yt) {
    wrap.appendChild(h("iframe", { src: `https://www.youtube-nocookie.com/embed/${yt[1]}?playsinline=1${autoplay ? "&autoplay=1&mute=1" : ""}`, allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowfullscreen: true }));
  } else if (vm) {
    wrap.appendChild(h("iframe", { src: `https://player.vimeo.com/video/${vm[1]}${autoplay ? "?autoplay=1&muted=1" : ""}`, allow: "autoplay; fullscreen; picture-in-picture", allowfullscreen: true }));
  } else if (safeUrl(url)) {
    const v = h("video", { src: safeUrl(url), controls: true, playsinline: true, preload: "metadata" });
    if (autoplay) {
      v.muted = true;
      v.autoplay = true;
    }
    wrap.appendChild(v);
  } else {
    wrap.appendChild(h("div", { class: "center", style: { color: "#fff" } }, "Añade la URL de un vídeo"));
  }
  return wrap;
}

let currentAudio: HTMLAudioElement | null = null;
function playAudio(src: string): HTMLAudioElement {
  if (currentAudio && currentAudio.src !== src) currentAudio.pause();
  if (!currentAudio || currentAudio.src !== src) currentAudio = new Audio(src);
  return currentAudio;
}

// ---------------- Renderers ----------------
const R: Record<string, Renderer> = {
  hero: (p, ctx) => {
    const img = assetUrl(p.image);
    return h(
      "div",
      { class: "hero" },
      img ? h("img", { src: img, alt: "" }) : null,
      h(
        "div",
        { class: "ov" },
        h("h2", {}, str(p.title)),
        str(p.subtitle) ? h("p", {}, str(p.subtitle)) : null,
        str(p.buttonLabel) ? h("button", { class: "btn", onclick: () => str(p.buttonPage) && ctx.navigate(str(p.buttonPage)) }, str(p.buttonLabel)) : null,
      ),
    );
  },
  heading: (p) => h("h2", { class: `hd ${str(p.size, "md")}`, style: { textAlign: str(p.align, "left") } }, str(p.text)),
  text: (p) => h("p", { class: "tx", style: { textAlign: str(p.align, "left") } }, str(p.text)),
  image: (p) => {
    const src = assetUrl(p.src);
    return h(
      "figure",
      { style: { margin: "0" } },
      src ? h("img", { class: `img ${p.rounded ? "rounded" : ""}`, src, alt: str(p.caption), loading: "lazy" }) : h("div", { class: "card center" }, icon("images", 32)),
      str(p.caption) ? h("figcaption", { class: "caption" }, str(p.caption)) : null,
    );
  },
  button: (p, ctx) =>
    h(
      "button",
      {
        class: `btn ${str(p.variant, "filled")}`,
        onclick: () => {
          const action = str(p.action, "page");
          const target = str(p.target).trim();
          if (action === "page") ctx.navigate(str(p.page));
          else if (action === "url") openExternal(target);
          else if (action === "tel") openExternal(`tel:${target.replace(/[^\d+]/g, "")}`);
          else if (action === "mailto") openExternal(`mailto:${target}`);
        },
      },
      str(p.label),
    ),
  link: (p) => h("a", { class: "lnk", onclick: () => openExternal(str(p.url)) }, str(p.label), icon("external", 16)),
  spacer: (p) => h("div", { style: { height: `${num(p.height, 24)}px` } }),
  divider: () => h("hr", { class: "dv" }),
  cards: (p) => {
    const layout = str(p.layout, "list");
    return h(
      "div",
      { class: `cards ${layout}` },
      arr(p.items).map((it) => {
        const img = assetUrl(it.image);
        const url = str(it.url);
        return h(
          "div",
          { class: "card", style: url ? { cursor: "pointer" } : {}, onclick: url ? () => openExternal(url) : undefined },
          img ? h("img", { class: "img", src: img, alt: "", loading: "lazy" }) : null,
          h(
            "div",
            { class: "body" },
            h("div", { class: "t" }, str(it.title)),
            str(it.text) ? h("div", { class: "d" }, str(it.text)) : null,
            str(it.price) ? h("div", { class: "pr" }, str(it.price)) : null,
          ),
        );
      }),
    );
  },
  gallery: (p) => {
    const images = arr(p.images).map((i) => ({ src: assetUrl(i.src), caption: str(i.caption) })).filter((i) => i.src);
    if (!images.length) return h("div", { class: "card center" }, "Añade imágenes a la galería");
    const open = (idx: number) => {
      let i = idx;
      const im = h("img", { src: images[i]!.src, alt: "" });
      const cap = h("div", { style: { padding: "12px" } }, images[i]!.caption);
      const box = h("div", { class: "lightbox" }, h("button", { class: "iconbtn", onclick: () => box.remove() }, icon("close", 26)), im, cap);
      box.addEventListener("click", (e) => {
        if (e.target !== im) return;
        i = (i + 1) % images.length;
        im.src = images[i]!.src;
        cap.textContent = images[i]!.caption;
      });
      document.body.appendChild(box);
    };
    return h("div", { class: "gal", style: { gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, num(p.columns, 2)))},1fr)` } }, images.map((img, i) => h("img", { src: img.src, alt: img.caption, loading: "lazy", onclick: () => open(i) })));
  },
  video: (p) => h("div", {}, videoEmbed(str(p.url), !!p.autoplay), str(p.title) ? h("div", { class: "caption", style: { fontWeight: "600", opacity: "1" } }, str(p.title)) : null),
  radio: (p) => {
    const stream = safeUrl(p.streamUrl);
    const cover = assetUrl(p.cover);
    const btn = h("button", { class: "play", "aria-label": "Reproducir" }, icon("play", 34));
    const status = h("div", { class: "muted" }, stream ? "Pulsa para escuchar" : "Configura la URL del stream");
    const eq = h("div", { class: "eq", style: { visibility: "hidden" } }, h("i"), h("i"), h("i"), h("i"));
    const sync = (a: HTMLAudioElement) => {
      const playing = !a.paused;
      btn.replaceChildren(icon(playing ? "pause" : "play", 34));
      eq.style.visibility = playing ? "visible" : "hidden";
      status.textContent = playing ? "En directo" : "Pausado";
    };
    btn.addEventListener("click", () => {
      if (!stream) return;
      const a = playAudio(stream);
      a.onplaying = a.onpause = () => sync(a);
      a.onwaiting = () => (status.textContent = "Conectando…");
      a.onerror = () => (status.textContent = "No se pudo conectar con la emisora");
      if (a.paused) a.play().catch(() => (status.textContent = "No se pudo reproducir"));
      else a.pause();
    });
    if (currentAudio && currentAudio.src === stream) setTimeout(() => sync(currentAudio!));
    return h(
      "div",
      { class: "card radio" },
      cover ? h("img", { src: cover, alt: "" }) : h("div", { class: "play", style: { width: "120px", height: "120px" } }, icon("radio", 54)),
      h("div", { class: "st" }, str(p.stationName)),
      str(p.slogan) ? h("div", { class: "sl" }, str(p.slogan)) : null,
      btn,
      eq,
      status,
    );
  },
  playlist: (p) => {
    const tracks = arr(p.tracks).filter((t) => safeUrl(t.url));
    const rows: HTMLElement[] = [];
    const list = h("div", { class: "card" });
    tracks.forEach((t, i) => {
      const cover = assetUrl(t.cover);
      const ic = h("span", {}, icon("play", 20));
      const row = h(
        "div",
        { class: "track" },
        cover ? h("img", { src: cover, alt: "" }) : h("div", { class: "ph" }),
        h("div", { style: { flex: "1", minWidth: "0" } }, h("div", { class: "t", style: { fontWeight: "600" } }, str(t.title)), h("div", { class: "muted" }, str(t.artist))),
        ic,
      );
      row.addEventListener("click", () => {
        const a = playAudio(safeUrl(t.url));
        if (a.paused) a.play().catch(() => undefined);
        else a.pause();
        const update = () => rows.forEach((r, j) => {
          const on = j === i && !a.paused;
          r.classList.toggle("on", on);
          r.lastElementChild!.replaceChildren(icon(on ? "pause" : "play", 20));
        });
        a.onplay = a.onpause = update;
        a.onended = () => rows[i + 1]?.click();
        update();
      });
      rows.push(row);
      list.appendChild(row);
    });
    return h("div", {}, str(p.title) ? h("h2", { class: "hd md", style: { marginBottom: "10px" } }, str(p.title)) : null, tracks.length ? list : h("div", { class: "card center" }, "Añade pistas de audio"));
  },
  rss: (p, ctx) => {
    const feedUrl = safeUrl(p.feedUrl);
    const box = h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("div", { class: "spinner" }));
    if (!feedUrl) {
      box.replaceChildren(h("div", { class: "card center" }, "Configura la URL del feed RSS"));
      return box;
    }
    const showImages = p.showImages !== false;
    fetchText(feedUrl)
      .then((xml) => {
        let host = "";
        try {
          host = new URL(feedUrl).hostname.replace(/^www\./, "");
        } catch {
          /* ignore */
        }
        const items = parseFeed(xml, host).slice(0, Math.max(1, num(p.limit, 10)));
        items.forEach((it) => ctx.rssCache.set(it.id, it));
        box.replaceChildren(...(items.length ? items.map((it) => rssRow(it, ctx, showImages)) : [h("div", { class: "center" }, "No hay noticias")]));
      })
      .catch((e: Error) => box.replaceChildren(h("div", { class: "msg err" }, `No se pudieron cargar las noticias: ${e.message}`)));
    return box;
  },
  webview: (p) => {
    const url = safeUrl(p.url);
    const height = num(p.height, 0);
    if (!url) return h("div", { class: "card center" }, "Configura la URL");
    const frame = h("iframe", { class: "web", src: url, style: height > 0 ? { height: `${height}px` } : { minHeight: "70vh" }, allow: "geolocation; fullscreen; autoplay" });
    return h("div", { class: "webwrap" }, frame, h("a", { class: "lnk", style: { padding: "0 14px 8px", fontSize: "13px" }, onclick: () => openExternal(url) }, "Abrir en el navegador", icon("external", 14)));
  },
  form: (p, _ctx, block) => {
    const fields = arr(p.fields);
    const msg = h("div");
    const submit = h("button", { class: "btn filled", type: "submit" }, str(p.submitLabel, "Enviar"));
    const form = h(
      "form",
      { class: "frm card", style: { padding: "16px" } },
      str(p.title) ? h("h2", { class: "hd sm" }, str(p.title)) : null,
      fields.map((f, i) => {
        const kind = str(f.kind, "text");
        const name = `f${i}`;
        const input = kind === "textarea" ? h("textarea", { name, rows: 4, required: !!f.required, maxlength: 5000 }) : h("input", { name, type: kind, required: !!f.required, maxlength: 500 });
        return h("label", {}, `${str(f.label)}${f.required ? " *" : ""}`, input);
      }),
      submit,
      msg,
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data: Record<string, string> = {};
      fields.forEach((f, i) => (data[str(f.label, `Campo ${i + 1}`)] = String(fd.get(`f${i}`) ?? "")));
      const { apiBase, projectId, mode } = env();
      submit.disabled = true;
      try {
        const res = await fetch(`${apiBase}/api/public/apps/${projectId}/forms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId: block.id, formTitle: str(p.title), data, source: mode }),
        });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`);
        form.reset();
        msg.replaceChildren(h("div", { class: "msg" }, str(p.successMessage, "¡Enviado!")));
      } catch (err) {
        msg.replaceChildren(h("div", { class: "msg err" }, `No se pudo enviar: ${(err as Error).message}`));
      } finally {
        submit.disabled = false;
      }
    });
    return form;
  },
  contact: (p) => {
    const rows: [string, string, string, string][] = [];
    if (str(p.phone)) rows.push(["phone", "Llamar", str(p.phone), `tel:${str(p.phone).replace(/[^\d+]/g, "")}`]);
    if (str(p.whatsapp)) rows.push(["whatsapp", "WhatsApp", str(p.whatsapp), `https://wa.me/${str(p.whatsapp).replace(/[^\d]/g, "")}`]);
    if (str(p.email)) rows.push(["mail", "Email", str(p.email), `mailto:${str(p.email)}`]);
    if (str(p.address)) rows.push(["map", "Dirección", str(p.address), `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(str(p.address))}`]);
    if (!rows.length && !str(p.hours)) return h("div", { class: "card center" }, "Añade tus datos de contacto");
    return h(
      "div",
      { class: "card contact" },
      rows.map(([ic, label, value, href]) => h("div", { class: "row", onclick: () => openExternal(href) }, h("div", { class: "ic" }, icon(ic, 20)), h("div", {}, h("div", { style: { fontWeight: "600" } }, label), h("div", { class: "muted" }, value)))),
      str(p.hours) ? h("div", { class: "row", style: { cursor: "default" } }, h("div", { class: "ic" }, icon("calendar", 20)), h("div", {}, h("div", { style: { fontWeight: "600" } }, "Horario"), h("div", { class: "muted", style: { whiteSpace: "pre-wrap" } }, str(p.hours)))) : null,
    );
  },
  map: (p) => {
    const lat = num(p.lat, 40.4168);
    const lng = num(p.lng, -3.7038);
    const zoom = num(p.zoom, 15);
    const d = 0.02 / Math.pow(2, zoom - 13);
    const bbox = [lng - d, lat - d * 0.6, lng + d, lat + d * 0.6].map((n) => n.toFixed(5)).join(",");
    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "8px" } },
      h("iframe", { class: "mapf", src: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`, loading: "lazy" }),
      h("button", { class: "btn outline", onclick: () => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`) }, icon("map", 18), `Cómo llegar${str(p.label) ? ` a ${str(p.label)}` : ""}`),
    );
  },
  social: (p) =>
    h(
      "div",
      { class: "social" },
      arr(p.links).map((l) => h("button", { "aria-label": str(l.network), onclick: () => openExternal(str(l.url)) }, icon(str(l.network, "web"), 24))),
    ),
  favorites: (p, ctx) => {
    const list = favorites.all();
    if (!list.length) return h("div", { class: "center" }, icon("heart", 36), h("p", {}, str(p.emptyText, "Aún no tienes favoritos.")));
    return h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, list.map((it) => rssRow(it, ctx, true)));
  },
  search: (p, ctx) => {
    const input = h("input", { class: "inp", type: "search", placeholder: str(p.placeholder, "Buscar…") });
    const results = h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });
    const run = () => {
      const q = input.value.trim().toLowerCase();
      results.replaceChildren();
      if (q.length < 2) return;
      const found: HTMLElement[] = [];
      for (const pg of ctx.cfg.pages) {
        const texts = [pg.title, ...pg.blocks.flatMap((b) => collectText(b.props))].join(" ").toLowerCase();
        if (texts.includes(q)) found.push(h("div", { class: "card rss-item", onclick: () => ctx.navigate(pg.id) }, icon(pg.icon), h("div", { class: "t" }, pg.title)));
      }
      for (const it of [...ctx.rssCache.values(), ...favorites.all()]) {
        if (`${it.title} ${it.summary}`.toLowerCase().includes(q) && found.length < 50) found.push(rssRow(it, ctx, true));
      }
      results.replaceChildren(...(found.length ? found : [h("div", { class: "center" }, "Sin resultados")]));
    };
    input.addEventListener("input", run);
    return h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, input, results);
  },
  auth: (p) => authBlock(p),
  push: (p) => {
    const msg = h("div");
    const KEY = "forjapp:push";
    const btn = h("button", { class: "btn filled" }, icon("bell", 18), storage.get(KEY) ? "Notificaciones activadas" : "Activar notificaciones");
    btn.addEventListener("click", async () => {
      try {
        const token = await enablePush();
        const { apiBase, projectId } = env();
        await fetch(`${apiBase}/api/public/apps/${projectId}/push`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, platform: "android" }) });
        storage.set(KEY, "1");
        btn.lastChild!.textContent = "Notificaciones activadas";
        msg.replaceChildren(h("div", { class: "msg" }, "¡Listo! Recibirás nuestras novedades."));
      } catch (e) {
        msg.replaceChildren(h("div", { class: "msg err" }, (e as Error).message));
      }
    });
    return h("div", { class: "card", style: { padding: "16px", display: "flex", flexDirection: "column", gap: "10px" } }, h("h2", { class: "hd sm" }, str(p.title)), h("p", { class: "tx muted" }, str(p.text)), btn, msg);
  },
};

function collectText(v: unknown): string[] {
  if (typeof v === "string") return /^https?:|^\/|^assets\//.test(v) ? [] : [v];
  if (Array.isArray(v)) return v.flatMap(collectText);
  if (v && typeof v === "object") return Object.values(v).flatMap(collectText);
  return [];
}

// ---------------- App users (auth) ----------------
const TOKEN_KEY = "forjapp:user";
function authBlock(p: Record<string, unknown>): HTMLElement {
  const root = h("div", { class: "card", style: { padding: "16px" } });
  const render = () => {
    const saved = storage.get(TOKEN_KEY);
    if (saved) {
      let user: { name?: string; email?: string } = {};
      try {
        user = JSON.parse(saved).user ?? {};
      } catch {
        /* ignore */
      }
      root.replaceChildren(
        h("div", { style: { display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", textAlign: "center" } },
          h("div", { class: "ic", style: { width: "64px", height: "64px", borderRadius: "50%", background: "var(--p)", color: "var(--on-p)", display: "flex", alignItems: "center", justifyContent: "center" } }, icon("user", 32)),
          h("div", { style: { fontWeight: "700", fontSize: "18px" } }, user.name ?? ""),
          h("div", { class: "muted" }, user.email ?? ""),
          h("button", { class: "btn outline", onclick: () => { storage.remove(TOKEN_KEY); render(); } }, "Cerrar sesión"),
        ),
      );
      return;
    }
    let mode: "login" | "register" = "login";
    const draw = () => {
      const msg = h("div");
      const nameIn = h("input", { name: "name", required: true, maxlength: 80 });
      const emailIn = h("input", { name: "email", type: "email", required: true, maxlength: 200 });
      const passIn = h("input", { name: "password", type: "password", required: true, minlength: 8, maxlength: 200 });
      const btn = h("button", { class: "btn filled", type: "submit" }, mode === "login" ? "Entrar" : "Crear cuenta");
      const form = h(
        "form",
        { class: "frm" },
        h("h2", { class: "hd sm" }, str(p.welcomeText, "Accede a tu cuenta")),
        mode === "register" ? h("label", {}, "Nombre", nameIn) : null,
        h("label", {}, "Email", emailIn),
        h("label", {}, "Contraseña", passIn),
        btn,
        msg,
        p.allowRegister !== false
          ? h("a", { class: "lnk", style: { justifyContent: "center" }, onclick: () => { mode = mode === "login" ? "register" : "login"; draw(); } }, mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra")
          : null,
      );
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        btn.disabled = true;
        const { apiBase, projectId } = env();
        try {
          const res = await fetch(`${apiBase}/api/public/apps/${projectId}/auth/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nameIn.value, email: emailIn.value, password: passIn.value }),
          });
          const json = (await res.json().catch(() => ({}))) as { error?: string; token?: string; user?: unknown };
          if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
          storage.set(TOKEN_KEY, JSON.stringify({ token: json.token, user: json.user }));
          render();
        } catch (err) {
          msg.replaceChildren(h("div", { class: "msg err" }, (err as Error).message));
        } finally {
          btn.disabled = false;
        }
      });
      root.replaceChildren(form);
    };
    draw();
  };
  render();
  return root;
}

export function renderBlock(block: Block, ctx: Ctx): HTMLElement {
  const r = R[block.type];
  let el: HTMLElement;
  try {
    el = r ? r(block.props ?? {}, ctx, block) : h("div", { class: "card center" }, `Módulo no soportado: ${block.type}`);
  } catch (e) {
    el = h("div", { class: "msg err" }, `Error en el bloque: ${(e as Error).message}`);
  }
  el.dataset.blockId = block.id;
  return el;
}
