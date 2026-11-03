"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Pencil, ScanFace, ShieldOff, ShoppingBag, Sparkles, Star, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, Field, Panel, Pill, SegmentBadge } from "@/components/app/bits";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { EnrollDialog } from "@/components/app/EnrollDialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { formatDate, formatDateTime, formatDuration, formatRupiah, PAYMENT_LABEL, timeAgo } from "@/lib/format";
import { CustomerContext } from "@/types";

interface HistoryVisit {
  visit_id: string; entry_time: string; exit_time: string | null; duration_minutes: number | null;
  items: { menu_name: string; qty: number; subtotal: number }[]; total: number; unpaid: boolean; payment_methods: string[];
}

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isOwner } = useAuth();
  const c = useApi<CustomerContext>(`/customers/${id}`);
  const history = useApi<HistoryVisit[]>(`/customers/${id}/history`);
  const [edit, setEdit] = useState(false);
  const [enroll, setEnroll] = useState(false);
  const [removeFace, setRemoveFace] = useState(false);
  const [erase, setErase] = useState(false);
  const [form, setForm] = useState({ name: "", phone_number: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const d = c.data;
  const spend = (history.data ?? []).reduce((s, v) => s + v.total, 0);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/customers/${id}`, form);
      toast.success("Data pelanggan disimpan");
      setEdit(false); c.reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  }

  return (
    <AppShell>
      <Link href="/customers" className="mb-3 inline-flex h-10 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pelanggan
      </Link>

      {c.loading ? (
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5"><Skeleton className="h-20 w-20 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div>
      ) : c.error || !d ? <ErrorState message={c.error ?? "Pelanggan tidak ditemukan."} onRetry={c.reload} />
      : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar name={d.name} size="xl" />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-2xl font-bold">{d.name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <SegmentBadge segment={d.segment} />
                    {d.has_face ? <Pill tone="success"><ScanFace className="h-3 w-3" /> Wajah terdaftar</Pill> : <Pill tone="neutral">Tanpa wajah</Pill>}
                    {d.open_tab && <Pill tone="warning">Tagihan {formatRupiah(d.open_tab.total_amount)}</Pill>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {d.phone_number ?? "Tanpa no. HP"} · pelanggan sejak {formatDate(d.member_since)}
                  </p>
                </div>
                <Button size="lg" onClick={() => router.push(`/pos?customer=${d.customer_id}`)}><ShoppingBag /> Buat pesanan</Button>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-center">
                <div><dt className="text-xs text-muted-foreground">Kunjungan</dt><dd className="num text-xl font-bold">{d.visit_count}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Total belanja</dt><dd className="num text-xl font-bold">{formatRupiah(spend)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Terakhir</dt><dd className="text-xl font-bold">{timeAgo(d.last_visit)}</dd></div>
              </dl>
              {d.notes && <p className="mt-4 rounded-lg border-l-4 border-info bg-info/5 px-3 py-2 text-sm">{d.notes}</p>}
            </section>

            <Panel title="Riwayat kunjungan" bodyClassName="p-0">
              {history.loading ? <div className="p-4"><ListSkeleton rows={3} avatar={false} /></div>
                : history.error ? <ErrorState className="m-4" message={history.error} onRetry={history.reload} />
                : !history.data?.length ? <EmptyState className="m-4" icon={CalendarDays} title="Belum ada kunjungan" />
                : (
                  <ul className="divide-y">
                    {history.data.map((v) => (
                      <li key={v.visit_id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{formatDateTime(v.entry_time)}</span>
                          <span className="text-muted-foreground">· {v.exit_time ? formatDuration(v.duration_minutes) : "masih di kafe"}</span>
                          {v.unpaid && <Pill tone="warning">Belum bayar</Pill>}
                          <span className="num ml-auto font-semibold">{v.total ? formatRupiah(v.total) : "–"}</span>
                        </div>
                        {v.items.length > 0 && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {v.items.map((i) => `${i.qty}× ${i.menu_name}`).join(", ")}
                            {v.payment_methods.length > 0 && ` · ${v.payment_methods.map((m) => PAYMENT_LABEL[m] ?? m).join(", ")}`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title={<h2 className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-primary" /> Favorit</h2>}>
              {d.recommendation.favorites.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pesanan.</p> : (
                <ol className="space-y-2">{d.recommendation.favorites.map((f, i) => (
                  <li key={f.menu_id} className="flex items-center gap-3 text-sm"><span className="num w-5 text-muted-foreground">{i + 1}.</span><span className="flex-1 font-medium">{f.name}</span><span className="num text-muted-foreground">{f.qty}×</span></li>
                ))}</ol>
              )}
            </Panel>
            <Panel title={<h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Rekomendasi</h2>}>
              <p className="mb-3 text-xs text-muted-foreground">
                {d.recommendation.strategy === "COLLABORATIVE_FILTERING"
                  ? `Item-based collaborative filtering (${d.recommendation.transaction_count} transaksi)`
                  : `Menu terlaris — rekomendasi personal mulai 3 transaksi (sekarang ${d.recommendation.transaction_count})`}
              </p>
              <ul className="space-y-2">{d.recommendation.recommendations.map((r) => (
                <li key={r.menu_id} className="rounded-lg border p-2.5 text-sm"><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.reason}</p></li>
              ))}</ul>
            </Panel>
            <Panel title="Kelola data">
              <div className="grid gap-2">
                <Button variant="outline" onClick={() => { setForm({ name: d.name, phone_number: d.phone_number ?? "", notes: d.notes ?? "" }); setEdit(true); }}><Pencil /> Ubah data</Button>
                <Button variant="outline" onClick={() => setEnroll(true)}><ScanFace /> {d.has_face ? "Daftarkan ulang wajah" : "Daftarkan wajah"}</Button>
                {d.has_face && <Button variant="outline" className="text-destructive" onClick={() => setRemoveFace(true)}><ShieldOff /> Hapus data wajah</Button>}
                {isOwner && <Button variant="ghost" className="text-destructive" onClick={() => setErase(true)}><Trash2 /> Hapus pelanggan</Button>}
              </div>
            </Panel>
          </div>
        </div>
      )}

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ubah data pelanggan</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Nama" htmlFor="c-name"><Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Nomor HP" htmlFor="c-phone"><Input id="c-phone" inputMode="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></Field>
            <Field label="Catatan untuk kasir" htmlFor="c-notes" hint="Mis. alergi susu, suka less sugar.">
              <Input id="c-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <DialogFooter className="gap-2"><Button type="button" variant="outline" size="lg" onClick={() => setEdit(false)}>Batal</Button><Button type="submit" size="lg" disabled={saving || !form.name.trim()}>{saving ? "Menyimpan…" : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {d && <EnrollDialog open={enroll} onOpenChange={setEnroll} existing={{ customer_id: d.customer_id, name: d.name }} onDone={() => c.reload()} />}

      <ConfirmDialog open={removeFace} onOpenChange={setRemoveFace} title="Hapus data wajah?"
        description="Pelanggan tidak akan dikenali otomatis lagi. Profil dan riwayat pesanan tetap ada. Lakukan bila pelanggan menarik persetujuan."
        confirmLabel="Hapus data wajah"
        onConfirm={async () => { try { await api.delete(`/customers/${id}/face`); toast.success("Data wajah dihapus"); c.reload(); } catch (e) { toast.error(errorMessage(e)); } }} />

      <ConfirmDialog open={erase} onOpenChange={setErase} title={`Hapus ${d?.name}?`}
        description="Nama, kontak, dan data wajah dihapus permanen (hak penghapusan UU PDP). Catatan penjualan tetap tersimpan tanpa identitas."
        confirmLabel="Hapus permanen"
        onConfirm={async () => { try { await api.delete(`/customers/${id}`); toast.success("Data pelanggan dihapus"); router.replace("/customers"); } catch (e) { toast.error(errorMessage(e)); } }} />
    </AppShell>
  );
}
