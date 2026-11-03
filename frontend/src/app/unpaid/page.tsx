"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Clock, CreditCard, PartyPopper, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, PageHeader, Pill } from "@/components/app/bits";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { PayDialog } from "@/components/app/PayDialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { cn } from "@/lib/utils";
import { formatDuration, formatRupiah, formatTime, PAYMENT_LABEL } from "@/lib/format";
import { Tab, TabItem } from "@/types";

/** Open stay-in tabs. One job: collect what is owed. Oldest first, long-open tabs highlighted. */
export default function UnpaidPage() {
  const tabs = useApi<Tab[]>("/tabs", { interval: 15_000 });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [paying, setPaying] = useState<Tab | null>(null);
  const [removing, setRemoving] = useState<{ tab: Tab; item: TabItem } | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (tabs.data ?? []).filter((t) => !term || t.name.toLowerCase().includes(term));
  }, [tabs.data, q]);
  const total = (tabs.data ?? []).reduce((s, t) => s + t.total_amount, 0);

  return (
    <AppShell>
      <PageHeader title="Tagihan terbuka"
        description={tabs.data ? `${tabs.data.length} tagihan · total ${formatRupiah(total)} belum dibayar` : "Pesanan stay-in yang dibayar nanti"} />

      {(tabs.data?.length ?? 0) > 4 && (
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau meja" className="pl-10" />
        </div>
      )}

      {tabs.loading ? <ListSkeleton rows={4} />
        : tabs.error ? <ErrorState message={tabs.error} onRetry={tabs.reload} />
        : list.length === 0 ? (
          <EmptyState icon={PartyPopper} title={q ? "Tidak ditemukan" : "Semua tagihan sudah lunas"}
            text={q ? "Coba nama lain." : "Pesanan 'bayar nanti' dari halaman Kasir akan muncul di sini."} />
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {list.map((t) => {
              const expanded = open === t.transaction_id;
              const old = t.minutes_open >= 120;
              return (
                <li key={t.transaction_id} className={cn("rounded-xl border bg-card shadow-sm", old && "border-warning/50")}>
                  <div className="flex items-center gap-3 p-4">
                    <Avatar name={t.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> sejak {formatTime(t.created_at)} · {formatDuration(t.minutes_open)}
                        {old && <Pill tone="warning" className="ml-1">Lama</Pill>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num text-lg font-bold">{formatRupiah(t.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">{t.items.reduce((s, i) => s + i.qty, 0)} item</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t px-4 py-2">
                    <Button variant="ghost" onClick={() => setOpen(expanded ? null : t.transaction_id)} aria-expanded={expanded}>
                      <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} /> Rincian
                    </Button>
                    <Button className="ml-auto" size="lg" onClick={() => setPaying(t)}><CreditCard /> Bayar</Button>
                  </div>
                  {expanded && (
                    <ul className="divide-y border-t">
                      {t.items.map((i) => (
                        <li key={i.order_id} className="flex items-center gap-3 px-4 py-2 text-sm">
                          <span className="num w-8 text-muted-foreground">{i.qty}×</span>
                          <span className="flex-1">{i.menu_name}</span>
                          <span className="num">{formatRupiah(i.subtotal)}</span>
                          <Button variant="ghost" size="icon" onClick={() => setRemoving({ tab: t, item: i })} aria-label={`Hapus ${i.menu_name}`}>
                            <Trash2 className="text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

      {paying && (
        <PayDialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)} total={paying.total_amount}
          title={`Bayar tagihan ${paying.name}`} description={`${paying.items.length} item`}
          onPay={async (m) => {
            try {
              await api.post(`/tabs/${paying.transaction_id}/pay`, { payment_method: m });
              toast.success(`Tagihan ${paying.name} lunas`, { description: `${formatRupiah(paying.total_amount)} · ${PAYMENT_LABEL[m]}` });
              tabs.reload();
            } catch (e) { toast.error(errorMessage(e)); throw e; }
          }} />
      )}

      <ConfirmDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}
        title={`Hapus ${removing?.item.menu_name}?`}
        description={`Dari tagihan ${removing?.tab.name}. Gunakan bila pesanan salah input atau dibatalkan.`}
        confirmLabel="Hapus item"
        onConfirm={async () => {
          try {
            const r = await api.delete<{ cancelled: boolean }>(`/tabs/${removing!.tab.transaction_id}/items/${removing!.item.order_id}`);
            toast.success(r.data.cancelled ? "Item dihapus, tagihan dibatalkan karena kosong" : "Item dihapus");
            tabs.reload();
          } catch (e) { toast.error(errorMessage(e)); }
        }} />
    </AppShell>
  );
}
