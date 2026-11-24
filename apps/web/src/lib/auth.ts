/**
 * Session-based authentication.
 *
 * - Passwords: bcrypt (cost 12).
 * - Sessions: random 256-bit token in an httpOnly, SameSite=Lax cookie; only its
 *   SHA-256 hash is stored in the DB, so a DB leak does not leak sessions.
 * - Email verification / password reset tokens follow the same hash-only rule.
 */
import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { TokenType, User } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { env } from "./env";

export const SESSION_COOKIE = "fj_session";
const SESSION_DAYS = 30;

export type SafeUser = Pick<User, "id" | "email" | "name" | "role" | "planCode" | "emailVerifiedAt" | "avatarUrl" | "createdAt">;

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function toSafeUser(u: User): SafeUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, planCode: u.planCode, emailVerifiedAt: u.emailVerifiedAt, avatarUrl: u.avatarUrl, createdAt: u.createdAt };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const h = await headers();
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      ip: clientIp(h),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
    },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd(),
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.user.disabled) return null;
  return toSafeUser(session.user);
}

/** For server components/pages: redirects to /login when not authenticated. */
export async function requireUserPage(): Promise<SafeUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdminPage(): Promise<SafeUser> {
  const u = await requireUserPage();
  if (u.role !== "ADMIN") redirect("/dashboard");
  return u;
}

export async function issueToken(userId: string, type: TokenType, ttlMinutes: number): Promise<string> {
  const token = randomToken();
  await db.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await db.authToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) } });
  return token;
}

/** Validates and consumes a one-time token. Returns the user id or null. */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  const row = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  await db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;
}

export function clientIp(h: Headers): string | null {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
