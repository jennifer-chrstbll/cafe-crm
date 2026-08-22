"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanFace, Lock } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { RecognitionLog } from "@/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const PAGE_SIZE = 20;

/**
 * Halaman Log Pengenalan — hanya untuk Owner/Admin.
 *
 * Kasir tidak butuh log teknis ini sebagai menu utama — ini untuk debugging/audit.
 * Sesuai rekomendasi 4.2: "Recognition Logs sebagai tab sekunder, akses utama Owner/Admin."
 * 
 * Proteksi role: jika kasir entah bagaimana sampai ke halaman ini, 
 * ditampilkan pesan akses terbatas (bukan redirect paksa, karena kasir mungkin
 * perlu lihat untuk keperluan audit tertentu dengan izin owner).
 */
export default function RecognitionLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<RecognitionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRecognized, setFilterRecognized] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [filterRecognized]);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(page * PAGE_SIZE),
        });
        if (filterRecognized !== "all") {
          params.append("recognized", filterRecognized === "yes" ? "true" : "false");
        }
        const response = await api.get(`/recognition-logs?${params.toString()}`);
        const data = Array.isArray(response.data) ? response.data : [];
        setLogs(data);
        if (data.length === PAGE_SIZE) {
          setTotalCount(Math.max(totalCount, (page + 2) * PAGE_SIZE));
        } else {
          setTotalCount(page * PAGE_SIZE + data.length);
        }
      } catch (error) {
        console.error("Gagal mengambil log pengenalan:", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRecognized, page]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
              <ScanFace className="h-7 w-7" /> Log Pengenalan Wajah
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log teknis sistem face recognition — skor kecocokan, kamera, waktu deteksi.
            </p>
          </div>

          <Select value={filterRecognized} onValueChange={setFilterRecognized}>
            <SelectTrigger id="filter-recognition" className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Deteksi</SelectItem>
              <SelectItem value="yes">Hanya Dikenali</SelectItem>
              <SelectItem value="no">Hanya Tidak Dikenali</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Banner info untuk non-owner */}
        {!isOwner && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border border-border">
            <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Halaman ini berisi log teknis sistem. Untuk operasional harian, gunakan halaman{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-primary font-semibold"
                onClick={() => router.push("/live")}
              >
                Live Kamera
              </Button>{" "}
              atau{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-primary font-semibold"
                onClick={() => router.push("/visits")}
              >
                Kunjungan
              </Button>
              .
            </p>
          </div>
        )}

        {/* Tabel */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold whitespace-nowrap">Waktu</TableHead>
                <TableHead className="font-semibold">Pelanggan</TableHead>
                <TableHead className="font-semibold whitespace-nowrap">Skor Kecocokan</TableHead>
                <TableHead className="font-semibold">Kamera</TableHead>
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
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ScanFace className="h-8 w-8 opacity-30" />
                      <p>Tidak ada log pengenalan ditemukan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.log_id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm whitespace-nowrap font-mono">
                      {format(new Date(log.created_at), "dd MMM, HH:mm:ss", { locale: id })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.customer_name || (
                        <span className="text-muted-foreground italic">Tidak Dikenal</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.similarity_score !== null ? (
                        <span className={`font-mono text-sm font-semibold ${
                          log.similarity_score >= 0.7 ? "text-success" :
                          log.similarity_score >= 0.5 ? "text-warning" :
                          "text-destructive"
                        }`}>
                          {(log.similarity_score * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.camera_id || "Kamera Utama"}
                    </TableCell>
                    <TableCell>
                      {log.recognized ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs font-bold">
                          ✓ Dikenali
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                          ✗ Tidak Dikenali
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
