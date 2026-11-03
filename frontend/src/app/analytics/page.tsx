"use client";

import { useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Panel, SegmentBadge, Segmented, StatCard } from "@/components/app/bits";
import { ChartSkeleton, ErrorState, StatGridSkeleton } from "@/components/app/states";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, formatDuration, formatNumber, formatPercent, formatRupiah, formatRupiahShort } from "@/lib/format";

interface Overview {
  days: number;
  totals: { revenue: number; transactions: number; avg_ticket: number; visits: number; visitors: number;
            returning_rate: number; avg_duration_min: number | null; guest_share: number };
  daily: { date: string; revenue: number; transactions: number; visits: number }[];
  hours: { hour: number; qty: number }[];
  heatmap: number[][];
  products: { name: string; category: string; qty: number; revenue: number }[];
  categories: { category: string; revenue: number }[];
  segments: { segment: string; count: number }[];
  top_customers: { customer_id: string; name: string; visits: number; spend: number }[];
  recognition: { events: number; known: number; checked: number; precision: number | null };
}

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const shortDate = (k: string) => new Date(`${k}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/** Busy-times heatmap: one hue, darker = busier (sequential scale, readable without a legend key). */
function Heatmap({ data }: { data: number[][] }) {
  const max = Math.max(1, ...data.flat());
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 07–22
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs" aria-label="Jumlah item terjual per hari dan jam">
        <thead><tr><th />{hours.map((h) => <th key={h} className="num font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>
          {data.map((row, d) => (
            <tr key={d}>
              <th className="pr-1 text-left font-medium text-muted-foreground">{DAYS[d]}</th>
              {hours.map((h) => {
                const v = row[h] ?? 0;
                return (
                  <td key={h} title={`${DAYS[d]} ${h}.00 · ${v} item`} className="h-7 min-w-7 rounded"
                    style={{ background: v ? `hsl(var(--primary) / ${0.12 + 0.88 * (v / max)})` : "hsl(var(--muted))" }}>
                    <span className="sr-only">{v}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const o = useApi<Overview>(`/analytics/overview?days=${days}`);
  const x = o.data;
  const catTotal = (x?.categories ?? []).reduce((s, c) => s + c.revenue, 0);

  return (
    <AppShell ownerOnly>
      <PageHeader title="Analitik" description="Tren penjualan dan pelanggan"
        actions={<Segmented value={days} onChange={setDays} options={[{ value: "7", label: "7 hari" }, { value: "30", label: "30 hari" }, { value: "90", label: "90 hari" }]} />} />

      {o.loading ? <><StatGridSkeleton /><ChartSkeleton className="mt-4 h-72" /></>
        : o.error ? <ErrorState message={o.error} onRetry={o.reload} />
        : x && (
          <div className={cn("space-y-4 transition-opacity", o.refreshing && "opacity-60")}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Pendapatan" value={formatRupiah(x.totals.revenue)} hint={`${formatNumber(x.totals.transactions)} transaksi`} />
              <StatCard label="Rata-rata per transaksi" value={formatRupiah(x.totals.avg_ticket)} hint={`${formatPercent(x.totals.guest_share)} dari tamu tanpa data`} />
              <StatCard label="Pelanggan kembali" value={formatPercent(x.totals.returning_rate)} hint={`dari ${x.totals.visitors} pelanggan yang datang`} />
              <StatCard label="Lama kunjungan" value={formatDuration(x.totals.avg_duration_min ? Math.round(x.totals.avg_duration_min) : null)} hint={`${x.totals.visits} kunjungan tercatat`} />
            </div>

            <Panel title={<div><h2 className="font-semibold">Pendapatan & kunjungan</h2><p className="text-xs text-muted-foreground">Apakah penjualan naik atau turun?</p></div>}>
              <div className="h-72" role="img" aria-label="Grafik pendapatan dan kunjungan per hari">
                <ResponsiveContainer>
                  <ComposedChart data={x.daily} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} fontSize={12} minTickGap={24} />
                    <YAxis yAxisId="r" tickFormatter={formatRupiahShort} tickLine={false} axisLine={false} width={70} fontSize={12} />
                    <YAxis yAxisId="v" orientation="right" tickLine={false} axisLine={false} width={32} fontSize={12} allowDecimals={false} />
                    <Tooltip labelFormatter={shortDate} formatter={(v: number, n: string) => (n === "revenue" ? [formatRupiah(v), "Pendapatan"] : [v, "Kunjungan"])} />
                    <Bar yAxisId="r" dataKey="revenue" fill="hsl(var(--primary) / 0.75)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="v" dataKey="visits" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/75" /> Pendapatan</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-info" /> Kunjungan pelanggan terdaftar</span>
              </p>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title={<div><h2 className="font-semibold">Jam ramai</h2><p className="text-xs text-muted-foreground">Kapan perlu tambahan staf?</p></div>}>
                <Heatmap data={x.heatmap} />
              </Panel>
              <Panel title={<div><h2 className="font-semibold">Menu terlaris</h2><p className="text-xs text-muted-foreground">Menu mana yang menghasilkan uang?</p></div>}>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={x.products} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tickFormatter={formatRupiahShort} tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => [formatRupiah(v), "Pendapatan"]} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Kategori">
                <ul className="space-y-3">
                  {x.categories.sort((a, b) => b.revenue - a.revenue).map((c) => (
                    <li key={c.category}>
                      <div className="flex justify-between text-sm"><span>{CATEGORY_LABEL[c.category] ?? c.category}</span><span className="num font-medium">{formatPercent(catTotal ? c.revenue / catTotal : 0)}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${catTotal ? (c.revenue / catTotal) * 100 : 0}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Segmen pelanggan">
                <ul className="space-y-3">
                  {x.segments.map((s) => (
                    <li key={s.segment} className="flex items-center justify-between"><SegmentBadge segment={s.segment} /><span className="num text-lg font-semibold">{s.count}</span></li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">Baru &lt; 5 kunjungan · Langganan 5–14 · VIP ≥ 15</p>
              </Panel>
              <Panel title="Pengenalan wajah">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Kejadian di kasir</dt><dd className="num font-medium">{x.recognition.events}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Dikenali</dt><dd className="num font-medium">{formatPercent(x.recognition.events ? x.recognition.known / x.recognition.events : null)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Akurasi (konfirmasi kasir)</dt><dd className="num font-medium">{formatPercent(x.recognition.precision, 1)}</dd></div>
                </dl>
                <Link href="/recognition-logs" className="mt-3 inline-block text-sm font-medium text-info hover:underline">Lihat log pengenalan</Link>
              </Panel>
            </div>

            <Panel title="Pelanggan paling sering datang" bodyClassName="p-0">
              <ol className="divide-y">
                {x.top_customers.map((c, i) => (
                  <li key={c.customer_id}>
                    <Link href={`/customers/${c.customer_id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60">
                      <span className="num w-5 font-semibold text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 font-medium">{c.name}</span>
                      <span className="num text-muted-foreground">{c.visits} kunjungan</span>
                      <span className="num w-28 text-right font-semibold">{formatRupiah(c.spend)}</span>
                    </Link>
                  </li>
                ))}
                {!x.top_customers.length && <li className="p-4 text-sm text-muted-foreground">Belum ada kunjungan pelanggan terdaftar.</li>}
              </ol>
            </Panel>
          </div>
        )}
    </AppShell>
  );
}
