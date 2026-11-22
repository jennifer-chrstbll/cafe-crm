"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, formatRupiah } from "@/lib/format";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/app/states";
import { Menu } from "@/types";

const CATS = ["ALL", "COFFEE", "NON_COFFEE", "FOOD", "DESSERT"] as const;

/**
 * Menu tiles: large (>= 96 px) because tapping them is the most frequent action in a
 * shift (Fitts's law). Quantity already in the cart shows on the tile (visibility).
 */
export function MenuGrid({ menus, loading, error, onRetry, qtyById, onAdd }: {
  menus: Menu[] | null; loading: boolean; error: string | null; onRetry: () => void;
  qtyById: Map<string, number>; onAdd: (m: Menu) => void;
}) {
  const [cat, setCat] = useState<(typeof CATS)[number]>("ALL");
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (menus ?? []).filter((m) => (cat === "ALL" || m.category === cat) && (!term || m.name.toLowerCase().includes(term)));
  }, [menus, cat, q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu  ( / )"
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-base" aria-label="Cari menu" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground" aria-label="Hapus pencarian">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin" role="tablist" aria-label="Kategori menu">
          {CATS.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
              className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80 hover:bg-accent")}>
              {c === "ALL" ? "Semua" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
        {loading ? <CardGridSkeleton n={12} className="sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" />
          : error ? <ErrorState message={error} onRetry={onRetry} />
          : visible.length === 0 ? (
            <EmptyState icon={Search} title={q ? `Tidak ada menu "${q}"` : "Belum ada menu"}
              text={q ? "Coba kata lain atau pilih kategori Semua." : "Pemilik dapat menambah menu di halaman Menu."} />
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visible.map((m) => {
                const qty = qtyById.get(m.menu_id) ?? 0;
                return (
                  <li key={m.menu_id}>
                    <button type="button" onClick={() => onAdd(m)}
                      className={cn("relative flex h-24 w-full items-center gap-3 rounded-xl border-2 bg-card p-2.5 text-left transition-[transform,border-color] active:scale-[0.97]",
                        qty ? "border-primary" : "border-transparent shadow-sm hover:border-primary/30")}>
                      {m.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image_url} alt="" loading="lazy" className="h-[4.25rem] w-[4.25rem] shrink-0 rounded-lg object-cover" />
                      )}
                      <span className="flex h-full min-w-0 flex-1 flex-col justify-between py-0.5">
                        <span className="line-clamp-2 pr-6 text-sm font-semibold leading-snug">{m.name}</span>
                        <span className="num text-sm text-muted-foreground">{formatRupiah(m.price)}</span>
                      </span>
                      {qty > 0 && (
                        <span className="num absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground"
                          aria-label={`${qty} di keranjang`}>{qty}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </div>
  );
}
