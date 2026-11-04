"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Fingerprint, ScanFace, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, PageHeader, Panel, Pill, Segmented } from "@/components/app/bits";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { EnrollDialog } from "@/components/app/EnrollDialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import api, { errorMessage } from "@/services/api";
import { formatDate, timeAgo } from "@/lib/format";

interface FaceRow {
  customer_id: string; name: string; phone_number: string | null; is_active: boolean;
  photos: number; works: boolean; enrolled_at: string; last_seen_at: string | null;
}

/**
 * Wajah Terdaftar (owner): whose face data is stored, whether it still works with the
 * cashier camera, and deleting it (UU PDP: withdraw consent / storage limitation).
 * Deleting a face keeps the customer and their purchase history; full erasure is on the
 * customer's profile page.
 */
export default function FacesPage() {
  const res = useApi<{ rows: FaceRow[]; total: number; needs_reenroll: number }>("/faces");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "redo">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [all, setAll] = useState(false);
  const [typed, setTyped] = useState("");
  const [enroll, setEnroll] = useState<FaceRow | null>(null);

  const rows = useMemo(() => (res.data?.rows ?? []).filter((r) =>
    (filter === "all" || !r.works) && (!q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.phone_number ?? "").includes(q))),
  [res.data, q, filter]);
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.customer_id));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function remove(body: object) {
    try {
      const r = await api.delete<{ deleted_customers: number }>("/faces", { data: body });
      toast.success(`Data wajah ${r.data.deleted_customers} pelanggan dihapus`);
      setPicked(new Set());
      res.reload();
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <AppShell ownerOnly>
      <PageHeader title="Wajah Terdaftar" description="Siapa yang wajahnya disimpan, apakah masih bisa dikenali, dan penghapusan data wajah" />
      {res.loading ? <ListSkeleton rows={6} />
        : res.error ? <ErrorState message={res.error} onRetry={res.reload} />
        : !res.data?.total ? (
          <EmptyState icon={Fingerprint} title="Belum ada wajah terdaftar"
            text="Daftarkan wajah dari halaman Pelanggan atau dari Kasir, setelah pelanggan menyetujui." />
        ) : (
          <Panel bodyClassName="p-0" title={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Cari nama atau nomor HP" placeholder="Cari nama atau nomor HP" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
              <Segmented value={filter} onChange={setFilter} options={[
                { value: "all", label: `Semua (${res.data.total})` },
                { value: "redo", label: `Perlu daftar ulang (${res.data.needs_reenroll})` },
              ]} />
            </div>
          }>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
              <label className="flex h-11 items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.customer_id)))} />
                Pilih semua yang tampil
              </label>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="destructive" disabled={!picked.size} onClick={() => setConfirm(true)}><Trash2 /> Hapus wajah terpilih ({picked.size})</Button>
                <Button variant="outline" onClick={() => { setTyped(""); setAll(true); }}>Hapus semua…</Button>
              </div>
            </div>
            {rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Tidak ada yang cocok.</p> : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.customer_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <input type="checkbox" aria-label={`Pilih ${r.name}`} className="h-5 w-5 accent-[hsl(var(--primary))]"
                      checked={picked.has(r.customer_id)} onChange={() => toggle(r.customer_id)} />
                    <Avatar name={r.name} size="sm" />
                    <div className="min-w-40 flex-1">
                      <Link href={`/customers/${r.customer_id}`} className="font-semibold hover:underline">{r.name}</Link>
                      <p className="text-xs text-muted-foreground">
                        {r.photos} foto · didaftarkan {formatDate(r.enrolled_at)} · {r.last_seen_at ? `terakhir dikenali ${timeAgo(r.last_seen_at)}` : "belum pernah dikenali"}
                      </p>
                    </div>
                    {r.works ? <Pill tone="success">Berfungsi</Pill> : <Pill tone="warning">Perlu daftar ulang</Pill>}
                    <Button variant={r.works ? "outline" : "default"} onClick={() => setEnroll(r)}><ScanFace /> {r.works ? "Daftar ulang" : "Daftarkan ulang"}</Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      <p className="mt-3 text-xs text-muted-foreground">
        Menghapus wajah tidak menghapus pelanggan dan riwayat belanjanya. Untuk menghapus semua data seseorang, buka profilnya → Hapus data pelanggan.
        &quot;Perlu daftar ulang&quot; = wajah direkam dengan model lama yang tidak dipakai lagi oleh kamera kasir.
      </p>

      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Hapus data wajah ${picked.size} pelanggan?`}
        description="Mereka tidak dikenali otomatis lagi sampai didaftarkan ulang (dengan persetujuan)."
        confirmLabel="Hapus data wajah" onConfirm={() => remove({ customer_ids: [...picked] })} />
      <ConfirmDialog open={all} onOpenChange={setAll} title="Hapus SEMUA data wajah?"
        description={`Data wajah ${res.data?.total ?? 0} pelanggan dihapus dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus semua" confirmDisabled={typed !== "HAPUS SEMUA"}
        onConfirm={() => remove({ all: true, confirm: typed })}>
        <label className="block space-y-1 text-sm">
          <span>Ketik <b>HAPUS SEMUA</b> untuk mengonfirmasi</span>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
      </ConfirmDialog>
      <EnrollDialog open={!!enroll} onOpenChange={(o) => !o && setEnroll(null)}
        existing={enroll ? { customer_id: enroll.customer_id, name: enroll.name } : null}
        onDone={() => { setEnroll(null); res.reload(); }} />
    </AppShell>
  );
}
