import { env } from "@/lib/env";
import { escapeHtml, getPublishedPage, notFoundHtml, safeJson } from "@/lib/public-page";

export const dynamic = "force-dynamic";

/**
 * Public page shell. It contains NO creator-controlled script: it only keeps an anonymous visitor id
 * (used to split ads) and embeds the creator's app in an isolated iframe (see ./frame).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return notFoundHtml();
  const { meta, theme, branding } = page.config;
  const name = escapeHtml(meta.name);
  const desc = escapeHtml(meta.description || `${meta.name}, creada con Forjapp`);
  const icon = branding.iconUrl?.startsWith("/") ? `${env.appUrl}${branding.iconUrl}` : (branding.iconUrl ?? "");
  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${name}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="${theme.primary}">
<meta property="og:title" content="${name}"><meta property="og:description" content="${desc}"><meta property="og:type" content="website">
${/^https?:\/\//.test(icon) ? `<meta property="og:image" content="${escapeHtml(icon)}"><link rel="icon" href="${escapeHtml(icon)}"><link rel="apple-touch-icon" href="${escapeHtml(icon)}">` : ""}
<link rel="manifest" href="/s/${slug}/manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">
<style>html,body{margin:0;height:100%;background:${theme.background}}iframe{display:block;border:0;width:100%;height:100%}</style>
</head><body>
<iframe id="app" title="${name}" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" allow="autoplay; fullscreen" allowfullscreen></iframe>
<script>
(function(){
  var v="";
  try{v=localStorage.getItem("fj_vid")||"";if(!v){v=(crypto.randomUUID&&crypto.randomUUID())||(Date.now().toString(36)+Math.random().toString(36).slice(2,12));localStorage.setItem("fj_vid",v)}}catch(e){}
  document.getElementById("app").src="/s/"+${safeJson(slug)}+"/frame"+(v?"?v="+encodeURIComponent(v):"");
})();
</script>
<noscript>Esta página necesita JavaScript.</noscript>
</body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'; manifest-src 'self'; img-src https: data:",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
