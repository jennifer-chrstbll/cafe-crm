"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MousePointerClick, ScanFace } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PayDialog } from "@/components/app/PayDialog";
import { EnrollDialog } from "@/components/app/EnrollDialog";
import { CustomerPanel, PanelView } from "@/components/pos/CustomerPanel";
import { CustomerPicker } from "@/components/pos/CustomerPicker";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { Cart, OrderMode } from "@/components/pos/Cart";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { formatRupiah, PAYMENT_LABEL } from "@/lib/format";
import { CartItem, CustomerContext, Menu, PaymentMethod, Station, StationLog } from "@/types";

/** Who the order is for. "auto" follows the cashier camera until the cart has items. */
type Selection = { kind: "auto" } | { kind: "customer"; id: string } | { kind: "guest" };

function Kasir() {
  const params = useSearchParams();
  const preset = params.get("customer");
  const station = useApi<Station>("/station", { interval: 2000 });
  const menus = useApi<Menu[]>("/menus");
  const [selection, setSelection] = useState<Selection>(preset ? { kind: "customer", id: preset } : { kind: "auto" });
  const picked = useApi<CustomerContext>(selection.kind === "customer" ? `/customers/${selection.id}` : null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mode, setMode] = useState<OrderMode>("pay_now");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [tabPayOpen, setTabPayOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const st = station.data;
  const menuMap = useMemo(() => new Map((menus.data ?? []).map((m) => [m.menu_id, m])), [menus.data]);
  const qtyById = useMemo(() => new Map(cart.map((i) => [i.menu.menu_id, i.qty])), [cart]);

  // Resolve what the left panel shows.
  const view: PanelView = useMemo(() => {
    if (selection.kind === "guest") return { kind: "guest" };
    if (selection.kind === "customer") {
      const ctx = picked.data && picked.data.customer_id === selection.id ? picked.data
        : st?.state === "known" && st.customer.customer_id === selection.id ? st.customer : null;
      const log = st?.state === "known" && st.customer.customer_id === selection.id ? st.log : undefined;
      return ctx ? { kind: "customer", ctx, log, auto: !!log } : { kind: "loading" };
    }
    if (!st) return { kind: "loading" };
    if (st.state === "known") return { kind: "customer", ctx: st.customer, log: st.log, auto: true };
    if (st.state === "unknown") return { kind: "unknown", log: st.log };
    return { kind: "idle" };
  }, [selection, picked.data, st]);

  const currentCustomer = view.kind === "customer" ? view.ctx : null;
  const isGuest = view.kind !== "customer";

  // Lock the person as soon as the order starts, so a new face at the camera never
  // silently changes who is being charged (Nielsen #5 error prevention).
  const add = useCallback((m: Menu) => {
    setSelection((s) => {
      if (s.kind !== "auto") return s;
      if (st?.state === "known") return { kind: "customer", id: st.customer.customer_id };
      return { kind: "guest" };
    });
    setCart((c) => {
      const i = c.findIndex((x) => x.menu.menu_id === m.menu_id);
      if (i === -1) return [...c, { menu: m, qty: 1 }];
      const next = [...c];
      next[i] = { ...next[i], qty: Math.min(99, next[i].qty + 1) };
      return next;
    });
  }, [st]);

  const changeQty = (id: string, d: number) =>
    setCart((c) => c.flatMap((i) => (i.menu.menu_id !== id ? [i] : i.qty + d <= 0 ? [] : [{ ...i, qty: Math.min(99, i.qty + d) }])));

  const reset = () => {
    setCart([]); setMode("pay_now"); setLabel(""); setSelection({ kind: "auto" });
  };

  // A customer with an open tab most likely wants to add to it.
  useEffect(() => {
    if (currentCustomer?.open_tab && cart.length === 0) setMode("tab");
  }, [currentCustomer?.customer_id, currentCustomer?.open_tab, cart.length]);

  const otherAtCamera = st?.state === "known" && selection.kind !== "auto" && cart.length > 0 &&
    !(selection.kind === "customer" && selection.id === st.customer.customer_id) ? st.customer : null;

  async function placeOrder(method?: PaymentMethod) {
    setBusy(true);
    try {
      const r = await api.post<{ total_amount: number; added_amount: number; status: string }>("/orders", {
        customer_id: currentCustomer?.customer_id ?? null,
        items: cart.map((i) => ({ menu_id: i.menu.menu_id, qty: i.qty })),
        mode, payment_method: method, label: label.trim() || undefined,
      });
      const who = currentCustomer?.name ?? (label.trim() || "Tamu");
      if (mode === "pay_now") {
        toast.success(`Pembayaran ${formatRupiah(r.data.total_amount)} diterima`, { description: `${who} · ${PAYMENT_LABEL[method!]}` });
      } else {
        toast.success(`Ditambahkan ke tagihan ${who}`, { description: `Total tagihan sekarang ${formatRupiah(r.data.total_amount)}` });
      }
      reset();
      station.reload();
    } catch (e) {
      toast.error(errorMessage(e, "Pesanan gagal disimpan."));
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function feedback(log: StationLog, ok: boolean) {
    try {
      await api.patch(`/recognition-logs/${log.log_id}`, { is_correct: ok });
      if (ok) toast.success("Terima kasih, tercatat benar.");
      else { toast("Dicatat salah kenal. Pilih pelanggan yang benar."); setSelection({ kind: "auto" }); setPickerOpen(true); }
      station.reload();
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[300px_minmax(0,1fr)_340px] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <section aria-label="Pelanggan di kasir" className="flex min-h-[260px] flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Di kasir sekarang</h2>
          {selection.kind === "auto" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Mengikuti kamera
            </span>
          )}
        </div>
        {(st?.tracking_prompts?.length ?? 0) > 0 && (
          <Link href={`/live?prompt=${st!.tracking_prompts![0].customer_id}`} role="status"
            className="flex items-center gap-2 border-b bg-warning/10 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/15">
            <MousePointerClick className="h-4 w-4 shrink-0" />
            <span className="flex-1">Kamera area ragu: siapa {st!.tracking_prompts![0].name || "pelanggan ini"}? Ketuk untuk memilih orangnya.</span>
          </Link>
        )}
        <div className="min-h-0 flex-1">
          <CustomerPanel view={view} menus={menuMap} cartLocked={cart.length > 0}
            onAdd={(id) => { const m = menuMap.get(id); if (m) add(m); }}
            onPickCustomer={() => setPickerOpen(true)} onGuest={() => setSelection({ kind: "guest" })}
            onEnroll={() => setEnrollOpen(true)} onFeedback={feedback} onPayTab={() => setTabPayOpen(true)}
            onClear={() => setSelection({ kind: "auto" })} />
        </div>
      </section>

      <section aria-label="Menu" className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
        {otherAtCamera && (
          <div className="flex items-center gap-2 border-b bg-info/5 px-3 py-2 text-sm" role="status">
            <ScanFace className="h-4 w-4 text-info" />
            <span className="flex-1"><b>{otherAtCamera.name}</b> terdeteksi di kamera.</span>
            <Button size="sm" variant="outline" onClick={() => setSelection({ kind: "customer", id: otherAtCamera.customer_id })}>Ganti ke {otherAtCamera.name.split(" ")[0]}</Button>
          </div>
        )}
        <MenuGrid menus={menus.data} loading={menus.loading} error={menus.error} onRetry={menus.reload} qtyById={qtyById} onAdd={add} />
      </section>

      <section aria-label="Pesanan" className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
        <Cart cart={cart} onQty={changeQty} onClear={() => setCart([])} mode={mode} onMode={setMode}
          isGuest={isGuest} label={label} onLabel={setLabel} busy={busy}
          customerName={currentCustomer?.name ?? "Tamu"}
          onSubmit={() => (mode === "pay_now" ? setPayOpen(true) : placeOrder().catch(() => undefined))} />
      </section>

      <PayDialog open={payOpen} onOpenChange={setPayOpen} total={cart.reduce((s, i) => s + i.menu.price * i.qty, 0)}
        title="Terima pembayaran" description={currentCustomer ? `Pesanan ${currentCustomer.name}` : "Pesanan tamu"}
        onPay={(m) => placeOrder(m)} />

      {currentCustomer?.open_tab && (
        <PayDialog open={tabPayOpen} onOpenChange={setTabPayOpen} total={currentCustomer.open_tab.total_amount}
          title={`Bayar tagihan ${currentCustomer.name}`} description={`${currentCustomer.open_tab.items.length} item belum dibayar`}
          onPay={async (m) => {
            try {
              await api.post(`/tabs/${currentCustomer.open_tab!.transaction_id}/pay`, { payment_method: m });
              toast.success(`Tagihan ${currentCustomer.name} lunas`, { description: `${formatRupiah(currentCustomer.open_tab!.total_amount)} · ${PAYMENT_LABEL[m]}` });
              station.reload(); picked.reload();
            } catch (e) { toast.error(errorMessage(e)); throw e; }
          }} />
      )}

      <CustomerPicker open={pickerOpen} onOpenChange={setPickerOpen}
        onPick={(c) => setSelection({ kind: "customer", id: c.customer_id })} onGuest={() => setSelection({ kind: "guest" })} />
      <EnrollDialog open={enrollOpen} onOpenChange={setEnrollOpen}
        onDone={(id) => { setSelection({ kind: "customer", id }); toast.success("Pelanggan terdaftar"); }} />
    </div>
  );
}

export default function PosPage() {
  return (
    <AppShell fullBleed>
      <Suspense>
        <Kasir />
      </Suspense>
    </AppShell>
  );
}
