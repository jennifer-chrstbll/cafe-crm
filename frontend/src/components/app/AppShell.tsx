"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  BarChart3, ClipboardList, Coffee, CreditCard, LayoutDashboard, LogOut, Menu as MenuIcon, ReceiptText,
  ScanFace, Settings, ShoppingBag, UserCog, Users, Video, X, Footprints, KeyRound, ChevronDown,
  Cpu, Frame, Fingerprint,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { formatDayLong, formatTime } from "@/lib/format";
import { Device, Tab } from "@/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FullPageLoader, Forbidden } from "./states";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: "tabs" };
type Group = { title: string; items: Item[] };

/**
 * Navigation by role (docs/UX_RATIONALE.md §2):
 *  - Cashier: 5 destinations, ordered by how often they are used during a shift.
 *  - Owner: 15 destinations chunked into 4 labelled groups of 2-5 (Hick's law, Miller chunking).
 */
const CASHIER_NAV: Group[] = [{
  title: "",
  items: [
    { href: "/pos", label: "Kasir", icon: ShoppingBag },
    { href: "/unpaid", label: "Tagihan", icon: CreditCard, badge: "tabs" },
    { href: "/customers", label: "Pelanggan", icon: Users },
    { href: "/transactions", label: "Transaksi", icon: ReceiptText },
    { href: "/live", label: "Kamera", icon: Video },
  ],
}];

const OWNER_NAV: Group[] = [
  { title: "Hari ini", items: [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/pos", label: "Kasir", icon: ShoppingBag },
    { href: "/unpaid", label: "Tagihan", icon: CreditCard, badge: "tabs" },
    { href: "/transactions", label: "Transaksi", icon: ReceiptText },
    { href: "/live", label: "Kamera", icon: Video },
  ] },
  { title: "Pelanggan", items: [
    { href: "/customers", label: "Pelanggan", icon: Users },
    { href: "/visits", label: "Kunjungan", icon: Footprints },
    { href: "/faces", label: "Wajah Terdaftar", icon: Fingerprint },
  ] },
  { title: "Bisnis", items: [
    { href: "/analytics", label: "Analitik", icon: BarChart3 },
    { href: "/menus", label: "Menu", icon: ClipboardList },
  ] },
  { title: "Sistem", items: [
    { href: "/recognition-logs", label: "Log Wajah", icon: ScanFace },
    { href: "/devices", label: "Perangkat", icon: Cpu },
    { href: "/cameras", label: "Tata Letak Kamera", icon: Frame },
    { href: "/staff", label: "Staf", icon: UserCog },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ] },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  return (
    <div className="hidden text-right leading-tight sm:block">
      <div className="num text-sm font-semibold">{formatTime(now.toISOString())} WIB</div>
      <div className="text-xs capitalize text-muted-foreground">{formatDayLong(now)}</div>
    </div>
  );
}

/** Status lights for the two edge devices (Nielsen #1: visibility of system status). */
function DeviceLights({ isOwner }: { isOwner: boolean }) {
  const { data } = useApi<Device[]>("/devices", { interval: 30_000 });
  const router = useRouter();
  const kinds = [
    { kind: "facerec", label: "Kamera kasir" },
    { kind: "persontrack", label: "Pelacakan" },
  ];
  return (
    <button type="button" onClick={() => router.push(isOwner ? "/devices" : "/live")}
      className="flex h-10 items-center gap-3 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted"
      aria-label="Status perangkat">
      {kinds.map((k) => {
        const devs = (data ?? []).filter((d) => d.kind === k.kind);
        const on = devs.some((d) => d.online);
        const known = devs.length > 0;
        return (
          <span key={k.kind} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", !data ? "bg-muted-foreground/30" : on ? "bg-success" : known ? "bg-destructive" : "bg-muted-foreground/40")} />
            <span className="hidden md:inline">{k.label}</span>
            <span className="sr-only">{on ? "online" : "offline"}</span>
          </span>
        );
      })}
    </button>
  );
}

function NavList({ groups, path, tabs, compact, onNavigate }: {
  groups: Group[]; path: string; tabs: number; compact: boolean; onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navigasi utama" className={cn("flex-1 overflow-y-auto scrollbar-thin", compact ? "px-2 py-2" : "px-3 py-2")}>
      {groups.map((g, gi) => (
        <div key={g.title || gi} className={cn(gi > 0 && (compact ? "mt-2 border-t pt-2" : "mt-4"))}>
          {g.title && !compact && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
          )}
          <ul className="space-y-1">
            {g.items.map((it) => {
              const active = isActive(path, it.href);
              const badge = it.badge === "tabs" && tabs > 0 ? tabs : 0;
              return (
                <li key={it.href}>
                  <Link href={it.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn("relative flex items-center rounded-lg font-medium transition-colors",
                      compact ? "h-16 flex-col justify-center gap-1 text-[11px]" : "h-11 gap-3 px-3 text-sm",
                      active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent hover:text-accent-foreground")}>
                    <it.icon className={compact ? "h-5 w-5" : "h-[18px] w-[18px]"} />
                    <span className={cn(compact && "leading-none")}>{it.label}</span>
                    {badge > 0 && (
                      <span className={cn("num flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                        active ? "bg-white/25 text-white" : "bg-warning text-warning-foreground",
                        compact ? "absolute right-2 top-1.5" : "ml-auto")}
                        aria-label={`${badge} tagihan terbuka`}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-bold text-primary", compact ? "h-16 justify-center" : "h-16 px-5")}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Coffee className="h-5 w-5" />
      </span>
      {!compact && <span className="text-lg tracking-tight">Kafe CRM</span>}
    </Link>
  );
}

export function AppShell({ children, ownerOnly = false, fullBleed = false }: {
  children: ReactNode; ownerOnly?: boolean; fullBleed?: boolean;
}) {
  const { user, isLoading, logout, isOwner } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const { data: tabs } = useApi<Tab[]>(user ? "/tabs" : null, { interval: 20_000 });
  const { data: health } = useApi<{ migration_004: boolean; migration_005?: boolean }>(user && isOwner ? "/health" : null);

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [isLoading, user, router, path]);
  useEffect(() => setDrawer(false), [path]);

  if (isLoading || !user) return <FullPageLoader />;
  const groups = isOwner ? OWNER_NAV : CASHIER_NAV;
  const tabCount = tabs?.length ?? 0;
  const current = groups.flatMap((g) => g.items).find((i) => isActive(path, i.href));

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        Lewati ke konten
      </a>

      {/* Tablet rail (md–xl) and desktop sidebar (xl+) */}
      <aside className="hidden w-[84px] shrink-0 flex-col border-r bg-card md:flex xl:w-60">
        <div className="xl:hidden"><Brand compact /></div>
        <div className="hidden xl:block"><Brand compact={false} /></div>
        <div className="flex flex-1 flex-col overflow-hidden xl:hidden">
          <NavList groups={groups} path={path} tabs={tabCount} compact />
        </div>
        <div className="hidden flex-1 flex-col overflow-hidden xl:flex">
          <NavList groups={groups} path={path} tabs={tabCount} compact={false} />
        </div>
      </aside>

      {/* Phone drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between pr-2">
              <Brand compact={false} />
              <button onClick={() => setDrawer(false)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted" aria-label="Tutup menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList groups={groups} path={path} tabs={tabCount} compact={false} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur sm:px-5">
          <button onClick={() => setDrawer(true)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted md:hidden" aria-label="Buka menu">
            <MenuIcon className="h-5 w-5" />
          </button>
          <p className="truncate text-base font-semibold md:hidden">{current?.label ?? "Kafe CRM"}</p>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <DeviceLights isOwner={isOwner} />
            <Clock />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted" aria-label="Menu akun">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:block">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate">{user.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{isOwner ? "Pemilik" : "Kasir"} · {user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="h-10" onSelect={() => router.push("/settings")}>
                  <KeyRound className="mr-2 h-4 w-4" /> Ganti kata sandi
                </DropdownMenuItem>
                <DropdownMenuItem className="h-10 text-destructive focus:text-destructive" onSelect={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {isOwner && health && (!health.migration_004 || health.migration_005 === false) && (
          <div role="alert" className="border-b border-warning/40 bg-warning/10 px-5 py-2 text-sm text-warning">
            Database belum diperbarui: jalankan{" "}
            {!health.migration_004 && <><b>database/004_integration.sql</b>{" lalu "}</>}
            <b>database/005_devices.sql</b> di Supabase SQL Editor agar semua fitur berfungsi.
          </div>
        )}

        <main id="main" className={cn("flex-1 overflow-y-auto", !fullBleed && "p-4 sm:p-6")}>
          {ownerOnly && !isOwner ? <Forbidden /> : <div className={cn("animate-fade-in", fullBleed && "lg:h-full")}>{children}</div>}
        </main>
      </div>
    </div>
  );
}
