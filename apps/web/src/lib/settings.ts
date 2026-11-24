import "server-only";
import { db } from "./db";

export interface SiteSettings { siteName: string; registrationOpen: boolean; maintenanceMessage: string; supportEmail: string }
const DEFAULTS: SiteSettings = { siteName: "Forjapp", registrationOpen: true, maintenanceMessage: "", supportEmail: "" };

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.setting.findMany();
  const out = { ...DEFAULTS } as Record<string, unknown>;
  for (const r of rows) if (r.key in DEFAULTS) out[r.key] = r.value;
  return out as unknown as SiteSettings;
}
