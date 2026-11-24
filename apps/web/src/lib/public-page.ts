import "server-only";
import { Prisma } from "@prisma/client";
import { validateAppConfig, type AppConfig } from "@forjapp/shared";
import { db } from "./db";

export const SLUG = /^[a-z0-9-]{3,60}$/;

/** The live (published) snapshot of a project, or null if the slug is unknown or the page is offline. */
export async function getPublishedPage(slug: string): Promise<{ id: string; config: AppConfig } | null> {
  if (!SLUG.test(slug)) return null;
  const p = await db.project.findFirst({
    where: { slug, status: "PUBLISHED", publishedConfig: { not: Prisma.DbNull } },
    select: { id: true, publishedConfig: true },
  });
  if (!p?.publishedConfig) return null;
  const v = validateAppConfig(p.publishedConfig);
  return v.ok ? { id: p.id, config: v.config } : null;
}

const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

/** JSON that is safe inside an inline <script> (no "</script>" or line-separator breakouts). */
export const safeJson = (v: unknown) =>
  JSON.stringify(v).replace(/</g, "\\u003c").replace(LINE_SEP, "\\u2028").replace(PARA_SEP, "\\u2029");

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const notFoundHtml = () =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No encontrada</title><body style="font-family:system-ui;text-align:center;padding:15vh 24px;color:#334155"><h1>Esta página no está disponible</h1><p>Puede que se haya despublicado o que el enlace sea incorrecto.</p>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
