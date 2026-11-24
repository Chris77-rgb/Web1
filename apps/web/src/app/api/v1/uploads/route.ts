import { route, ok, requireUser, ApiError, rateLimit } from "@/lib/api";
import { db } from "@/lib/db";
import { storage, sniffMime, ALLOWED_UPLOADS } from "@/lib/storage";
import { assertStorage } from "@/lib/limits";
import { randomToken } from "@/lib/crypto";

const MAX_SIZE = 5 * 1024 * 1024;

/** multipart/form-data: file, projectId? → { url, assetId } */
export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`upload:${user.id}`, 60, 10 * 60_000);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No se ha recibido ningún archivo");
  if (file.size > MAX_SIZE) throw new ApiError(413, "El archivo supera el máximo de 5 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf, file.type);
  if (!mime || !ALLOWED_UPLOADS[mime]) throw new ApiError(415, "Formato no admitido. Usa PNG, JPG, WEBP, GIF o JSON.");
  await assertStorage(user.id, user.planCode, buf.length);

  const projectId = typeof form?.get("projectId") === "string" ? String(form!.get("projectId")) : null;
  if (projectId) {
    const p = await db.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!p || p.userId !== user.id) throw new ApiError(404, "Proyecto no encontrado");
  }
  const key = `uploads/${user.id}/${randomToken(12)}.${ALLOWED_UPLOADS[mime]}`;
  await storage.put(key, buf);
  const asset = await db.asset.create({ data: { userId: user.id, projectId, key, mime, size: buf.length, filename: file.name.slice(0, 200) } });
  // JSON files (e.g. google-services.json) are private and referenced by key; images are public.
  return ok({ assetId: asset.id, key, url: mime === "application/json" ? null : `/api/v1/files/${key}` }, 201);
});
