import { z } from "zod";
import { route, body, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";

const imageSchema = z.string().trim().max(500).refine((v) => /^https:\/\//i.test(v) || v.startsWith("/api/v1/files/uploads/"), "La imagen debe ser una URL https:// o un archivo subido");
const linkSchema = z.string().trim().max(500).refine((v) => /^https?:\/\//i.test(v), "El enlace debe empezar por http:// o https://");

const schema = z.object({ name: z.string().trim().min(2).max(80), imageUrl: imageSchema, linkUrl: linkSchema, weight: z.number().int().min(1).max(100).default(1) });

export const GET = route(async () => {
  await requireAdmin();
  return ok({ ads: await db.houseAd.findMany({ orderBy: { createdAt: "desc" } }) });
});

export const POST = route(async (req) => {
  await requireAdmin();
  const ad = await db.houseAd.create({ data: await body(req, schema) });
  return ok({ ad }, 201);
});
