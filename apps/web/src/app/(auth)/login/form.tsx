"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    try {
      await api("/api/v1/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <Field label="Email"><Input name="email" type="email" autoComplete="email" required placeholder="tu@email.com" /></Field>
      <Field label="Contraseña"><Input name="password" type="password" autoComplete="current-password" required /></Field>
      <div className="-mt-1 text-right"><Link href="/forgot-password" className="text-sm text-brand-600 hover:underline dark:text-brand-300">¿Has olvidado tu contraseña?</Link></div>
      {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" size="lg" loading={loading}>Iniciar sesión</Button>
    </form>
  );
}
