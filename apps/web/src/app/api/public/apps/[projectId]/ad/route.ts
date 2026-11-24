import { randomUUID } from "node:crypto";
import { creatorHasAds, validateAppConfig } from "@forjapp/shared";
import { route, ok, rateLimit, ipOf, corsPreflight } from "@/lib/api";
import { db } from "@/lib/db";
import { countImpression, decideAd, getAdShare, pickForjappAd, visitorBucket, visitorSeq } from "@/lib/ads";

const VISITOR = /^[a-zA-Z0-9-]{8,64}$/;

/** Which ad does this visitor see on this published page? */
export const GET = route<{ params: Promise<{ projectId: string }> }>(async (req, { params }) => {
  rateLimit(`ad:${ipOf(req)}`, 120, 60_000);
  const { projectId } = await params;
  const none = () => ok({ source: "none" }, 200);
  if (!/^[a-z0-9]{10,40}$/i.test(projectId)) return none();
  // Installed APK/AAB apps (src=app) follow the project's current config; web pages follow what is published.
  const fromApp = req.nextUrl.searchParams.get("src") === "app";
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, status: true, config: true, publishedConfig: true, adfreeUntil: true } });
  if (!project || project.status === "ARCHIVED") return none();
  const live = fromApp ? project.config : project.status === "PUBLISHED" ? project.publishedConfig : null;
  if (!live) return none();
  const v = validateAppConfig(live);
  if (!v.ok) return none();

  const raw = req.nextUrl.searchParams.get("v") ?? "";
  const visitor = VISITOR.test(raw) ? raw : randomUUID(); // anonymous visitors count as new each time
  const adfree = !!project.adfreeUntil && project.adfreeUntil > new Date();
  const source = decideAd({
    creatorHasAds: creatorHasAds(v.config.ads),
    bucket: visitorBucket(visitor, project.id),
    sharePercent: await getAdShare(),
    adfreeSeq: adfree ? await visitorSeq(project.id, visitor) : null,
  });

  const res = (body: unknown) => {
    const r = ok(body);
    r.headers.set("Cache-Control", "no-store");
    return r;
  };
  if (source !== "forjapp") return res({ source });
  const ad = await pickForjappAd(project.id);
  await countImpression(project.id, ad.id);
  return res({ source, ad: { imageUrl: ad.imageUrl, text: ad.text, clickUrl: ad.clickUrl } });
});
export const OPTIONS = corsPreflight;
