import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { escapeHtml, getPublishedPage, notFoundHtml, safeJson } from "@/lib/public-page";

export const dynamic = "force-dynamic";
const VISITOR = /^[a-zA-Z0-9-]{8,64}$/;

/**
 * The creator's app. Served with `Content-Security-Policy: sandbox` (no allow-same-origin): the document gets an
 * opaque origin, so creator content can never read Forjapp cookies or call the platform API as a logged-in user.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return notFoundHtml();
  const v = req.nextUrl.searchParams.get("v") ?? "";
  const runtimeEnv = { apiBase: env.appUrl, projectId: page.id, mode: "web", visitor: VISITOR.test(v) ? v : undefined };
  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(page.config.meta.name)}</title>
<style>html,body{margin:0;background:${page.config.theme.background}}</style>
<script>window.FORJAPP_ENV=${safeJson(runtimeEnv)};window.FORJAPP_CONFIG=${safeJson(page.config)};</script>
<script src="/runtime/runtime.js" defer></script>
</head><body></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
      "Cache-Control": "no-store",
    },
  });
}
