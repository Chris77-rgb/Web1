import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { route, ApiError, withCors } from "@/lib/api";

/** Public read access to uploaded images (needed by the preview and installed apps). */
export const GET = route<{ params: Promise<{ key: string[] }> }>(async (_req, { params }) => {
  const key = (await params).key.join("/");
  if (!key.startsWith("uploads/")) throw new ApiError(404, "No encontrado");
  const asset = await db.asset.findUnique({ where: { key } });
  if (!asset || !asset.mime.startsWith("image/")) throw new ApiError(404, "No encontrado");
  const { stream, size } = await storage.stream(key);
  return withCors(
    new Response(stream, {
      headers: { "Content-Type": asset.mime, "Content-Length": String(size), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    }),
  );
});
