import Link from "next/link";
import { Sparkles, MousePointerClick, Smartphone, Hammer, Radio, Newspaper, ShoppingBag, UtensilsCrossed, GraduationCap, Users, Building2, Globe, Music, Video, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Sparkles, title: "Crea con IA", text: "Describe tu idea en una frase y obtén una app completa con páginas, textos, colores y módulos." },
  { icon: MousePointerClick, title: "Editor visual", text: "Arrastra bloques, cambia colores y fuentes y mira el resultado al instante en un móvil simulado." },
  { icon: Hammer, title: "APK y AAB reales", text: "Compilamos tu app con Android SDK y Gradle. Firmada y lista para instalar o subir a Google Play." },
  { icon: Zap, title: "20+ módulos", text: "Radio en directo, noticias RSS, vídeos, galerías, formularios, mapas, usuarios, notificaciones push…" },
  { icon: ShieldCheck, title: "Tus datos, seguros", text: "Cada app y sus formularios son privados. Cifrado de claves de firma y buenas prácticas de seguridad." },
  { icon: Smartphone, title: "Funciona sin conexión", text: "Tus imágenes y contenidos se empaquetan dentro de la app para que cargue al instante." },
];
const TYPES = [
  [Newspaper, "Noticias"], [Radio, "Radio"], [Music, "Música"], [Video, "Vídeos"], [ShoppingBag, "Tiendas"],
  [UtensilsCrossed, "Restaurantes"], [GraduationCap, "Educación"], [Users, "Comunidades"], [Building2, "Empresas"], [Globe, "Webs"],
] as const;

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className={buttonClass()}>Ir al panel</Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost")}>Entrar</Link>
                <Link href="/register" className={buttonClass()}>Empieza gratis</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(124,77,255,.18),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted"><Sparkles className="size-3.5 text-brand-500" />Ahora con asistente de inteligencia artificial</span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">Crea tu app Android<br /><span className="bg-gradient-to-r from-brand-600 to-amber-500 bg-clip-text text-transparent">sin programar</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">Diseña, personaliza y genera aplicaciones móviles profesionales en minutos. Desde una plantilla, desde cero o simplemente describiéndola.</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={user ? "/apps/new" : "/register"} className={buttonClass("primary", "lg")}>Crear mi app gratis<ArrowRight className="size-4" /></Link>
            <Link href={user ? "/apps/new?ai=1" : "/register"} className={buttonClass("outline", "lg")}><Sparkles className="size-4" />Probar con IA</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex flex-wrap justify-center gap-3">
          {TYPES.map(([Icon, label]) => (
            <span key={label} className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm"><Icon className="size-4 text-brand-600 dark:text-brand-300" />{label}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><f.icon className="size-5" /></span>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <ol className="grid gap-4 md:grid-cols-4">
          {["Regístrate gratis", "Elige plantilla o describe tu app", "Personalízala en el editor", "Genera el APK y descárgalo"].map((s, i) => (
            <li key={s} className="rounded-2xl border border-line bg-card p-5"><span className="text-3xl font-extrabold text-brand-500/40">0{i + 1}</span><p className="mt-2 font-medium">{s}</p></li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">© {new Date().getFullYear()} Forjapp · Hecho para creadores</footer>
    </div>
  );
}
