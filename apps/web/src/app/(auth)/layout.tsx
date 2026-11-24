import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="animate-slide-up w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-amber-500 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.25),transparent_45%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="text-3xl font-bold leading-tight">Crea tu app Android en minutos.<br />Sin escribir una línea de código.</p>
          <p className="mt-4 max-w-md text-white/80">Plantillas profesionales, editor visual con vista previa en tiempo real, asistente de IA y compilación real de APK y AAB.</p>
        </div>
      </div>
    </div>
  );
}
