"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, UserCheck } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import api from "@/services/api";
import { Visit } from "@/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const PAGE_SIZE = 20; // Sesuai Miller's Law — 20 baris bisa di-scan tanpa overload

/**
 * Halaman Kunjungan — Riwayat kunjungan pelanggan.
 *
 * Menggunakan pagination server-side (limit/offset) karena:
 * - Log kunjungan tumbuh seiring waktu, tidak cocok di-load semua sekaligus
 * - Pagination memberikan "posisi stabil" untuk audit (beda dengan infinite scroll)
 *   Reference: feedback 4.5 — pagination lebih cocok untuk lookup/audit data terstruktur
 */
export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("today");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setPage(0); // Reset ke halaman 1 saat filter berubah
  }, [filter]);

  useEffect(() => {
    async function fetchVisits() {
      setLoading(true);
      try {
        const response = await api.get(
          `/visits?filter=${filter}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
        );
        const data = Array.isArray(response.data) ? response.data : [];
        setVisits(data);
        // Estimasi total: jika data penuh, ada kemungkinan halaman berikutnya
        // Backend kita mengembalikan limit+1 trick atau kita set dari header — 
        // untuk saat ini gunakan heuristik: kalau dapat PAGE_SIZE data, set count ke min (page+2)*PAGE_SIZE
        if (data.length === PAGE_SIZE) {
          setTotalCount(Math.max(totalCount, (page + 2) * PAGE_SIZE));
        } else {
          setTotalCount(page * PAGE_SIZE + data.length);
        }
      } catch (error) {
        console.error("Gagal mengambil data kunjungan:", error);
        setVisits([]);
      } finally {
        setLoading(false);
      }
    }
    fetchVisits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const getDurationLabel = (minutes: number | null) => {
    if (!minutes) return "Aktif";
    if (minutes < 60) return `${minutes} menit`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
              <Clock className="h-7 w-7" /> Kunjungan
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Riwayat kunjungan pelanggan yang terdeteksi kamera.
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger id="filter-kunjungan" className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabel */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Pelanggan</TableHead>
                <TableHead className="font-semibold whitespace-nowrap">Waktu Masuk</TableHead>
                <TableHead className="font-semibold whitespace-nowrap">Waktu Keluar</TableHead>
                <TableHead className="font-semibold">Durasi</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <UserCheck className="h-8 w-8 opacity-30" />
                      <p>Tidak ada kunjungan untuk periode ini.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow key={visit.visit_id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold">{visit.customer_name}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(visit.entry_time), "dd MMM yyyy, HH:mm", { locale: id })}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {visit.exit_time
                        ? format(new Date(visit.exit_time), "dd MMM yyyy, HH:mm", { locale: id })
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{getDurationLabel(visit.duration_minutes)}</TableCell>
                    <TableCell>
                      {visit.exit_time ? (
                        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs">
                          Selesai
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs font-bold">
                          ● Aktif
                        </Badge>
                      )}
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
