/** Icon names available for pages/navigation (rendered as inline SVG by the runtime). */
export const ICON_NAMES = [
  "home", "newspaper", "search", "heart", "globe", "radio", "calendar", "share", "music", "video",
  "images", "info", "bag", "grid", "form", "phone", "menu", "map", "book", "user", "briefcase",
  "file", "circle", "star", "bell", "settings", "mail", "cart",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
