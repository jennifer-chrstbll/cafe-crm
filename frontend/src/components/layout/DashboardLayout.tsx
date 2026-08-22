"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";

/**
 * DashboardLayout — Layout utama dengan responsive sidebar.
 * 
 * Perilaku sesuai breakpoint:
 * - Mobile (<768px): Sidebar jadi off-canvas overlay drawer, dibuka via hamburger button.
 * - Desktop (≥768px): Sidebar tetap (fixed w-64), konten mengisi sisa layar.
 * 
 * Ini menyelesaikan temuan kritis 8.1: sidebar 256px tidak responsif sama sekali.
 * Menggunakan useIsMobile() hook yang sudah ada (hooks/use-mobile.tsx) yang
 * sebelumnya tidak dipakai di layout mana pun.
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Tutup drawer otomatis saat beralih ke desktop
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* ── DESKTOP: Sidebar permanen ── */}
      {!isMobile && (
        <aside className="flex-shrink-0">
          <Sidebar />
        </aside>
      )}

      {/* ── MOBILE: Off-canvas drawer overlay ── */}
      {isMobile && drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 z-50 h-full w-64 shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Area Konten Utama ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Header mobile: hamburger + nama halaman */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 shadow-sm">
            <button
              id="sidebar-hamburger"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-primary text-sm">☕ Cafe CRM</span>
          </div>
        )}

        {/* Konten halaman — padding responsif */}
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
