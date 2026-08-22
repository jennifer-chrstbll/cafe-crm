"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Clock,
  ScanFace,
  BarChart3,
  Settings,
  LogOut,
  Coffee,
  ShoppingCart,
  Radio,
  Utensils,
  CreditCard,
  X,
} from "lucide-react";

interface SidebarProps {
  onClose?: () => void; // Untuk menutup drawer di mobile
}

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
}

/**
 * Sidebar — Navigasi berbasis peran (Kasir vs Owner).
 *
 * Keputusan desain (sesuai HCI principles):
 * - Kasir: hanya menu operasional harian. Badge merah di "Belum Bayar" = Visibility of System Status (Nielsen #1)
 *   dan Recognition rather than Recall (Nielsen #6).
 * - Owner: menu analitik & manajemen. Tidak ada tombol POS/Live.
 * - "Log Pengenalan" hanya untuk Owner — kasir tidak butuh debug log teknis sebagai menu utama (Hick's Law).
 * - Semua label Bahasa Indonesia = Match real world (Nielsen #2).
 */
export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [unpaidCount, setUnpaidCount] = useState(0);

  const isOwner = user?.role === "OWNER";

  // Fetch jumlah tagihan belum bayar untuk badge navigasi (kasir only)
  useEffect(() => {
    if (isOwner) return;

    const fetchCount = async () => {
      try {
        const res = await api.get("/workflow/unpaid");
        setUnpaidCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        setUnpaidCount(0);
      }
    };

    fetchCount();
    // Polling setiap 30 detik — cukup untuk badge count, tidak perlu seagresif polling data
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [isOwner]);

  // ── Navigasi Kasir ──
  // Urutan berdasarkan frekuensi penggunaan (tugas paling sering → paling jarang)
  // Sesuai Hick's Law: hanya tampilkan yang relevan untuk role ini
  const cashierNav = [
    { id: "nav-dashboard", name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { id: "nav-live", name: "🔴 Live Kamera", href: "/live", icon: Radio },
    { id: "nav-pos", name: "Kasir (POS)", href: "/pos", icon: ShoppingCart },
    {
      id: "nav-unpaid",
      name: "Belum Bayar",
      href: "/unpaid",
      icon: CreditCard,
      badge: unpaidCount > 0 ? unpaidCount : null,
    },
    { id: "nav-customers", name: "Pelanggan", href: "/customers", icon: Users },
    { id: "nav-visits", name: "Kunjungan", href: "/visits", icon: Clock },
    { id: "nav-settings", name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  // ── Navigasi Owner ──
  // Fokus ke analitik & manajemen, tanpa operasional kasir
  const ownerNav = [
    { id: "nav-dashboard", name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { id: "nav-customers", name: "Pelanggan", href: "/customers", icon: Users },
    { id: "nav-visits", name: "Kunjungan", href: "/visits", icon: Clock },
    { id: "nav-recogs", name: "Log Pengenalan", href: "/recognition-logs", icon: ScanFace },
    { id: "nav-analytics", name: "Analytics", href: "/analytics", icon: BarChart3 },
    { id: "nav-menus", name: "Menu Kafe", href: "/menus", icon: Utensils },
    { id: "nav-settings", name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  const navigation: NavItem[] = isOwner ? ownerNav : cashierNav;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Header logo + tombol close (mobile) */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-primary text-lg"
          onClick={onClose}
        >
          <Coffee className="h-6 w-6 flex-shrink-0" />
          <span>Cafe CRM</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Label role */}
      <div className="px-4 pb-2">
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          isOwner
            ? "bg-primary/10 text-primary"
            : "bg-success/10 text-success"
        )}>
          {isOwner ? "👑 Owner" : "🧑‍💼 Kasir"}
        </span>
      </div>

      {/* Navigasi */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-0.5 px-2" aria-label="Navigasi utama">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.id}
                id={item.id}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/15 hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
                <span className="flex-1 truncate">{item.name}</span>

                {/* Badge merah untuk count belum bayar — Visibility of System Status (Nielsen #1) */}
                {item.badge != null && item.badge > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-destructive text-destructive-foreground"
                    )}
                    aria-label={`${item.badge} tagihan belum bayar`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer: info user + logout */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="px-2 py-1">
          <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          aria-label="Keluar dari aplikasi"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}
