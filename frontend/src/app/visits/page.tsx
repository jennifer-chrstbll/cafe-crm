"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Footprints } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Pill, Segmented } from "@/components/app/bits";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { formatDateTime, formatDuration, formatTime } from "@/lib/format";

interface V {
  visit_id: string; customer_id: string; name: string; entry_time: string; exit_time: string | null;
  duration_minutes: number | null; track_id: string | null; association_score: number | null; association_mode: string | null;
}
const PAGE = 25;

/** Visit sessions: entry (face at cashier) -> exit (person tracking). Shows how each was linked. */
export default function VisitsPage() {
  const [range, setRange] = useState<"today" | "7d" | "30d">("today");
  const [status, setStatus] = useState<"" | "open" | "closed">("");
  const [page, setPage] = useState(0);
  const r = useApi<{ total: number; items: V[] }>(`/visits?range=${range}&status=${status}&limit=${PAGE}&offset=${page * PAGE}`, { interval: 30_000 });
  const pages = Math.max(1, Math.ceil((r.data?.total ?? 0) / PAGE));

  return (
    <AppShell ownerOnly>
      <PageHeader title="Kunjungan" description="Siapa datang, berapa lama, dan bagaimana identitasnya dihubungkan" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Segmented value={range} onChange={(v) => { setRange(v); setPage(0); }} options={[{ value: "today", label: "Hari ini" }, { value: "7d", label: "7 hari" }, { value: "30d", label: "30 hari" }]} />
        <Segmented value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[{ value: "", label: "Semua" }, { value: "open", label: "Masih di kafe" }, { value: "closed", label: "Sudah pulang" }]} />
      </div>

      {r.loading ? <ListSkeleton rows={8} />
        : r.error ? <ErrorState message={r.error} onRetry={r.reload} />
        : !r.data?.items.length ? <EmptyState icon={Footprints} title="Belum ada kunjungan" text="Kunjungan tercatat saat pelanggan dikenali di kasir atau memesan." />
        : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Masuk</th><th className="px-4 py-3">Keluar</th><th className="px-4 py-3">Durasi</th><th className="px-4 py-3">Asosiasi Track ID</th></tr>
                </thead>
                <tbody className="divide-y">
                  {r.data.items.map((v) => (
                    <tr key={v.visit_id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium"><Link href={`/customers/${v.customer_id}`} className="hover:underline">{v.name}</Link></td>
                      <td className="num px-4 py-3">{range === "today" ? formatTime(v.entry_time) : formatDateTime(v.entry_time)}</td>
                      <td className="num px-4 py-3">{v.exit_time ? formatTime(v.exit_time) : <Pill tone="success">Di kafe</Pill>}</td>
                      <td className="num px-4 py-3">{formatDuration(v.duration_minutes)}</td>
                      <td className="px-4 py-3">
                        {v.track_id ? (
                          <span className="flex items-center gap-2">
                            <span className="num font-mono text-xs">{v.track_id}</span>
                            <Pill tone={v.association_mode === "MANUAL" ? "info" : "success"}>
                              {v.association_mode === "MANUAL" ? "Manual" : `Otomatis${v.association_score != null ? ` ${v.association_score.toFixed(2)}` : ""}`}
                            </Pill>
                          </span>
                        ) : <span className="text-muted-foreground">Belum terhubung</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Halaman">
                <Button variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 0}><ChevronLeft /> Sebelumnya</Button>
                <span className="num px-3 text-sm text-muted-foreground">{page + 1} / {pages}</span>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages}>Berikutnya <ChevronRight /></Button>
              </nav>
            )}
          </>
        )}
    </AppShell>
  );
}
