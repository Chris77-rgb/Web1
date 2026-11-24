"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    try {
      await api("/api/v1/auth/register", { body: { name: f.get("name"), email: f.get("email"), password: f.get("password") } });
      router.replace("/dashboard?welcome=1");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-muted">Empieza gratis. No necesitas tarjeta.</p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Nombre"><Input name="name" autoComplete="name" required minLength={2} maxLength={80} /></Field>
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres, con letras y números."><Input name="password" type="password" autoComplete="new-password" required minLength={8} /></Field>
        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" size="lg" loading={loading}>Crear cuenta</Button>
        <p className="text-center text-xs text-muted">Al registrarte aceptas los términos del servicio y la política de privacidad.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">¿Ya tienes cuenta? <Link className="font-medium text-brand-600 hover:underline dark:text-brand-300" href="/login">Inicia sesión</Link></p>
    </>
  );
}
