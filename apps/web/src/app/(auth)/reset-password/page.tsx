"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setError("Las contraseñas no coinciden");
    setLoading(true);
    setError("");
    try {
      await api("/api/v1/auth/reset-password", { body: { token, password: f.get("password") } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Contraseña actualizada</h1>
        <p className="mt-2 text-sm text-muted">Por seguridad hemos cerrado todas tus sesiones.</p>
        <Link href="/login" className="mt-6 inline-block font-medium text-brand-600 hover:underline">Iniciar sesión</Link>
      </div>
    );
  return (
    <>
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números."><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
        <Field label="Repite la contraseña"><Input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></Field>
        {!token && <p className="text-sm text-red-600">Falta el token. Usa el enlace del email.</p>}
        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" size="lg" loading={loading} disabled={!token}>Guardar contraseña</Button>
      </form>
    </>
  );
}

export default function Page() {
  return <Suspense><ResetForm /></Suspense>;
}
