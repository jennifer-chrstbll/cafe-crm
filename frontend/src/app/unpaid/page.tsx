"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Clock,
  CreditCard,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import api from "@/services/api";
import { workflowService } from "@/services/workflowService";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Halaman /unpaid — Daftar Tagihan Belum Bayar
 *
 * Tujuan tunggal halaman ini: kasir melihat & memproses semua piutang stay-in.
 * Ini menyelesaikan masalah duplikasi data di Dashboard + POS + Live (8.3),
 * dan menerapkan "1 halaman 1 tujuan" (Hick's Law, Aesthetic & Minimalist Design Nielsen #8).
 *
 * Role: Kasir (owner redirect ke dashboard)
 */
export default function UnpaidPage() {
  const router = useRouter();
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchUnpaid = useCallback(async () => {
    try {
      const res = await api.get("/workflow/unpaid");
      setUnpaidOrders(Array.isArray(res.data) ? res.data : []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to fetch unpaid orders", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnpaid();

    // Supabase Realtime — update otomatis saat transaksi baru masuk
    const channel = supabase
      .channel("unpaid_orders_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchUnpaid()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnpaid]);

  const handlePelunasan = async (unpaid: any) => {
    setProcessingId(unpaid.customer_id);
    try {
      await workflowService.checkoutUnpaidOrder({
        customer_id: unpaid.customer_id,
        payment_method: "QRIS" as const,
      });
      // Refresh daftar setelah pelunasan
      await fetchUnpaid();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Pelunasan gagal. Coba lagi.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 pb-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
              <AlertCircle className="h-7 w-7 text-warning" />
              Tagihan Belum Dibayar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daftar pelanggan stay-in yang belum melunasi tagihan.
              {lastUpdated && (
                <span className="ml-1">
                  · Diperbarui {formatDistanceToNow(lastUpdated, { locale: id, addSuffix: true })}
                </span>
              )}
            </p>
          </div>
          <Button
            id="btn-refresh-unpaid"
            variant="outline"
            size="sm"
            onClick={fetchUnpaid}
            disabled={loading}
            className="gap-2 flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {/* Counter badge */}
        {!loading && (
          <div className="flex items-center gap-3">
            <Badge
              className={`text-sm px-3 py-1 font-bold ${
                unpaidOrders.length > 0
                  ? "bg-warning text-warning-foreground"
                  : "bg-success text-success-foreground"
              }`}
            >
              {unpaidOrders.length > 0
                ? `${unpaidOrders.length} tagihan aktif`
                : "Semua lunas ✓"}
            </Badge>
            {unpaidOrders.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Total:{" "}
                <span className="font-bold text-foreground">
                  Rp{" "}
                  {unpaidOrders
                    .reduce((sum, u) => sum + Number(u.total_amount || 0), 0)
                    .toLocaleString("id-ID")}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Kosong */}
        {!loading && unpaidOrders.length === 0 && (
          <Card className="border-2 border-success/20 bg-success/5">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <ShieldCheck className="h-14 w-14 text-success opacity-70" />
              <p className="font-bold text-lg text-success">Semua Tagihan Lunas!</p>
              <p className="text-sm text-muted-foreground">
                Tidak ada pelanggan stay-in yang memiliki tagihan aktif.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Daftar tagihan */}
        {!loading && unpaidOrders.length > 0 && (
          <div className="space-y-3">
            {unpaidOrders.map((unpaid, idx) => (
              <Card
                key={unpaid.customer_id || idx}
                id={`unpaid-card-${idx}`}
                className="border-2 border-warning/30 bg-warning/5 hover:border-warning/50 transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Info customer & pesanan */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg text-foreground">{unpaid.customer_name}</span>
                        <Badge variant="outline" className="border-warning/40 text-warning font-bold text-xs">
                          🛋️ Stay-in
                        </Badge>
                      </div>

                      {/* Daftar item */}
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        {unpaid.items?.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span>{it.menu_name} × {it.qty}</span>
                            <span className="font-medium text-foreground">
                              Rp {Number(it.subtotal).toLocaleString("id-ID")}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(unpaid.created_at), "HH:mm", { locale: id })}
                        </span>
                        <span className="font-bold text-warning text-sm">
                          Total: Rp {Number(unpaid.total_amount).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    {/* Tombol aksi */}
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Buka di POS — untuk kasus yang lebih kompleks */}
                      <Button
                        id={`btn-open-pos-${idx}`}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-warning/30 text-warning hover:bg-warning/10"
                        onClick={() => router.push(`/pos?customerId=${unpaid.customer_id}`)}
                        title="Buka di POS untuk menambah/mengubah pesanan"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Buka POS</span>
                      </Button>

                      {/* Pelunasan langsung */}
                      <Button
                        id={`btn-pelunasan-${idx}`}
                        size="sm"
                        className="bg-warning hover:bg-warning/90 text-warning-foreground font-bold gap-1.5 shadow-sm"
                        onClick={() => handlePelunasan(unpaid)}
                        disabled={processingId === unpaid.customer_id}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        {processingId === unpaid.customer_id ? "Memproses..." : "💳 Lunaskan"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
