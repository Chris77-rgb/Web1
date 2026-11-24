"use client";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("fj-theme", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} className={cn("rounded-xl p-2 text-muted transition hover:bg-card-2 hover:text-fg", className)} aria-label="Cambiar tema claro/oscuro">
      <Sun className="hidden size-5 dark:block" />
      <Moon className="size-5 dark:hidden" />
    </button>
  );
}
