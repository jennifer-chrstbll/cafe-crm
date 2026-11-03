"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, CreditCard, QrCode, ReceiptText, Wallet } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel } from "@/components/app/bits";
import { EmptyState, ErrorState, ListSkeleton, StatGridSkeleton } from "@/components/app/states";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { formatDate, formatRupiah, formatTime, PAYMENT_LABEL, todayKeyWIB } from "@/lib/format";

interface Tx {
  date: string; is_today: boolean; total: number; count: number;
  by_method: Record<string, { count: number; amount: number }>;
  items: { transaction_id: string; amount: number; payment_method: string; paid_at: string; customer_id: string | null; name: string }[];
}

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  CASH: Banknote, QRIS: QrCode, DEBIT: CreditCard, EWALLET: Wallet,
};

/**
 * Payments received per day. The per-method totals are what a cashier counts when closing
 * the shift (cash in the drawer must equal "Tunai").
 */
export default function TransactionsPage() {
  const { isOwner } = useAuth();
  const [date, setDate] = useState(todayKeyWIB());
  const tx = useApi<Tx>(`/transactions?date=${date}`, { interval: 30_000 });
  const d = tx.data;

  return (
    <AppShell>
      <PageHeader title="Transaksi"
        description={d ? `${d.is_today ? "Hari ini" : formatDate(`${d.date}T12:00:00+07:00`)} · ${d.count} pembayaran` : "Pembayaran yang diterima"}
        actions={isOwner && (
          <Input type="date" value={date} max={todayKeyWIB()} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" aria-label="Pilih tanggal" />
        )} />

      {tx.loading ? <><StatGridSkeleton n={5} /><div className="mt-4"><ListSkeleton rows={5} avatar={false} /></div></>
        : tx.error ? <ErrorState message={tx.error} onRetry={tx.reload} />
        : d && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div className="col-span-2 rounded-xl border bg-primary p-4 text-primary-foreground shadow-sm lg:col-span-1">
                <p className="text-sm opacity-90">Total diterima</p>
                <p className="num mt-1 text-2xl font-bold">{formatRupiah(d.total)}</p>
              </div>
              {["CASH", "QRIS", "DEBIT", "EWALLET"].map((m) => {
                const Icon = ICON[m];
                const v = d.by_method[m];
                return (
                  <div key={m} className="rounded-xl border bg-card p-4 shadow-sm">
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Icon className="h-4 w-4" /> {PAYMENT_LABEL[m]}</p>
                    <p className="num mt-1 text-xl font-bold">{formatRupiah(v?.amount ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">{v?.count ?? 0} transaksi</p>
                  </div>
                );
              })}
            </div>

            <Panel title="Daftar pembayaran" bodyClassName="p-0">
              {d.items.length === 0 ? (
                <EmptyState className="m-4" icon={ReceiptText} title="Belum ada pembayaran" text="Pembayaran dari halaman Kasir dan Tagihan muncul di sini." />
              ) : (
                <ul className="divide-y">
                  {d.items.map((t) => (
                    <li key={t.transaction_id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="num w-14 text-muted-foreground">{formatTime(t.paid_at)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {t.customer_id ? <Link href={`/customers/${t.customer_id}`} className="hover:underline">{t.name}</Link> : t.name}
                      </span>
                      <span className="hidden text-muted-foreground sm:block">{PAYMENT_LABEL[t.payment_method] ?? t.payment_method}</span>
                      <span className="num w-28 text-right font-semibold">{formatRupiah(t.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
    </AppShell>
  );
}
