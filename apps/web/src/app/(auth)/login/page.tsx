import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./form";
export const metadata = { title: "Iniciar sesión" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-bold">Bienvenido de nuevo</h1>
      <p className="mt-1 text-sm text-muted">Accede a tu panel para seguir creando.</p>
      <Suspense><LoginForm /></Suspense>
      <p className="mt-6 text-center text-sm text-muted">¿No tienes cuenta? <Link className="font-medium text-brand-600 hover:underline dark:text-brand-300" href="/register">Regístrate gratis</Link></p>
    </>
  );
}
