import { env } from "@/lib/env";
import { getPublishedPage, notFoundHtml } from "@/lib/public-page";

export const dynamic = "force-dynamic";

/** Web app manifest so visitors can "install" the page to their home screen. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return notFoundHtml();
  const { meta, theme, branding } = page.config;
  const icon = branding.iconUrl?.startsWith("/") ? `${env.appUrl}${branding.iconUrl}` : (branding.iconUrl ?? "");
  const type = /\.webp$/i.test(icon) ? "image/webp" : /\.jpe?g$/i.test(icon) ? "image/jpeg" : "image/png";
  return Response.json(
    {
      name: meta.name,
      short_name: meta.name.slice(0, 12),
      description: meta.description || undefined,
      start_url: `/s/${slug}`,
      scope: `/s/${slug}`,
      display: "standalone",
      background_color: theme.background,
      theme_color: theme.primary,
      icons: /^https?:\/\//.test(icon) ? [{ src: icon, sizes: "512x512", type, purpose: "any" }] : [],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } },
  );
}
