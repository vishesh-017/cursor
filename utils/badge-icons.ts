import {
  Award,
  CloudRain,
  Flag,
  Gift,
  Shield,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const badgeIcons: Record<string, LucideIcon> = {
  Flag,
  Shield,
  CloudRain,
  Trophy,
  Award,
  Gift,
  Target,
};

export function resolveBadgeIcon(name: string): LucideIcon {
  return badgeIcons[name] ?? Award;
}
