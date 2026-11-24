/**
 * Built-in templates. Each produces a complete, valid AppConfig.
 * They are seeded into the `Template` table so admins can edit/disable them
 * and add new ones without deploying.
 */
import type { AppConfig, Page } from "./schema";
import { SCHEMA_VERSION } from "./schema";
import { MODULE_MAP } from "./modules";

export const APP_CATEGORIES = [
  { id: "blank", label: "En blanco" },
  { id: "news", label: "Noticias" },
  { id: "radio", label: "Radio" },
  { id: "music", label: "Música" },
  { id: "video", label: "Vídeos" },
  { id: "store", label: "Tienda" },
  { id: "restaurant", label: "Restaurante" },
  { id: "education", label: "Educación" },
  { id: "community", label: "Comunidad" },
  { id: "business", label: "Empresa" },
  { id: "web", label: "Contenido web" },
] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number]["id"];

export interface TemplateDef {
  id: string;
  name: string;
  category: AppCategory;
  description: string;
  /** Preview color for the template card */
  accent: string;
  config: AppConfig;
}

type BlockSpec = [type: string, props?: Record<string, unknown>];

let counter = 0;
function block([type, props]: BlockSpec) {
  counter += 1;
  return { id: `b${counter}`, type, props: { ...structuredClone(MODULE_MAP[type]!.defaultProps), ...(props ?? {}) } };
}

function page(id: string, title: string, icon: string, blocks: BlockSpec[], hideHeader = false): Page {
  return { id, title, icon, hideHeader, blocks: blocks.map(block) };
}

function make(
  name: string,
  colors: { primary: string; secondary: string; background?: string; surface?: string; text?: string; mode?: "light" | "dark" },
  pages: Page[],
  opts: { font?: AppConfig["theme"]["font"]; nav?: AppConfig["navigation"]["type"]; description?: string } = {},
): AppConfig {
  counter = 0;
  const dark = colors.mode === "dark";
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      name,
      description: opts.description ?? "",
      packageName: "com.forjapp.miapp",
      versionCode: 1,
      versionName: "1.0.0",
      orientation: "portrait",
      permissions: [],
    },
    theme: {
      mode: colors.mode ?? "light",
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background ?? (dark ? "#0B0F19" : "#F8FAFC"),
      surface: colors.surface ?? (dark ? "#151B2B" : "#FFFFFF"),
      text: colors.text ?? (dark ? "#E2E8F0" : "#0F172A"),
      font: opts.font ?? "Inter",
      radius: 14,
    },
    branding: { splashColor: colors.primary },
    navigation: {
      type: opts.nav ?? "bottom",
      items: pages.slice(0, 5).map((p) => ({ id: `nav_${p.id}`, label: p.title, icon: p.icon, pageId: p.id })),
    },
    homePageId: pages[0]!.id,
    pages,
    integrations: { push: { enabled: false } },
  };
}

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/500`;

function build(): TemplateDef[] {
  return [
    {
      id: "blank",
      name: "App en blanco",
      category: "blank",
      description: "Empieza desde cero con una sola página.",
      accent: "#6D28D9",
      config: make("Mi App", { primary: "#6D28D9", secondary: "#F59E0B" }, [
        page("home", "Inicio", "home", [["heading", { text: "Hola 👋", size: "lg" }], ["text", { text: "Esta es la primera página de tu app. Añade bloques desde el editor." }]]),
      ], { nav: "none" }),
    },
    {
      id: "news",
      name: "Diario digital",
      category: "news",
      description: "Noticias por RSS, buscador, favoritos y web.",
      accent: "#DC2626",
      config: make("Mi Diario", { primary: "#DC2626", secondary: "#111827" }, [
        page("home", "Portada", "newspaper", [["rss", { feedUrl: "https://feeds.bbci.co.uk/mundo/rss.xml", limit: 15 }]]),
        page("search", "Buscar", "search", [["search", {}]]),
        page("saved", "Guardadas", "heart", [["favorites", { emptyText: "Guarda noticias para leerlas más tarde." }]]),
        page("web", "Web", "globe", [["webview", { url: "https://www.bbc.com/mundo" }]]),
      ], { font: "Merriweather" }),
    },
    {
      id: "radio",
      name: "Emisora de radio",
      category: "radio",
      description: "Radio en directo, programación, redes y contacto.",
      accent: "#7C3AED",
      config: make("Radio Online", { primary: "#7C3AED", secondary: "#22D3EE", mode: "dark" }, [
        page("live", "En directo", "radio", [["radio", { streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv", stationName: "Radio Online", slogan: "La mejor música, 24/7", cover: img("radio") }]], true),
        page("schedule", "Programación", "calendar", [["cards", { items: [ { title: "Despierta", text: "Lunes a viernes 7:00 - 10:00", image: img("morning"), price: "", url: "" }, { title: "Tarde de éxitos", text: "Lunes a viernes 16:00 - 19:00", image: img("afternoon"), price: "", url: "" } ] }]]),
        page("social", "Síguenos", "share", [["social", { links: [ { network: "instagram", url: "https://instagram.com/" }, { network: "youtube", url: "https://youtube.com/" } ] }], ["contact", { email: "radio@example.com", whatsapp: "+34600000000" }]]),
      ], { font: "Poppins" }),
    },
    {
      id: "music",
      name: "Artista musical",
      category: "music",
      description: "Lista de canciones, vídeos, galería y redes.",
      accent: "#DB2777",
      config: make("Mi Música", { primary: "#DB2777", secondary: "#F59E0B", mode: "dark" }, [
        page("music", "Música", "music", [["hero", { title: "Nuevo álbum", subtitle: "Ya disponible", image: img("concert") }], ["playlist", { title: "Últimos temas", tracks: [ { title: "Canción de ejemplo", artist: "Artista", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: img("album1") }, { title: "Otra canción", artist: "Artista", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", cover: img("album2") } ] }]]),
        page("videos", "Vídeos", "video", [["video", { url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", title: "Videoclip" }]]),
        page("photos", "Fotos", "images", [["gallery", { images: [ { src: img("m1"), caption: "" }, { src: img("m2"), caption: "" }, { src: img("m3"), caption: "" }, { src: img("m4"), caption: "" } ] }]]),
      ], { font: "Montserrat" }),
    },
    {
      id: "video",
      name: "Canal de vídeos",
      category: "video",
      description: "Vídeos destacados, categorías y favoritos.",
      accent: "#EF4444",
      config: make("Mi Canal", { primary: "#EF4444", secondary: "#FBBF24", mode: "dark" }, [
        page("home", "Inicio", "video", [["heading", { text: "Destacado", size: "lg" }], ["video", { url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", title: "Vídeo destacado" }], ["video", { url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4", title: "Vídeo MP4" }]]),
        page("search", "Buscar", "search", [["search", {}]]),
        page("about", "Canal", "info", [["text", { text: "Suscríbete para no perderte ningún vídeo." }], ["social", { links: [ { network: "youtube", url: "https://youtube.com/" } ] }]]),
      ]),
    },
    {
      id: "store",
      name: "Tienda online",
      category: "store",
      description: "Catálogo de productos, ofertas, pedidos y contacto.",
      accent: "#059669",
      config: make("Mi Tienda", { primary: "#059669", secondary: "#F97316" }, [
        page("home", "Tienda", "bag", [["hero", { title: "Rebajas de temporada", subtitle: "Hasta -40% en productos seleccionados", image: img("shop"), buttonLabel: "Ver catálogo", buttonPage: "catalog" }], ["heading", { text: "Novedades" }], ["cards", { layout: "grid", items: [ { title: "Zapatillas", text: "Cómodas y ligeras", image: img("shoes"), price: "59,90 €", url: "" }, { title: "Mochila", text: "Resistente al agua", image: img("bag"), price: "34,90 €", url: "" } ] }]]),
        page("catalog", "Catálogo", "grid", [["search", { placeholder: "Buscar productos…" }], ["cards", { layout: "grid", items: [ { title: "Camiseta", text: "100% algodón", image: img("tshirt"), price: "19,90 €", url: "" }, { title: "Gorra", text: "Talla única", image: img("cap"), price: "14,90 €", url: "" } ] }]]),
        page("order", "Pedidos", "form", [["form", { title: "Haz tu pedido", fields: [ { label: "Nombre", kind: "text", required: true }, { label: "Teléfono", kind: "tel", required: true }, { label: "Productos", kind: "textarea", required: true } ] }]]),
        page("contact", "Contacto", "phone", [["contact", { phone: "+34900000000", email: "tienda@example.com" }]]),
      ]),
    },
    {
      id: "restaurant",
      name: "Restaurante",
      category: "restaurant",
      description: "Carta, reservas, fotos, ubicación y contacto.",
      accent: "#B45309",
      config: make("Mi Restaurante", { primary: "#B45309", secondary: "#16A34A", background: "#FFFBF5" }, [
        page("home", "Inicio", "home", [["hero", { title: "Cocina mediterránea", subtitle: "Producto fresco, cada día", image: img("restaurant"), buttonLabel: "Reservar mesa", buttonPage: "booking" }], ["text", { text: "Bienvenido a nuestro restaurante." }]]),
        page("menu", "Carta", "menu", [["cards", { items: [ { title: "Paella valenciana", text: "Para 2 personas", image: img("paella"), price: "28,00 €", url: "" }, { title: "Ensalada de la casa", text: "Con productos de temporada", image: img("salad"), price: "11,50 €", url: "" } ] }]]),
        page("booking", "Reservas", "calendar", [["form", { title: "Reserva tu mesa", submitLabel: "Reservar", successMessage: "¡Reserva recibida! Te confirmaremos por teléfono.", fields: [ { label: "Nombre", kind: "text", required: true }, { label: "Teléfono", kind: "tel", required: true }, { label: "Fecha", kind: "date", required: true }, { label: "Personas", kind: "number", required: true } ] }]]),
        page("photos", "Fotos", "images", [["gallery", { images: [ { src: img("food1"), caption: "" }, { src: img("food2"), caption: "" }, { src: img("food3"), caption: "" }, { src: img("food4"), caption: "" } ] }]]),
        page("location", "Dónde", "map", [["map", { label: "Mi Restaurante" }], ["contact", { phone: "+34910000000", address: "Calle Mayor 1, Madrid", hours: "Mar-Dom 13:00-16:00 / 20:00-23:30" }]]),
      ], { font: "Lora" }),
    },
    {
      id: "education",
      name: "Academia",
      category: "education",
      description: "Cursos, lecciones en vídeo, alumnos y contacto.",
      accent: "#2563EB",
      config: make("Mi Academia", { primary: "#2563EB", secondary: "#10B981" }, [
        page("courses", "Cursos", "book", [["hero", { title: "Aprende a tu ritmo", subtitle: "Cursos online con certificado", image: img("study") }], ["cards", { items: [ { title: "Inglés B1", text: "40 lecciones", image: img("english"), price: "Nuevo", url: "" }, { title: "Programación", text: "Desde cero", image: img("code"), price: "", url: "" } ] }]]),
        page("lessons", "Lecciones", "video", [["video", { url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", title: "Lección 1" }]]),
        page("account", "Mi cuenta", "user", [["auth", {}]]),
        page("contact", "Contacto", "phone", [["form", { title: "Solicita información" }]]),
      ], { font: "Nunito" }),
    },
    {
      id: "community",
      name: "Comunidad",
      category: "community",
      description: "Noticias, eventos, miembros y redes sociales.",
      accent: "#0891B2",
      config: make("Mi Comunidad", { primary: "#0891B2", secondary: "#E11D48" }, [
        page("home", "Inicio", "home", [["hero", { title: "Únete a la comunidad", image: img("community") }], ["text", { text: "Un espacio para compartir, aprender y conectar." }]]),
        page("events", "Eventos", "calendar", [["cards", { items: [ { title: "Quedada mensual", text: "Sábado 18:00", image: img("event"), price: "Gratis", url: "" } ] }]]),
        page("members", "Miembros", "user", [["auth", { welcomeText: "Accede como miembro" }]]),
        page("social", "Redes", "share", [["social", {}]]),
      ]),
    },
    {
      id: "business",
      name: "Empresa",
      category: "business",
      description: "Servicios, equipo, presupuestos y ubicación.",
      accent: "#0F172A",
      config: make("Mi Empresa", { primary: "#0F172A", secondary: "#3B82F6" }, [
        page("home", "Inicio", "home", [["hero", { title: "Soluciones para tu negocio", subtitle: "Más de 10 años de experiencia", image: img("office"), buttonLabel: "Pedir presupuesto", buttonPage: "quote" }]]),
        page("services", "Servicios", "briefcase", [["cards", { items: [ { title: "Consultoría", text: "Analizamos tu negocio", image: "", price: "", url: "" }, { title: "Desarrollo", text: "Software a medida", image: "", price: "", url: "" } ] }]]),
        page("quote", "Presupuesto", "form", [["form", { title: "Solicita presupuesto" }]]),
        page("contact", "Contacto", "phone", [["contact", { phone: "+34900000000", email: "info@example.com", address: "Madrid" }], ["map", {}]]),
      ], { nav: "drawer" }),
    },
    {
      id: "web",
      name: "Web a App",
      category: "web",
      description: "Convierte tu web en una app con navegador integrado.",
      accent: "#4F46E5",
      config: make("Mi Web", { primary: "#4F46E5", secondary: "#F59E0B" }, [
        page("web", "Web", "globe", [["webview", { url: "https://example.com", height: 0 }]], true),
      ], { nav: "none" }),
    },
  ];
}

export const TEMPLATES: TemplateDef[] = build();
export const TEMPLATE_MAP: Record<string, TemplateDef> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
