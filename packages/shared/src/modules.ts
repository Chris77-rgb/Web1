/**
 * Module / block registry.
 *
 * Every block an app page can contain is declared here once. The editor builds
 * its settings form from `fields`, the runtime renders by `type`, and the
 * builder derives Android permissions from `permissions`.
 *
 * To add a new module:
 *   1. Add a definition to MODULES below.
 *   2. Add a renderer in packages/runtime/src/blocks.ts.
 *   3. (Optional) Restrict it to a plan with `minPlan`.
 */
import type { AndroidPermission, AppConfig, Block } from "./schema";
import type { PlanCode } from "./plans";

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "number"
  | "color"
  | "boolean"
  | "select"
  | "image"
  | "page"
  | "list";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  /** For type "list": fields of each item. */
  itemFields?: FieldDef[];
  itemLabel?: string;
}

export type ModuleCategory = "content" | "media" | "interaction" | "advanced";

export interface ModuleDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: ModuleCategory;
  fields: FieldDef[];
  defaultProps: Record<string, unknown>;
  permissions?: AndroidPermission[];
  minPlan?: PlanCode;
}

const alignField: FieldDef = {
  key: "align",
  label: "Alineación",
  type: "select",
  options: [
    { value: "left", label: "Izquierda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Derecha" },
  ],
};

export const MODULES: ModuleDef[] = [
  // ---------- Content ----------
  {
    type: "hero",
    label: "Portada",
    description: "Cabecera grande con imagen de fondo, título y botón.",
    icon: "layout",
    category: "content",
    fields: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "subtitle", label: "Subtítulo", type: "textarea" },
      { key: "image", label: "Imagen de fondo", type: "image" },
      { key: "buttonLabel", label: "Texto del botón", type: "text" },
      { key: "buttonPage", label: "Botón abre página", type: "page" },
    ],
    defaultProps: { title: "Bienvenido", subtitle: "Descubre todo lo que tenemos para ti", image: "", buttonLabel: "", buttonPage: "" },
  },
  {
    type: "heading",
    label: "Título",
    description: "Encabezado de sección.",
    icon: "heading",
    category: "content",
    fields: [
      { key: "text", label: "Texto", type: "text", required: true },
      { key: "size", label: "Tamaño", type: "select", options: [ { value: "lg", label: "Grande" }, { value: "md", label: "Mediano" }, { value: "sm", label: "Pequeño" } ] },
      alignField,
    ],
    defaultProps: { text: "Nuevo título", size: "md", align: "left" },
  },
  {
    type: "text",
    label: "Texto",
    description: "Párrafo de texto.",
    icon: "text",
    category: "content",
    fields: [{ key: "text", label: "Contenido", type: "textarea", required: true }, alignField],
    defaultProps: { text: "Escribe aquí tu contenido.", align: "left" },
  },
  {
    type: "image",
    label: "Imagen",
    description: "Imagen con pie de foto opcional.",
    icon: "image",
    category: "content",
    fields: [
      { key: "src", label: "Imagen", type: "image", required: true },
      { key: "caption", label: "Pie de foto", type: "text" },
      { key: "rounded", label: "Bordes redondeados", type: "boolean" },
    ],
    defaultProps: { src: "", caption: "", rounded: true },
  },
  {
    type: "button",
    label: "Botón",
    description: "Botón que abre una página, un enlace, un teléfono o un correo.",
    icon: "pointer",
    category: "content",
    fields: [
      { key: "label", label: "Texto", type: "text", required: true },
      {
        key: "action",
        label: "Acción",
        type: "select",
        options: [
          { value: "page", label: "Abrir página" },
          { value: "url", label: "Abrir enlace" },
          { value: "tel", label: "Llamar" },
          { value: "mailto", label: "Enviar email" },
        ],
      },
      { key: "page", label: "Página", type: "page" },
      { key: "target", label: "Enlace / teléfono / email", type: "text" },
      { key: "variant", label: "Estilo", type: "select", options: [ { value: "filled", label: "Relleno" }, { value: "outline", label: "Contorno" } ] },
    ],
    defaultProps: { label: "Pulsa aquí", action: "page", page: "", target: "", variant: "filled" },
  },
  {
    type: "link",
    label: "Enlace",
    description: "Enlace de texto a una web externa.",
    icon: "link",
    category: "content",
    fields: [
      { key: "label", label: "Texto", type: "text", required: true },
      { key: "url", label: "URL", type: "url", required: true },
    ],
    defaultProps: { label: "Visita nuestra web", url: "https://example.com" },
  },
  {
    type: "cards",
    label: "Tarjetas",
    description: "Lista de tarjetas con imagen, título, texto y precio (menús, productos, cursos…).",
    icon: "grid",
    category: "content",
    fields: [
      { key: "layout", label: "Diseño", type: "select", options: [ { value: "list", label: "Lista" }, { value: "grid", label: "Cuadrícula" } ] },
      {
        key: "items",
        label: "Elementos",
        type: "list",
        itemLabel: "title",
        itemFields: [
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Descripción", type: "textarea" },
          { key: "image", label: "Imagen", type: "image" },
          { key: "price", label: "Precio / etiqueta", type: "text" },
          { key: "url", label: "Enlace (opcional)", type: "url" },
        ],
      },
    ],
    defaultProps: { layout: "list", items: [{ title: "Elemento 1", text: "Descripción", image: "", price: "", url: "" }] },
  },
  {
    type: "spacer",
    label: "Espacio",
    description: "Espacio vertical en blanco.",
    icon: "space",
    category: "content",
    fields: [{ key: "height", label: "Altura (px)", type: "number", min: 4, max: 200 }],
    defaultProps: { height: 24 },
  },
  {
    type: "divider",
    label: "Separador",
    description: "Línea horizontal.",
    icon: "minus",
    category: "content",
    fields: [],
    defaultProps: {},
  },

  // ---------- Media ----------
  {
    type: "gallery",
    label: "Galería",
    description: "Galería de imágenes con visor a pantalla completa.",
    icon: "images",
    category: "media",
    fields: [
      { key: "columns", label: "Columnas", type: "number", min: 1, max: 4 },
      { key: "images", label: "Imágenes", type: "list", itemLabel: "caption", itemFields: [ { key: "src", label: "Imagen", type: "image" }, { key: "caption", label: "Descripción", type: "text" } ] },
    ],
    defaultProps: { columns: 2, images: [] },
  },
  {
    type: "video",
    label: "Vídeo",
    description: "Reproductor de vídeo (YouTube, Vimeo o archivo MP4).",
    icon: "video",
    category: "media",
    fields: [
      { key: "url", label: "URL del vídeo", type: "url", required: true, help: "Enlace de YouTube, Vimeo o .mp4" },
      { key: "title", label: "Título", type: "text" },
      { key: "autoplay", label: "Reproducción automática", type: "boolean" },
    ],
    defaultProps: { url: "", title: "", autoplay: false },
  },
  {
    type: "radio",
    label: "Radio en directo",
    description: "Reproductor de radio por streaming (MP3/AAC/HLS).",
    icon: "radio",
    category: "media",
    fields: [
      { key: "streamUrl", label: "URL del stream", type: "url", required: true },
      { key: "stationName", label: "Nombre de la emisora", type: "text" },
      { key: "cover", label: "Carátula", type: "image" },
      { key: "slogan", label: "Eslogan", type: "text" },
    ],
    defaultProps: { streamUrl: "", stationName: "Mi Radio", cover: "", slogan: "En directo 24/7" },
    permissions: ["WAKE_LOCK", "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_MEDIA_PLAYBACK"],
  },
  {
    type: "playlist",
    label: "Música",
    description: "Lista de pistas de audio reproducibles.",
    icon: "music",
    category: "media",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "tracks", label: "Pistas", type: "list", itemLabel: "title", itemFields: [ { key: "title", label: "Título", type: "text" }, { key: "artist", label: "Artista", type: "text" }, { key: "url", label: "URL del audio", type: "url" }, { key: "cover", label: "Carátula", type: "image" } ] },
    ],
    defaultProps: { title: "Mi música", tracks: [] },
    permissions: ["WAKE_LOCK"],
  },
  {
    type: "rss",
    label: "Noticias RSS",
    description: "Muestra noticias de un feed RSS/Atom con lectura y favoritos.",
    icon: "rss",
    category: "media",
    fields: [
      { key: "feedUrl", label: "URL del feed RSS", type: "url", required: true },
      { key: "limit", label: "Número de noticias", type: "number", min: 1, max: 50 },
      { key: "showImages", label: "Mostrar imágenes", type: "boolean" },
    ],
    defaultProps: { feedUrl: "", limit: 10, showImages: true },
  },

  // ---------- Interaction ----------
  {
    type: "webview",
    label: "Navegador web",
    description: "Muestra una página web dentro de la app.",
    icon: "globe",
    category: "interaction",
    fields: [
      { key: "url", label: "URL", type: "url", required: true },
      { key: "height", label: "Altura (px, 0 = pantalla completa)", type: "number", min: 0, max: 4000 },
    ],
    defaultProps: { url: "https://example.com", height: 0 },
  },
  {
    type: "form",
    label: "Formulario",
    description: "Formulario personalizable. Las respuestas se guardan en tu panel.",
    icon: "form",
    category: "interaction",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "submitLabel", label: "Texto del botón", type: "text" },
      { key: "successMessage", label: "Mensaje de confirmación", type: "text" },
      {
        key: "fields",
        label: "Campos",
        type: "list",
        itemLabel: "label",
        itemFields: [
          { key: "label", label: "Etiqueta", type: "text" },
          { key: "kind", label: "Tipo", type: "select", options: [ { value: "text", label: "Texto" }, { value: "email", label: "Email" }, { value: "tel", label: "Teléfono" }, { value: "number", label: "Número" }, { value: "date", label: "Fecha" }, { value: "textarea", label: "Texto largo" } ] },
          { key: "required", label: "Obligatorio", type: "boolean" },
        ],
      },
    ],
    defaultProps: {
      title: "Contacta con nosotros",
      submitLabel: "Enviar",
      successMessage: "¡Gracias! Hemos recibido tu mensaje.",
      fields: [
        { label: "Nombre", kind: "text", required: true },
        { label: "Email", kind: "email", required: true },
        { label: "Mensaje", kind: "textarea", required: false },
      ],
    },
  },
  {
    type: "contact",
    label: "Contacto",
    description: "Botones de llamada, email, WhatsApp y dirección.",
    icon: "phone",
    category: "interaction",
    fields: [
      { key: "phone", label: "Teléfono", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "whatsapp", label: "WhatsApp (con prefijo)", type: "text" },
      { key: "address", label: "Dirección", type: "text" },
      { key: "hours", label: "Horario", type: "textarea" },
    ],
    defaultProps: { phone: "", email: "", whatsapp: "", address: "", hours: "" },
  },
  {
    type: "map",
    label: "Mapa",
    description: "Mapa con la ubicación del negocio y botón para cómo llegar.",
    icon: "map",
    category: "interaction",
    fields: [
      { key: "lat", label: "Latitud", type: "number" },
      { key: "lng", label: "Longitud", type: "number" },
      { key: "zoom", label: "Zoom", type: "number", min: 1, max: 19 },
      { key: "label", label: "Nombre del lugar", type: "text" },
    ],
    defaultProps: { lat: 40.4168, lng: -3.7038, zoom: 15, label: "Nuestra ubicación" },
    permissions: ["ACCESS_COARSE_LOCATION"],
  },
  {
    type: "social",
    label: "Redes sociales",
    description: "Enlaces a tus redes sociales.",
    icon: "share",
    category: "interaction",
    fields: [
      {
        key: "links",
        label: "Redes",
        type: "list",
        itemLabel: "network",
        itemFields: [
          { key: "network", label: "Red", type: "select", options: ["instagram", "facebook", "x", "tiktok", "youtube", "linkedin", "whatsapp", "telegram", "web"].map((v) => ({ value: v, label: v })) },
          { key: "url", label: "URL", type: "url" },
        ],
      },
    ],
    defaultProps: { links: [{ network: "instagram", url: "https://instagram.com/" }] },
  },

  // ---------- Advanced ----------
  {
    type: "favorites",
    label: "Favoritos",
    description: "Lista de contenidos marcados como favoritos por el usuario.",
    icon: "heart",
    category: "advanced",
    fields: [{ key: "emptyText", label: "Texto si no hay favoritos", type: "text" }],
    defaultProps: { emptyText: "Aún no tienes favoritos." },
  },
  {
    type: "search",
    label: "Buscador",
    description: "Buscador interno de páginas, textos y noticias de la app.",
    icon: "search",
    category: "advanced",
    fields: [{ key: "placeholder", label: "Texto de ayuda", type: "text" }],
    defaultProps: { placeholder: "Buscar en la app…" },
  },
  {
    type: "auth",
    label: "Usuarios",
    description: "Registro e inicio de sesión de usuarios de tu app.",
    icon: "user",
    category: "advanced",
    fields: [
      { key: "welcomeText", label: "Texto de bienvenida", type: "text" },
      { key: "allowRegister", label: "Permitir registro", type: "boolean" },
    ],
    defaultProps: { welcomeText: "Accede a tu cuenta", allowRegister: true },
    minPlan: "BASIC",
  },
  {
    type: "push",
    label: "Notificaciones push",
    description: "Suscripción a notificaciones push (requiere configurar Firebase).",
    icon: "bell",
    category: "advanced",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "text", label: "Texto", type: "textarea" },
    ],
    defaultProps: { title: "Notificaciones", text: "Activa las notificaciones para no perderte nada." },
    permissions: ["POST_NOTIFICATIONS"],
    minPlan: "PRO",
  },
];

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.type, m]));

export const MODULE_CATEGORIES: { id: ModuleCategory; label: string }[] = [
  { id: "content", label: "Contenido" },
  { id: "media", label: "Multimedia" },
  { id: "interaction", label: "Interacción" },
  { id: "advanced", label: "Avanzado" },
];

export function createBlock(type: string, id: string): Block {
  const def = MODULE_MAP[type];
  if (!def) throw new Error(`Módulo desconocido: ${type}`);
  return { id, type, props: structuredClone(def.defaultProps) };
}

/** Permissions required by the app: always INTERNET + modules + manual ones. */
export function computePermissions(config: AppConfig): AndroidPermission[] {
  const set = new Set<AndroidPermission>(["INTERNET", "ACCESS_NETWORK_STATE"]);
  for (const page of config.pages) {
    for (const block of page.blocks) {
      for (const p of MODULE_MAP[block.type]?.permissions ?? []) set.add(p);
    }
  }
  if (config.integrations.push.enabled) set.add("POST_NOTIFICATIONS");
  for (const p of config.meta.permissions) set.add(p);
  return [...set].sort();
}

export function usedModuleTypes(config: AppConfig): string[] {
  const s = new Set<string>();
  for (const p of config.pages) for (const b of p.blocks) s.add(b.type);
  return [...s];
}
