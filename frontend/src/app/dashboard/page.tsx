"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, CreditCard, Receipt, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, StatCard } from "@/components/app/bits";
import { ChartSkeleton, EmptyState, ErrorState, StatGridSkeleton } from "@/components/app/states";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { formatDayLong, formatNumber, formatRupiah, formatRupiahShort, timeAgo } from "@/lib/format";

interface Dash {
  revenue_today: number; revenue_yesterday_same_time: number; transactions_today: number; avg_ticket: number;
  visits_today: number; customers_today: number; returning_today: number; new_customers_today: number;
  open_tabs: number; open_tabs_amount: number;
  floors: { floor: number; capacity: number; count: number; updated_at: string | null; stale: boolean }[];
  hourly: { hour: number; revenue: number }[];
  top_sellers: { name: string; qty: number; revenue: number }[];
  alerts: { level: "warning" | "danger"; text: string; href?: string }[];
}

function Occupancy({ floors }: { floors: Dash["floors"] }) {
  return (
    <ul className="space-y-4">
      {floors.map((f) => {
        const pct = f.capacity ? Math.min(1, f.count / f.capacity) : 0;
        const tone = pct >= 1 ? "bg-destructive" : pct >= 0.75 ? "bg-warning" : "bg-success";
        const word = pct >= 1 ? "Penuh" : pct >= 0.75 ? "Hampir penuh" : "Tersedia";
        return (
          <li key={f.floor}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium">Lantai {f.floor}</span>
              <span className="num"><b className="text-base">{f.count}</b> / {f.capacity} orang · {word}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={f.capacity} aria-valuenow={f.count} aria-label={`Lantai ${f.floor}`}>
              <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct * 100}%` }} />
            </div>
            <p className={cn("mt-1 text-xs", f.stale ? "text-warning" : "text-muted-foreground")}>
              {f.updated_at ? `${f.stale ? "Data lama · " : ""}diperbarui ${timeAgo(f.updated_at)}` : "Belum ada data dari kamera area"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const d = useApi<Dash>("/analytics/dashboard", { interval: 30_000 });
  const x = d.data;
  const nowHour = new Date(Date.now() + 7 * 3600_000).getUTCHours();
  const delta = x && x.revenue_yesterday_same_time > 0 ? x.revenue_today / x.revenue_yesterday_same_time - 1 : null;
  const hours = (x?.hourly ?? []).filter((h) => h.hour >= 7 && h.hour <= 23);

  return (
    <AppShell ownerOnly>
      <PageHeader title="Ringkasan hari ini" description={formatDayLong()} />

      {d.loading ? <><StatGridSkeleton /><div className="mt-4 grid gap-4 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div></>
        : d.error ? <ErrorState message={d.error} onRetry={d.reload} />
        : x && (
          <div className="space-y-4">
            {x.alerts.length > 0 && (
              <ul className="space-y-2" aria-label="Perlu perhatian">
                {x.alerts.map((a, i) => (
                  <li key={i}>
                    <Link href={a.href ?? "#"} className={cn("flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2 text-sm font-medium",
                      a.level === "danger" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-warning/40 bg-warning/5 text-warning")}>
                      <AlertTriangle className="h-4 w-4" /> <span className="flex-1">{a.text}</span> <ChevronRight className="h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Pendapatan" icon={TrendingUp} value={formatRupiah(x.revenue_today)} delta={delta}
                hint={delta == null ? "kemarin belum ada data" : "vs kemarin di jam yang sama"} />
              <StatCard label="Transaksi" icon={Receipt} value={formatNumber(x.transactions_today)}
                hint={`rata-rata ${formatRupiah(x.avg_ticket)}`} onClick={() => router.push("/transactions")} />
              <StatCard label="Pelanggan dikenal" icon={Users} value={formatNumber(x.customers_today)}
                hint={`${x.returning_today} kembali · ${x.new_customers_today} baru daftar`} onClick={() => router.push("/visits")} />
              <StatCard label="Tagihan terbuka" icon={CreditCard} value={formatRupiah(x.open_tabs_amount)}
                hint={`${x.open_tabs} tagihan`} tone={x.open_tabs ? "warning" : "default"} onClick={() => router.push("/unpaid")} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Panel title="Pendapatan per jam">
                {x.revenue_today === 0 ? <EmptyState icon={TrendingUp} title="Belum ada penjualan hari ini" /> : (
                  <div className="h-64" role="img" aria-label="Grafik pendapatan per jam">
                    <ResponsiveContainer>
                      <BarChart data={hours} margin={{ left: 0, right: 8, top: 8 }}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" tickFormatter={(h) => `${h}`} tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickFormatter={(v) => formatRupiahShort(v)} tickLine={false} axisLine={false} width={70} fontSize={12} />
                        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => [formatRupiah(v), "Pendapatan"]} labelFormatter={(h) => `Pukul ${h}.00`} />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                          {hours.map((h) => <Cell key={h.hour} fill={h.hour === nowHour ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>
              <Panel title="Okupansi sekarang"><Occupancy floors={x.floors} /></Panel>
            </div>

            <Panel title="Terlaris hari ini" bodyClassName="p-0">
              {x.top_sellers.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada pesanan.</p> : (
                <ol className="divide-y">
                  {x.top_sellers.map((s, i) => (
                    <li key={s.name} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="num w-5 font-semibold text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 font-medium">{s.name}</span>
                      <span className="num text-muted-foreground">{s.qty}×</span>
                      <span className="num w-28 text-right font-semibold">{formatRupiah(s.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        )}
    </AppShell>
  );
}
