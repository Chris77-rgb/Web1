"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Smartphone, PlusCircle, User, CreditCard, Shield, Users, FolderKanban, LayoutTemplate, Layers, Settings, LogOut, Menu, X, Hammer, Megaphone,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client";

interface Props {
  user: { name: string; email: string; role: string; planName: string; verified: boolean };
}

const MAIN = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/apps", label: "Mis aplicaciones", icon: Smartphone },
  { href: "/apps/new", label: "Crear aplicación", icon: PlusCircle },
  { href: "/profile", label: "Perfil", icon: User },
  { href: "/billing", label: "Plan y facturación", icon: CreditCard },
];
const ADMIN = [
  { href: "/admin", label: "Resumen", icon: Shield },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/admin/builds", label: "Compilaciones", icon: Hammer },
  { href: "/admin/ads", label: "Anuncios", icon: Megaphone },
  { href: "/admin/templates", label: "Plantillas", icon: LayoutTemplate },
  { href: "/admin/plans", label: "Planes", icon: Layers },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

function isActive(path: string, href: string) {
  if (href === "/apps") return path === "/apps" || (path.startsWith("/apps/") && !path.startsWith("/apps/new"));
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

export function AppShell({ user, children, notice }: Props & { children: React.ReactNode; notice?: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const logout = async () => {
    await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4 scroll-thin">
      <ul className="flex flex-col gap-0.5">
        {MAIN.map((i) => (
          <NavItem key={i.href} {...i} active={isActive(path, i.href)} />
        ))}
      </ul>
      {user.role === "ADMIN" && (
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Administración</p>
          <ul className="flex flex-col gap-0.5">
            {ADMIN.map((i) => (
              <NavItem key={i.href} {...i} active={isActive(path, i.href)} />
            ))}
          </ul>
        </div>
      )}
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 rounded-xl p-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-amber-500 text-sm font-bold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">Plan {user.planName}</p>
        </div>
        <ThemeToggle />
        <button onClick={logout} className="rounded-xl p-2 text-muted hover:bg-card-2 hover:text-fg" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut className="size-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-card lg:flex">
        <div className="flex h-16 items-center px-5"><Link href="/dashboard"><Logo /></Link></div>
        {nav}
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="animate-slide-up absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="p-1 text-muted"><X className="size-5" /></button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-lg p-1.5 text-muted hover:bg-card-2"><Menu className="size-5" /></button>
          <Logo />
        </header>
        {notice && <div className="border-b border-brand-500/20 bg-brand-500/10 px-4 py-2.5 text-center text-sm text-brand-800 dark:text-brand-200">{notice}</div>}
        {!user.verified && <VerifyBanner email={user.email} />}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          active ? "bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-muted hover:bg-card-2 hover:text-fg",
        )}
      >
        <Icon className="size-[18px]" />
        {label}
      </Link>
    </li>
  );
}

function VerifyBanner({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-800 dark:text-amber-300">
      Verifica tu correo ({email}) para poder compilar apps.{" "}
      <button
        className="font-semibold underline underline-offset-2 disabled:opacity-60"
        disabled={sent}
        onClick={() => api("/api/v1/auth/resend-verification", { method: "POST" }).then(() => setSent(true)).catch(() => setSent(true))}
      >
        {sent ? "Enlace enviado" : "Reenviar enlace"}
      </button>
    </div>
  );
}
