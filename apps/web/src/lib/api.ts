/**
 * Helpers shared by every REST route handler in src/app/api.
 * Usage:
 *   export const POST = route(async (req) => { const user = await requireUser(); ... return ok(data) })
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { getCurrentUser, type SafeUser } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, error: string, details?: unknown) => NextResponse.json({ error, details }, { status });

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

export function route<C = { params: Promise<Record<string, string>> }>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    const p = req.nextUrl.pathname;
    const isPublic = p.startsWith("/api/public/") || p.startsWith("/api/v1/proxy") || p.startsWith("/api/v1/files/");
    const out = (r: Response) => (isPublic ? withCors(r) : r);
    try {
      return out(await handler(req, ctx));
    } catch (e) {
      if (e instanceof ApiError) return out(fail(e.status, e.message, e.details));
      if (e instanceof ZodError) return out(fail(400, "Datos no válidos", e.issues.map((i) => ({ path: i.path.join("."), message: i.message }))));
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return out(fail(500, "Error interno del servidor"));
    }
  };
}

export async function body<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "El cuerpo de la petición debe ser JSON");
  }
  return schema.parse(json);
}

export async function requireUser(): Promise<SafeUser> {
  const u = await getCurrentUser();
  if (!u) throw new ApiError(401, "No autenticado");
  return u;
}

export async function requireVerifiedUser(): Promise<SafeUser> {
  const u = await requireUser();
  if (!u.emailVerifiedAt) throw new ApiError(403, "Verifica tu correo electrónico para continuar");
  return u;
}

export async function requireAdmin(): Promise<SafeUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new ApiError(403, "Acceso restringido a administradores");
  return u;
}

// ---- Simple fixed-window rate limiter (per process). Use Redis for multi-instance deployments. ----
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return;
  }
  b.count += 1;
  if (b.count > limit) throw new ApiError(429, "Demasiadas peticiones. Inténtalo de nuevo en unos minutos.");
}

export function ipOf(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** CORS headers for public endpoints called from generated apps / sandboxed preview. */
export const PUBLIC_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function withCors(res: Response): Response {
  for (const [k, v] of Object.entries(PUBLIC_CORS)) res.headers.set(k, v);
  return res;
}

export const corsPreflight = async () => new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
