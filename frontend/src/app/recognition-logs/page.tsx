"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, ScanFace, X } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader, Pill, Segmented, StatCard } from "@/components/app/bits";
import { EmptyState, ErrorState, ListSkeleton, StatGridSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { formatDateTime, formatPercent } from "@/lib/format";

interface Log {
  log_id: string; customer_id: string | null; customer_name: string | null; similarity_score: number | null;
  recognized: boolean; is_correct: boolean | null; camera_id: string | null; model_used: string | null; created_at: string;
}
interface Res {
  total: number; items: Log[];
  summary: { events: number; known: number; unknown: number; confirmed_correct: number; confirmed_wrong: number; precision: number | null };
}
const PAGE = 25;

/**
 * Audit + field evaluation of the cashier camera. Cashier/owner feedback ("Benar"/"Salah")
 * turns each event into ground truth for the thesis (precision of recognitions in the field).
 */
export default function RecognitionLogsPage() {
  const [days, setDays] = useState<"1" | "7" | "30">("7");
  const [status, setStatus] = useState<"" | "known" | "unknown" | "unchecked" | "wrong">("");
  const [page, setPage] = useState(0);
  const r = useApi<Res>(`/recognition-logs?days=${days}&status=${status}&limit=${PAGE}&offset=${page * PAGE}`);
  const s = r.data?.summary;
  const pages = Math.max(1, Math.ceil((r.data?.total ?? 0) / PAGE));

  async function mark(l: Log, ok: boolean) {
    try {
      await api.patch(`/recognition-logs/${l.log_id}`, { is_correct: l.is_correct === ok ? null : ok });
      r.reload();
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <AppShell ownerOnly>
      <PageHeader title="Log pengenalan wajah" description="Setiap keputusan kamera kasir, untuk audit dan evaluasi akurasi" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Segmented value={days} onChange={(v) => { setDays(v); setPage(0); }} options={[{ value: "1", label: "Hari ini" }, { value: "7", label: "7 hari" }, { value: "30", label: "30 hari" }]} />
        <Segmented value={status} onChange={(v) => { setStatus(v); setPage(0); }}
          options={[{ value: "", label: "Semua" }, { value: "known", label: "Dikenali" }, { value: "unknown", label: "Tidak dikenal" }, { value: "unchecked", label: "Belum dicek" }, { value: "wrong", label: "Salah" }]} />
      </div>

      {r.loading ? <><StatGridSkeleton /><div className="mt-4"><ListSkeleton rows={8} /></div></>
        : r.error ? <ErrorState message={r.error} onRetry={r.reload} />
        : r.data && s && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Kejadian" value={s.events} hint="wajah diputuskan di kasir" />
              <StatCard label="Dikenali" value={s.known} hint={`${s.unknown} tidak dikenal`} />
              <StatCard label="Dikonfirmasi" value={s.confirmed_correct + s.confirmed_wrong} hint={`${s.confirmed_wrong} salah kenal`} />
              <StatCard label="Akurasi lapangan" value={formatPercent(s.precision, 1)} hint="benar / dikonfirmasi" tone={s.precision != null && s.precision < 0.9 ? "warning" : "default"} />
            </div>

            {!r.data.items.length ? <EmptyState icon={ScanFace} title="Tidak ada kejadian" text="Ubah filter atau rentang waktu." /> : (
              <ul className="divide-y rounded-xl border bg-card shadow-sm">
                {r.data.items.map((l) => (
                  <li key={l.log_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="num w-32 text-muted-foreground">{formatDateTime(l.created_at)}</span>
                    <span className="min-w-0 flex-1 font-medium">
                      {l.recognized ? (l.customer_name ?? "Pelanggan dihapus") : "Tidak dikenal"}
                    </span>
                    {l.recognized ? <Pill tone="success">Dikenali</Pill> : <Pill tone="warning">Wajah baru</Pill>}
                    <span className="num w-16 text-right text-muted-foreground" title="Kemiripan kosinus">{l.similarity_score?.toFixed(3) ?? "–"}</span>
                    {l.recognized && (
                      <span className="flex gap-1">
                        <Button size="sm" variant={l.is_correct === true ? "success" : "outline"} onClick={() => mark(l, true)} aria-pressed={l.is_correct === true}><Check /> Benar</Button>
                        <Button size="sm" variant={l.is_correct === false ? "destructive" : "outline"} onClick={() => mark(l, false)} aria-pressed={l.is_correct === false}><X /> Salah</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-2" aria-label="Halaman">
                <Button variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 0}><ChevronLeft /> Sebelumnya</Button>
                <span className="num px-3 text-sm text-muted-foreground">{page + 1} / {pages}</span>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages}>Berikutnya <ChevronRight /></Button>
              </nav>
            )}
          </div>
        )}
    </AppShell>
  );
}
