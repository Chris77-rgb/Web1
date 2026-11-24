import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { countClick } from "@/lib/ads";

/** Counts the click and redirects to the advertiser. Only admin-created, http(s)-validated links are stored. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await db.houseAd.findUnique({ where: { id }, select: { id: true, linkUrl: true } });
  const p = req.nextUrl.searchParams.get("p") ?? "";
  if (!ad || !/^https?:\/\//i.test(ad.linkUrl)) return new Response(null, { status: 302, headers: { Location: env.appUrl } });
  if (/^[a-z0-9]{10,40}$/i.test(p)) await countClick(p, ad.id).catch(() => {});
  return new Response(null, { status: 302, headers: { Location: ad.linkUrl, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
