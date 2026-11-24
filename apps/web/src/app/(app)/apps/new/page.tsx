import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_CATEGORIES } from "@forjapp/shared";
import { NewAppWizard } from "@/components/apps/new-app-wizard";

export const metadata = { title: "Crear aplicación" };

export default async function NewAppPage() {
  await requireUserPage();
  const templates = await db.template.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }], select: { id: true, name: true, category: true, description: true, accent: true, config: true } });
  return (
    <NewAppWizard
      categories={APP_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
      templates={templates.map((t) => {
        const c = t.config as { pages?: { title: string }[]; theme?: { mode?: string } };
        return { id: t.id, name: t.name, category: t.category, description: t.description, accent: t.accent, pages: (c.pages ?? []).map((p) => p.title), dark: c.theme?.mode === "dark" };
      })}
    />
  );
}
