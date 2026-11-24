import {
  LayoutPanelTop, Heading, Type, Image, MousePointerClick, Link2, LayoutGrid, MoveVertical, Minus, Images, Video, Radio, Music, Rss, Globe,
  ClipboardList, Phone, MapPin, Share2, Heart, Search, UserRound, Bell, Box,
} from "lucide-react";

const MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  layout: LayoutPanelTop, heading: Heading, text: Type, image: Image, pointer: MousePointerClick, link: Link2, grid: LayoutGrid,
  space: MoveVertical, minus: Minus, images: Images, video: Video, radio: Radio, music: Music, rss: Rss, globe: Globe, form: ClipboardList,
  phone: Phone, map: MapPin, share: Share2, heart: Heart, search: Search, user: UserRound, bell: Bell,
};

export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const I = MAP[name] ?? Box;
  return <I className={className} />;
}
