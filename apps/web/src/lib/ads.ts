/**
 * Ad serving for published pages.
 *
 * Rules (same model as AppCreator24):
 *  - The creator has no ads of their own  → Forjapp shows its ads to 100% of visitors.
 *  - The creator has their own ad         → Forjapp shows its ads to `adSharePercent`% of visitors (20 by default),
 *                                           the creator's ad to everyone else.
 *  - Adfree service active on the app     → Forjapp shows NO ads to the first 1000 visitors of each (UTC) day.
 *
 * The decision is taken here, server-side. The visitor id is anonymous and stable (kept by the page shell),
 * so each visitor always lands in the same bucket instead of flipping between ads.
 */
import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import { getSettings } from "./settings";

export const ADFREE_FREE_VISITORS = 1000;

export type AdSource = "forjapp" | "creator" | "none";

/** Stable 0-99 bucket for a visitor on a given project. */
export function visitorBucket(visitorId: string, projectId: string): number {
  return parseInt(createHash("sha256").update(`${visitorId}:${projectId}`).digest("hex").slice(0, 8), 16) % 100;
}

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** Pure decision function (unit-tested). `adfreeSeq` is the visitor's position today, or null if Adfree is inactive. */
export function decideAd(o: { creatorHasAds: boolean; bucket: number; sharePercent: number; adfreeSeq: number | null }): AdSource {
  if (o.adfreeSeq !== null && o.adfreeSeq <= ADFREE_FREE_VISITORS) return o.creatorHasAds ? "creator" : "none";
  if (!o.creatorHasAds) return "forjapp";
  return o.bucket < o.sharePercent ? "forjapp" : "creator";
}

let shareCache: { value: number; at: number } | null = null;
export async function getAdShare(): Promise<number> {
  if (shareCache && Date.now() - shareCache.at < 30_000) return shareCache.value;
  const value = (await getSettings()).adSharePercent;
  shareCache = { value, at: Date.now() };
  return value;
}
export const resetAdShareCache = () => { shareCache = null; };

/** Position (1 = first) of this visitor among today's visitors of the project. Atomic across concurrent requests. */
export async function visitorSeq(projectId: string, visitorId: string, day = dayKey()): Promise<number> {
  const existing = await db.adVisitorDay.findUnique({ where: { projectId_day_visitorId: { projectId, day, visitorId } } });
  if (existing) return existing.seq;
  const rows = await db.$queryRaw<{ n: number }[]>`
    INSERT INTO "AdDayCounter" ("projectId", "day", "n") VALUES (${projectId}, ${day}, 1)
    ON CONFLICT ("projectId", "day") DO UPDATE SET "n" = "AdDayCounter"."n" + 1
    RETURNING "n"`;
  const seq = Number(rows[0]!.n);
  await db.adVisitorDay.create({ data: { projectId, day, visitorId, seq } }).catch(() => {}); // same visitor racing itself
  return seq;
}

export async function countImpression(projectId: string, adId: string | null, day = dayKey()) {
  await db.$executeRaw`
    INSERT INTO "AdDayCounter" ("projectId", "day", "impressions") VALUES (${projectId}, ${day}, 1)
    ON CONFLICT ("projectId", "day") DO UPDATE SET "impressions" = "AdDayCounter"."impressions" + 1`;
  if (adId) await db.houseAd.update({ where: { id: adId }, data: { impressions: { increment: 1 } } }).catch(() => {});
}

export async function countClick(projectId: string, adId: string, day = dayKey()) {
  await db.$executeRaw`
    INSERT INTO "AdDayCounter" ("projectId", "day", "clicks") VALUES (${projectId}, ${day}, 1)
    ON CONFLICT ("projectId", "day") DO UPDATE SET "clicks" = "AdDayCounter"."clicks" + 1`;
  await db.houseAd.update({ where: { id: adId }, data: { clicks: { increment: 1 } } }).catch(() => {});
}

export interface AdPayload { id: string | null; imageUrl: string; text: string; clickUrl: string }

/** Weighted random among active house ads; falls back to a Forjapp self-promotion so there's always something to show. */
export async function pickForjappAd(projectId: string): Promise<AdPayload> {
  const ads = await db.houseAd.findMany({ where: { active: true }, select: { id: true, name: true, imageUrl: true, weight: true } });
  if (!ads.length) return { id: null, imageUrl: "", text: "Crea tu propia app gratis con Forjapp", clickUrl: `${env.appUrl}/register?ref=ad` };
  const total = ads.reduce((s, a) => s + Math.max(1, a.weight), 0);
  let r = Math.random() * total;
  const ad = ads.find((a) => (r -= Math.max(1, a.weight)) < 0) ?? ads[0]!;
  return { id: ad.id, imageUrl: ad.imageUrl, text: ad.name, clickUrl: `${env.appUrl}/api/public/ads/${ad.id}/click?p=${projectId}` };
}
