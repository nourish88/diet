import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileClock,
  FileText,
  Gift,
  Library,
  MessageCircle,
  Package,
  ReceiptText,
  Settings,
  Shield,
  UserCheck,
  UserCog,
  Users,
  Utensils,
} from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  keywords?: string[];
}

export interface NavigationGroup {
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

export const dietitianNavigation: NavigationGroup[] = [
  {
    label: "Danışanlar",
    icon: Users,
    items: [
      { href: "/clients", label: "Tüm danışanlar", icon: Users },
      { href: "/aktif-danisanlar", label: "Aktif danışanlar", icon: UserCheck },
      {
        href: "/important-dates",
        label: "Görüşmeler ve tarihler",
        icon: CalendarDays,
        keywords: ["randevu", "takvim"],
      },
    ],
  },
  {
    label: "Programlar",
    icon: ClipboardList,
    items: [
      { href: "/diets", label: "Diyetler", icon: ClipboardList },
      { href: "/sablonlar", label: "Şablonlar", icon: Library },
      { href: "/besinler", label: "Besin tanımları", icon: Utensils },
      { href: "/besin-gruplari", label: "Besin grupları", icon: BookOpen },
      { href: "/tanimlamalar", label: "Takip tanımları", icon: Settings },
    ],
  },
  {
    label: "İletişim",
    icon: MessageCircle,
    items: [
      { href: "/sohbetler", label: "Sohbetler", icon: MessageCircle },
      { href: "/bildirimler", label: "Bildirimler", icon: BellRing },
      { href: "/birthdays", label: "Özel günler", icon: Gift },
    ],
  },
  {
    label: "Finans",
    icon: CreditCard,
    items: [
      {
        href: "/faturalar",
        label: "Faturalar ve ödemeler",
        icon: ReceiptText,
        keywords: ["finans", "ödeme", "tahsilat"],
      },
      {
        href: "/faturalar/yeni",
        label: "Yeni fatura",
        icon: FileText,
        keywords: ["paket", "ödeme ekle"],
      },
    ],
  },
  {
    label: "Raporlar",
    icon: BarChart3,
    items: [
      {
        href: "/istatistikler",
        label: "Kazanım, bağlılık ve sonuçlar",
        icon: BarChart3,
        keywords: ["rapor", "analiz", "performans"],
      },
    ],
  },
  {
    label: "Ayarlar",
    icon: Settings,
    items: [
      { href: "/asistanlar", label: "Asistanlar", icon: UserCog },
      { href: "/management/kvkk", label: "KVKK kayıtları", icon: Shield },
      { href: "/management/diet-logs", label: "Teknik kayıtlar", icon: FileClock },
      { href: "/brosur", label: "Broşür ve yorum posteri", icon: Package },
    ],
  },
];

export const searchableNavigationItems = dietitianNavigation.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);
