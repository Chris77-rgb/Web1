import { route, ApiError, withCors, rateLimit, ipOf, corsPreflight } from "@/lib/api";
import { safeFetchText } from "@/lib/safe-fetch";

/** CORS proxy used by the live preview to read RSS feeds. Read-only, SSRF-protected. */
export const GET = route(async (req) => {
  rateLimit(`proxy:${ipOf(req)}`, 120, 60_000);
  const url = req.nextUrl.searchParams.get("url");
  if (!url) throw new ApiError(400, "Falta el parámetro url");
  try {
    const { body } = await safeFetchText(url);
    return withCors(new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } }));
  } catch (e) {
    return withCors(Response.json({ error: (e as Error).message }, { status: 502 }));
  }
});
export const OPTIONS = corsPreflight;
