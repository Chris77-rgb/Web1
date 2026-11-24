import { requireUserPage } from "@/lib/auth";
import { PageHeader } from "@/components/ui/card";
import { ProfileForms } from "@/components/profile-forms";
import { ProfileAi } from "@/components/profile-ai";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUserPage();
  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader title="Perfil" description="Tus datos personales y seguridad de la cuenta." />
      <div className="flex flex-col gap-6">
        <ProfileForms user={{ name: user.name, email: user.email, verified: !!user.emailVerifiedAt, createdAt: user.createdAt.toISOString() }} />
        <ProfileAi />
      </div>
    </div>
  );
}
