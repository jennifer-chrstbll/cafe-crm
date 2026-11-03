"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ScanFace, Search, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, PageHeader, SegmentBadge, Segmented } from "@/components/app/bits";
import { EnrollDialog } from "@/components/app/EnrollDialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";
import { CustomerListItem } from "@/types";

const PAGE = 20;

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [segment, setSegment] = useState<"" | "VIP" | "Regular" | "New">("");
  const [sort, setSort] = useState<"recent" | "visits" | "name">("recent");
  const [page, setPage] = useState(0);
  const [enroll, setEnroll] = useState(false);

  useEffect(() => { const id = setTimeout(() => { setTerm(search); setPage(0); }, 250); return () => clearTimeout(id); }, [search]);
  const res = useApi<{ total: number; items: CustomerListItem[] }>(
    `/customers?search=${encodeURIComponent(term)}&segment=${segment}&sort=${sort}&limit=${PAGE}&offset=${page * PAGE}`);
  const pages = Math.max(1, Math.ceil((res.data?.total ?? 0) / PAGE));

  return (
    <AppShell>
      <PageHeader title="Pelanggan" description={res.data ? `${res.data.total} pelanggan terdaftar` : "Cari dan lihat riwayat pelanggan"}
        actions={<Button size="lg" onClick={() => setEnroll(true)}><UserPlus /> Daftarkan pelanggan</Button>} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama atau nomor HP" className="pl-10" aria-label="Cari pelanggan" />
        </div>
        <Segmented value={segment} onChange={(v) => { setSegment(v); setPage(0); }}
          options={[{ value: "", label: "Semua" }, { value: "VIP", label: "VIP" }, { value: "Regular", label: "Langganan" }, { value: "New", label: "Baru" }]} />
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Urutkan"
          className="h-11 rounded-lg border border-input bg-card px-3 text-sm lg:ml-auto">
          <option value="recent">Terakhir berkunjung</option>
          <option value="visits">Kunjungan terbanyak</option>
          <option value="name">Nama A–Z</option>
        </select>
      </div>

      {res.loading ? <ListSkeleton rows={8} />
        : res.error ? <ErrorState message={res.error} onRetry={res.reload} />
        : !res.data?.items.length ? (
          <EmptyState icon={Users} title={term || segment ? "Tidak ada pelanggan yang cocok" : "Belum ada pelanggan"}
            text={term || segment ? "Ubah kata kunci atau filter." : "Daftarkan pelanggan pertama dari halaman Kasir atau tombol di atas."}
            action={!term && !segment && <Button onClick={() => setEnroll(true)}><UserPlus /> Daftarkan pelanggan</Button>} />
        ) : (
          <>
            <ul className="divide-y rounded-xl border bg-card shadow-sm">
              {res.data.items.map((c) => (
                <li key={c.customer_id}>
                  <Link href={`/customers/${c.customer_id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted/60">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {c.name}
                        {c.has_face && <ScanFace className="h-4 w-4 shrink-0 text-success" aria-label="Wajah terdaftar" />}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{c.phone_number ?? "Tanpa no. HP"}</p>
                    </div>
                    <div className="hidden text-right text-sm sm:block">
                      <p className="num font-medium">{c.visit_count} kunjungan</p>
                      <p className="text-muted-foreground">terakhir {timeAgo(c.last_visit)}</p>
                    </div>
                    <SegmentBadge segment={c.segment} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Halaman">
                <Button variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 0}><ChevronLeft /> Sebelumnya</Button>
                <span className="num px-3 text-sm text-muted-foreground">{page + 1} / {pages}</span>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages}>Berikutnya <ChevronRight /></Button>
              </nav>
            )}
          </>
        )}

      <EnrollDialog open={enroll} onOpenChange={setEnroll} onDone={(id) => router.push(`/customers/${id}`)} />
    </AppShell>
  );
}
