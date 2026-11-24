"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client";

export default function ForgotPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/v1/auth/forgot-password", { body: { email: new FormData(e.currentTarget).get("email") } });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent)
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-12 text-brand-600" />
        <h1 className="mt-4 text-2xl font-bold">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-muted">Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña. Caduca en 1 hora.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">Volver a iniciar sesión</Link>
      </div>
    );

  return (
    <>
      <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-muted">Te enviaremos un enlace para crear una nueva.</p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" size="lg" loading={loading}>Enviar enlace</Button>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-brand-600 hover:underline dark:text-brand-300">Volver</Link></p>
    </>
  );
}
