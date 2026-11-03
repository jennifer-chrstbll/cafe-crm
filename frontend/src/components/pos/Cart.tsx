"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/app/bits";
import { formatRupiah } from "@/lib/format";
import { CartItem } from "@/types";

export type OrderMode = "pay_now" | "tab";

/**
 * The order being built. The total and the single primary button sit at the bottom right,
 * where the eye ends (Z/F pattern) and the thumb rests on an iPad held in landscape.
 * The button names the action AND the amount ("Bayar Rp 45.000") so nobody charges blindly.
 */
export function Cart({ cart, onQty, onClear, mode, onMode, isGuest, label, onLabel, busy, onSubmit, customerName }: {
  cart: CartItem[]; onQty: (menuId: string, delta: number) => void; onClear: () => void;
  mode: OrderMode; onMode: (m: OrderMode) => void; isGuest: boolean; label: string; onLabel: (s: string) => void;
  busy: boolean; onSubmit: () => void; customerName: string;
}) {
  const total = cart.reduce((s, i) => s + i.menu.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const needLabel = isGuest && mode === "tab" && !label.trim();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">Pesanan</h2>
          <p className="truncate text-xs text-muted-foreground">untuk {customerName}</p>
        </div>
        {cart.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive"><Trash2 /> Kosongkan</Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
            <p className="text-sm">Ketuk menu untuk menambahkan.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {cart.map((i) => (
              <li key={i.menu.menu_id} className="flex items-center gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.menu.name}</p>
                  <p className="num text-xs text-muted-foreground">{formatRupiah(i.menu.price)}</p>
                </div>
                <div className="flex items-center rounded-lg border">
                  <button className="flex h-10 w-10 items-center justify-center hover:bg-muted" onClick={() => onQty(i.menu.menu_id, -1)}
                    aria-label={i.qty === 1 ? `Hapus ${i.menu.name}` : `Kurangi ${i.menu.name}`}>
                    {i.qty === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                  </button>
                  <span className="num w-8 text-center text-sm font-semibold" aria-live="polite">{i.qty}</span>
                  <button className="flex h-10 w-10 items-center justify-center hover:bg-muted" onClick={() => onQty(i.menu.menu_id, 1)} aria-label={`Tambah ${i.menu.name}`}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="num w-24 text-right text-sm font-semibold">{formatRupiah(i.menu.price * i.qty)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t bg-card p-4">
        <Segmented size="lg" className="w-full" value={mode} onChange={onMode}
          options={[{ value: "pay_now", label: "Bayar sekarang" }, { value: "tab", label: "Bayar nanti (tagihan)" }]} />
        {isGuest && mode === "tab" && (
          <Input value={label} onChange={(e) => onLabel(e.target.value)} placeholder="Nama / nomor meja, mis. Meja 4" aria-label="Label tagihan tamu" />
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{count} item</span>
          <span className="num text-2xl font-bold tracking-tight">{formatRupiah(total)}</span>
        </div>
        <Button size="xl" className="w-full" disabled={!cart.length || busy || needLabel} onClick={onSubmit}>
          {busy ? "Menyimpan…" : mode === "pay_now" ? `Bayar ${formatRupiah(total)}` : `Masukkan ke tagihan · ${formatRupiah(total)}`}
        </Button>
      </div>
    </div>
  );
}
