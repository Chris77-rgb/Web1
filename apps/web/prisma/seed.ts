/**
 * Idempotent seed: plans, built-in templates, default settings and an admin user.
 * Run with `npm run db:seed`. Safe to run on every deploy.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_PLANS, TEMPLATES } from "@forjapp/shared";

const db = new PrismaClient();

async function main() {
  for (const [i, p] of DEFAULT_PLANS.entries()) {
    const { code, ...rest } = p;
    await db.plan.upsert({ where: { code }, create: { code, ...rest, features: [...p.features], sortOrder: i }, update: {} });
  }
  for (const [i, t] of TEMPLATES.entries()) {
    const data = { name: t.name, category: t.category, description: t.description, accent: t.accent, config: t.config as unknown as Prisma.InputJsonValue, sortOrder: i };
    await db.template.upsert({ where: { id: t.id }, create: { id: t.id, ...data }, update: data });
  }
  const settings: Record<string, unknown> = {
    siteName: "Forjapp",
    registrationOpen: true,
    maintenanceMessage: "",
    supportEmail: "soporte@forjapp.local",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonValue }, update: {} });
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@forjapp.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!";
  const exists = await db.user.findUnique({ where: { email } });
  if (!exists) {
    await db.user.create({
      data: { email, name: "Administrador", role: "ADMIN", planCode: "ENTERPRISE", emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Admin creado: ${email}`);
  }
  console.log(`Seed OK: ${DEFAULT_PLANS.length} planes, ${TEMPLATES.length} plantillas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
