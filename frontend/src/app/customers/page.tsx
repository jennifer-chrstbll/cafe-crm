"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Users } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CustomerAvatar } from "@/components/ui/customer-avatar";
import api from "@/services/api";
import { Customer } from "@/types";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 20;

// Warna segment — sesuai konvensi brand (konsisten di seluruh aplikasi)
const SEGMENT_STYLE: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 border-amber-300",
  Regular: "bg-blue-100 text-blue-800 border-blue-300",
  New: "bg-green-100 text-green-800 border-green-300",
};

const SEGMENT_EMOJI: Record<string, string> = {
  VIP: "👑",
  Regular: "⭐",
  New: "🌱",
};

/**
 * Halaman Pelanggan — Daftar & pencarian pelanggan terdaftar.
 *
 * Pagination client-side karena:
 * - Jumlah pelanggan biasanya tidak sebesar log (bisa ratusan, bukan ribuan)
 * - Search/filter real-time lebih smooth dengan data di memory
 * - Tidak perlu endpoint baru di backend
 *
 * Sesuai rekomendasi: jika pelanggan tumbuh > 500, pertimbangkan server-side.
 */
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await api.get("/customers");
        setCustomers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Gagal mengambil data pelanggan:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  // Reset ke halaman 1 saat search berubah
  useEffect(() => {
    setPage(0);
  }, [search]);

  // Filter berdasarkan search
  const filtered = useMemo(() =>
    customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone_number && c.phone_number.includes(search))
    ),
    [customers, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
              <Users className="h-7 w-7" /> Pelanggan
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Memuat..." : `${customers.length} pelanggan terdaftar`}
              {search && ` · ${filtered.length} hasil pencarian`}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search-pelanggan"
              placeholder="Cari nama, email, atau nomor HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Cari pelanggan"
            />
          </div>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="text-muted-foreground"
            >
              Hapus
            </Button>
          )}
        </div>

        {/* Tabel */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Nama</TableHead>
                <TableHead className="font-semibold">Kontak</TableHead>
                <TableHead className="font-semibold whitespace-nowrap">Kunjungan</TableHead>
                <TableHead className="font-semibold">Segmen</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 opacity-30" />
                      <p>
                        {search
                          ? `Tidak ada pelanggan yang cocok dengan "${search}".`
                          : "Belum ada pelanggan terdaftar."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((customer) => (
                  <TableRow key={customer.customer_id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <CustomerAvatar
                          name={customer.name}
                          size="sm"
                          showBadge={false}
                        />
                        <span className="font-semibold">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        <div className="text-foreground">{customer.email || "—"}</div>
                        <div className="text-muted-foreground text-xs">{customer.phone_number || "—"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-foreground">{customer.visit_count || 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">kali</span>
                    </TableCell>
                    <TableCell>
                      {customer.segment ? (
                        <Badge variant="outline" className={`text-xs ${SEGMENT_STYLE[customer.segment] || ""}`}>
                          {SEGMENT_EMOJI[customer.segment]} {customer.segment}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.is_active ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-bold text-xs">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        id={`btn-lihat-customer-${customer.customer_id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/customers/${customer.customer_id}`)}
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4" /> Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          isLoading={loading}
        />
      </div>
    </DashboardLayout>
  );
}
