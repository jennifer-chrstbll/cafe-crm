"use client";

import { Check, CreditCard, Plus, ScanFace, Sparkles, Star, UserRound, UserSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, Pill, SegmentBadge } from "@/components/app/bits";
import { cn } from "@/lib/utils";
import { formatRupiah, timeAgo } from "@/lib/format";
import { CustomerContext, Menu, StationLog } from "@/types";

export type PanelView =
  | { kind: "loading" }
  | { kind: "idle" }
  | { kind: "unknown"; log: StationLog }
  | { kind: "guest" }
  | { kind: "customer"; ctx: CustomerContext; log?: StationLog; auto: boolean };

/**
 * "Di kasir sekarang": who the cashier is serving. Placed on the LEFT because it is read
 * first (F-pattern) and the order is built for this person (proximity / Gestalt).
 */
export function CustomerPanel({ view, menus, onAdd, onPickCustomer, onGuest, onEnroll, onFeedback, onPayTab, onClear, cartLocked }: {
  view: PanelView; menus: Map<string, Menu>; cartLocked: boolean;
  onAdd: (menuId: string) => void; onPickCustomer: () => void; onGuest: () => void; onEnroll: () => void;
  onFeedback: (log: StationLog, ok: boolean) => void; onPayTab: () => void; onClear: () => void;
}) {
  if (view.kind === "loading") {
    return (
      <div className="space-y-3 p-4" aria-hidden>
        <div className="flex items-center gap-3"><Skeleton className="h-14 w-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-20" /></div></div>
        <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (view.kind === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ScanFace className="h-8 w-8 text-muted-foreground" />
          <span className="absolute right-1 top-1 h-3 w-3 animate-pulse rounded-full bg-success" aria-hidden />
        </div>
        <div>
          <p className="font-semibold">Menunggu pelanggan</p>
          <p className="text-sm text-muted-foreground">Wajah pelanggan di depan kamera kasir akan muncul di sini otomatis.</p>
        </div>
        <div className="grid w-full gap-2">
          <Button variant="outline" size="lg" onClick={onPickCustomer}><UserSearch /> Cari pelanggan</Button>
          <Button variant="ghost" size="lg" onClick={onGuest}><UserRound /> Layani sebagai tamu</Button>
        </div>
      </div>
    );
  }

  if (view.kind === "unknown") {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <Pill tone="warning"><ScanFace className="h-3 w-3" /> Wajah baru</Pill>
          <p className="mt-2 font-semibold">Pelanggan ini belum terdaftar</p>
          <p className="text-sm text-muted-foreground">Tawarkan pendaftaran agar kunjungan berikutnya dikenali dan mendapat rekomendasi.</p>
        </div>
        <Button size="xl" onClick={onEnroll}><ScanFace /> Daftarkan pelanggan</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={onPickCustomer}><UserSearch /> Sudah terdaftar</Button>
          <Button variant="outline" size="lg" onClick={onGuest}><UserRound /> Tamu</Button>
        </div>
        <p className="mt-auto text-xs text-muted-foreground">Kemiripan tertinggi {view.log.similarity_score?.toFixed(2) ?? "–"} · {timeAgo(view.log.created_at)}</p>
      </div>
    );
  }

  if (view.kind === "guest") {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><UserRound className="h-7 w-7 text-muted-foreground" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">Tamu</p>
            <p className="text-sm text-muted-foreground">Pesanan tidak dikaitkan ke pelanggan.</p>
          </div>
          {!cartLocked && <Button variant="ghost" size="icon" onClick={onClear} aria-label="Batalkan pilihan"><X /></Button>}
        </div>
        <Button variant="outline" size="lg" onClick={onEnroll}><ScanFace /> Daftarkan sebagai pelanggan</Button>
        <Button variant="ghost" size="lg" onClick={onPickCustomer}><UserSearch /> Pilih pelanggan lain</Button>
      </div>
    );
  }

  const c = view.ctx;
  const rec = c.recommendation;
  const showFeedback = view.auto && view.log && view.log.is_correct === null;
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 scrollbar-thin">
      <div className="flex items-start gap-3">
        <Avatar name={c.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold leading-tight">{c.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SegmentBadge segment={c.segment} />
            {view.auto && <Pill tone="success"><ScanFace className="h-3 w-3" /> Dikenali</Pill>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Kunjungan ke-{Math.max(c.visit_count, 1)} · terakhir {timeAgo(c.last_visit)}
          </p>
        </div>
        {!cartLocked && <Button variant="ghost" size="icon" onClick={onClear} aria-label="Batalkan pilihan"><X /></Button>}
      </div>

      {showFeedback && view.log && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="flex-1 text-muted-foreground">Benar ini {c.name.split(" ")[0]}?</span>
          <Button size="sm" variant="outline" onClick={() => onFeedback(view.log!, true)} aria-label="Ya, benar"><Check /> Ya</Button>
          <Button size="sm" variant="outline" onClick={() => onFeedback(view.log!, false)} aria-label="Bukan dia"><X /> Bukan</Button>
        </div>
      )}

      {c.notes && <p className="rounded-lg border-l-4 border-info bg-info/5 px-3 py-2 text-sm">{c.notes}</p>}

      {c.open_tab && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-warning">Tagihan belum dibayar</p>
              <p className="num text-lg font-bold">{formatRupiah(c.open_tab.total_amount)}</p>
              <p className="text-xs text-muted-foreground">{c.open_tab.items.length} item · dibuka {timeAgo(c.open_tab.created_at)}</p>
            </div>
            <Button onClick={onPayTab}><CreditCard /> Bayar</Button>
          </div>
        </div>
      )}

      <Suggestion title="Favorit" icon={Star} hint="Paling sering dipesan"
        items={rec.favorites.map((f) => ({ id: f.menu_id, name: f.name, sub: `${f.qty}× dipesan` }))}
        menus={menus} onAdd={onAdd} empty="Belum ada riwayat pesanan." />

      <Suggestion title="Rekomendasi" icon={Sparkles}
        hint={rec.strategy === "COLLABORATIVE_FILTERING" ? "Berdasarkan pelanggan dengan selera serupa" : "Menu terlaris (riwayat belum cukup)"}
        items={rec.recommendations.map((r) => ({ id: r.menu_id, name: r.name, sub: r.reason }))}
        menus={menus} onAdd={onAdd} empty="Belum ada data penjualan." />
    </div>
  );
}

function Suggestion({ title, icon: Icon, hint, items, menus, onAdd, empty }: {
  title: string; icon: React.ComponentType<{ className?: string }>; hint: string;
  items: { id: string; name: string; sub: string }[]; menus: Map<string, Menu>; onAdd: (id: string) => void; empty: string;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" /> {title}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="space-y-1.5">
          {items.map((it) => {
            const menu = menus.get(it.id);
            return (
              <li key={it.id}>
                <button type="button" disabled={!menu} onClick={() => onAdd(it.id)}
                  className={cn("flex min-h-12 w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 disabled:opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{it.sub}</p>
                  </div>
                  {menu && <span className="num text-xs font-semibold text-muted-foreground">{formatRupiah(menu.price)}</span>}
                  <Plus className="h-4 w-4 shrink-0 text-primary" aria-label="Tambah" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
