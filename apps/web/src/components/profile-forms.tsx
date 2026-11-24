"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function ProfileForms({ user }: { user: { name: string; email: string; verified: boolean; createdAt: string } }) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const submit = (key: string, fn: (f: FormData) => Promise<unknown>, msg: string) => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(key);
    try {
      await fn(new FormData(form));
      toast(msg, "success");
      if (key === "pw") form.reset();
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Datos personales" action={user.verified ? <Badge tone="green">Email verificado</Badge> : <Badge tone="amber">Sin verificar</Badge>} />
        <form className="flex flex-col gap-4 p-5" onSubmit={submit("profile", (f) => api("/api/v1/profile", { method: "PATCH", body: { name: f.get("name") } }), "Perfil actualizado")}>
          <Field label="Nombre"><Input name="name" defaultValue={user.name} required minLength={2} maxLength={80} /></Field>
          <Field label="Email" hint="El email no se puede cambiar por ahora."><Input value={user.email} disabled /></Field>
          <p className="text-xs text-muted">Miembro desde {new Date(user.createdAt).toLocaleDateString("es-ES", { dateStyle: "long" })}</p>
          <div><Button type="submit" loading={busy === "profile"}>Guardar</Button></div>
        </form>
      </Card>
      <Card>
        <CardHeader title="Cambiar contraseña" description="Se cerrarán el resto de sesiones abiertas." />
        <form
          className="flex flex-col gap-4 p-5"
          onSubmit={submit("pw", async (f) => {
            if (f.get("newPassword") !== f.get("confirm")) throw new Error("Las contraseñas no coinciden");
            return api("/api/v1/profile/password", { body: { currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") } });
          }, "Contraseña actualizada")}
        >
          <Field label="Contraseña actual"><Input name="currentPassword" type="password" required autoComplete="current-password" /></Field>
          <Field label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números."><Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <Field label="Repite la nueva contraseña"><Input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <div><Button type="submit" loading={busy === "pw"}>Cambiar contraseña</Button></div>
        </form>
      </Card>
    </div>
  );
}
