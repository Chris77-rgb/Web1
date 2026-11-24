import { requireUserPage } from "@/lib/auth";
import { getPlan } from "@/lib/limits";
import { AppShell } from "@/components/shell/sidebar";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  const [plan, settings] = await Promise.all([getPlan(user.planCode), getSettings()]);
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role, planName: plan.name, verified: !!user.emailVerifiedAt }} notice={settings.maintenanceMessage}>
      {children}
    </AppShell>
  );
}
