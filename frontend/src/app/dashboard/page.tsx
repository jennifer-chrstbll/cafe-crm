"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserPlus,
  ShoppingBag,
  ArrowRight,
  Camera,
  Sparkles,
  Layers,
  Flame,
  CreditCard,
  ShieldCheck,
  Building2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────
// Komponen: Dashboard Kasir
// Fokus: apa yang kasir butuhkan sekarang (operasional real-time)
// Tidak menampilkan data finansial sensitif (prinsip least privilege)
// ─────────────────────────────────────────────
function CashierDashboard({ data, unpaidCount }: { data: any; unpaidCount: number }) {
  const router = useRouter();
  const { user } = useAuth();

  const floor1Max = 20;
  const floor2Max = 25;
  const floor1Count = data?.floor1_count || 0;
  const floor2Count = data?.floor2_count || 0;
  const floor1Percent = Math.min(Math.round((floor1Count / floor1Max) * 100), 100);
  const floor2Percent = Math.min(Math.round((floor2Count / floor2Max) * 100), 100);

  const getOccupancyStatus = (percent: number) => {
    if (percent >= 100) return { label: "PENUH", color: "text-destructive", bg: "bg-destructive", barColor: "bg-destructive" };
    if (percent >= 75) return { label: "Hampir Penuh", color: "text-warning", bg: "bg-warning", barColor: "bg-warning" };
    return { label: "Tersedia", color: "text-success", bg: "bg-success", barColor: "bg-success" };
  };

  const floor1Status = getOccupancyStatus(floor1Percent);
  const floor2Status = getOccupancyStatus(floor2Percent);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Header selamat datang ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-accent/10 to-background p-5 rounded-2xl border border-primary/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
            </span>
            <span className="text-xs font-bold text-success uppercase tracking-wider">
              Sistem Aktif
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            Selamat datang, {user?.name?.split(" ")[0] || "Kasir"}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Status kafe hari ini — {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            id="btn-buka-pos"
            size="lg"
            className="bg-primary hover:bg-primary/90 font-bold shadow-md gap-2"
            onClick={() => router.push("/pos")}
          >
            <CreditCard className="h-5 w-5" /> Buka POS
          </Button>
          <Button
            id="btn-live-kamera"
            variant="outline"
            size="lg"
            className="border-primary/30 font-semibold gap-2"
            onClick={() => router.push("/live")}
          >
            <Camera className="h-5 w-5 text-primary" /> Live
          </Button>
        </div>
      </div>

      {/* ── Widget Tagihan Belum Bayar (Badge + CTA) ── */}
      {/* 
        Sesuai rekomendasi 4.1: Dashboard hanya tampilkan badge angka + link ke /unpaid.
        Daftar penuh ada di halaman /unpaid — ini menghilangkan duplikasi fetch 
        dan menerapkan "1 halaman 1 tujuan" (Nielsen #8, Aesthetic & Minimalist Design).
      */}
      <Card
        id="card-unpaid-summary"
        className={`border-2 cursor-pointer transition-all hover:shadow-md ${
          unpaidCount > 0
            ? "border-warning/40 bg-warning/5 hover:border-warning/60"
            : "border-success/20 bg-success/5"
        }`}
        onClick={() => unpaidCount > 0 && router.push("/unpaid")}
      >
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              unpaidCount > 0 ? "bg-warning/20" : "bg-success/20"
            }`}>
              {unpaidCount > 0
                ? <AlertCircle className="h-5 w-5 text-warning" />
                : <ShieldCheck className="h-5 w-5 text-success" />
              }
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">
                {unpaidCount > 0 ? `${unpaidCount} Tagihan Belum Lunas` : "Semua Tagihan Lunas ✓"}
              </p>
              <p className="text-xs text-muted-foreground">
                {unpaidCount > 0 ? "Klik untuk lihat & proses pelunasan" : "Tidak ada tagihan Stay-in aktif"}
              </p>
            </div>
          </div>
          {unpaidCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge className="bg-warning text-warning-foreground font-bold text-sm px-2.5">
                {unpaidCount}
              </Badge>
              <ArrowRight className="h-4 w-4 text-warning" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Okupansi Real-time per Lantai ── */}
      {/*
        Widget kecil sesuai rekomendasi 4.4: kasir butuh at-a-glance status,
        bukan halaman terpisah. Warna status merah/kuning/hijau sesuai konvensi
        dunia nyata (Nielsen #2 Match real world).
      */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Kondisi Kafe Saat Ini
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total keseluruhan */}
          <Card className="border border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black text-primary">{data?.active_occupancy || 0}</p>
                <p className="text-xs text-muted-foreground">Orang di Dalam</p>
              </div>
            </CardContent>
          </Card>

          {/* Lantai 1 */}
          <Card className="border border-border bg-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Lantai 1</span>
                </div>
                <span className={`text-xs font-bold ${floor1Status.color}`}>
                  {floor1Count}/{floor1Max} · {floor1Status.label}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${floor1Status.barColor}`}
                  style={{ width: `${floor1Percent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lantai 2 */}
          <Card className="border border-border bg-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Lantai 2</span>
                </div>
                <span className={`text-xs font-bold ${floor2Status.color}`}>
                  {floor2Count}/{floor2Max} · {floor2Status.label}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${floor2Status.barColor}`}
                  style={{ width: `${floor2Percent}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Statistik Kunjungan Hari Ini ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <UserCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600">{data?.today_visits || 0}</div>
              <p className="text-[11px] text-muted-foreground">Kunjungan Hari Ini</p>
              <p className="text-[10px] text-muted-foreground">
                {data?.recognized_today || 0} dikenali · {data?.unknown_today || 0} baru
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-purple-600">+{data?.new_customers_today || 0}</div>
              <p className="text-[11px] text-muted-foreground">Pelanggan Baru</p>
              <p className="text-[10px] text-muted-foreground">Terdaftar hari ini</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Menu Cepat Kasir ── */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4 text-accent" /> Akses Cepat
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { id: "shortcut-pos", label: "Kasir (POS)", desc: "Catat transaksi baru", href: "/pos", icon: "💳", bg: "bg-primary/5 hover:bg-primary/10 border-primary/20" },
            { id: "shortcut-live", label: "Live Kamera", desc: "Streaming Face Recognition", href: "/live", icon: "🎥", bg: "bg-success/5 hover:bg-success/10 border-success/20" },
            { id: "shortcut-customers", label: "Pelanggan", desc: "Cari & lihat profil", href: "/customers", icon: "👥", bg: "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20" },
          ].map((tile) => (
            <button
              id={tile.id}
              key={tile.href}
              onClick={() => router.push(tile.href)}
              className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-between min-h-[100px] ${tile.bg}`}
            >
              <div className="text-2xl mb-2">{tile.icon}</div>
              <div>
                <div className="font-bold text-sm text-foreground flex items-center justify-between">
                  <span>{tile.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{tile.desc}</div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Komponen: Dashboard Owner
// Fokus: ringkasan bisnis & insight — bukan operasional kasir
// ─────────────────────────────────────────────
function OwnerDashboard({ data }: { data: any }) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-accent/10 to-background p-5 rounded-2xl border border-primary/20 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            Laporan Bisnis 📊
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Halo {user?.name?.split(" ")[0]}! Ini ringkasan kafe hari ini.
          </p>
        </div>
        <Button
          id="btn-analytics-lengkap"
          variant="outline"
          className="border-primary/30 font-semibold gap-2"
          onClick={() => router.push("/analytics")}
        >
          <BarChart3 className="h-4 w-4" /> Laporan Lengkap
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Pendapatan Hari Ini</p>
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
            </div>
            <div className="text-xl font-bold text-success">
              Rp {Number(data?.today_revenue || 0).toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Total omset hari ini</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total Pesanan</p>
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-warning" />
              </div>
            </div>
            <div className="text-xl font-bold text-warning">{data?.total_orders || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Item dipesan hari ini</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Kunjungan</p>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-xl font-bold text-blue-600">{data?.today_visits || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {data?.recognized_today || 0} dikenali · {data?.unknown_today || 0} baru
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Customer Baru</p>
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="text-xl font-bold text-purple-600">+{data?.new_customers_today || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Terdaftar hari ini</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Sellers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Flame className="h-4 w-4 text-orange-500" /> Top Menu Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.top_sellers || data.top_sellers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Belum ada transaksi hari ini.
              </div>
            ) : (
              <div className="space-y-2">
                {data.top_sellers.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center font-black text-xs ${
                        idx === 0 ? "bg-amber-400 text-amber-950" :
                        idx === 1 ? "bg-slate-300 text-slate-900" :
                        "bg-amber-700/20 text-amber-700"
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-primary">{item.qty}x</div>
                      <div className="text-xs text-muted-foreground">
                        Rp {Number(item.total).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Akses Cepat Owner */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4 text-accent" /> Akses Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { id: "owner-shortcut-analytics", label: "Analytics", href: "/analytics", icon: "📈", desc: "Tren & laporan" },
              { id: "owner-shortcut-customers", label: "Pelanggan", href: "/customers", icon: "👥", desc: "Kelola profil" },
              { id: "owner-shortcut-menus", label: "Menu Kafe", href: "/menus", icon: "☕", desc: "Harga & kategori" },
              { id: "owner-shortcut-settings", label: "Pengaturan", href: "/settings", icon: "⚙️", desc: "User & kamera" },
            ].map((tile) => (
              <button
                id={tile.id}
                key={tile.href}
                onClick={() => router.push(tile.href)}
                className="p-3 rounded-xl border border-border bg-card text-left transition-all hover:bg-accent/10 hover:border-accent/30 hover:scale-[1.02] active:scale-95"
              >
                <div className="text-xl mb-1">{tile.icon}</div>
                <div className="font-bold text-sm text-foreground">{tile.label}</div>
                <div className="text-xs text-muted-foreground">{tile.desc}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Halaman Utama Dashboard
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const fetchDashboardData = async () => {
    try {
      // Kasir: fetch dashboard + unpaid count
      // Owner: fetch dashboard saja (cukup untuk KPI)
      if (isOwner) {
        const dashRes = await api.get("/analytics/dashboard");
        setData(dashRes.data);
      } else {
        const [dashRes, unpaidRes] = await Promise.all([
          api.get("/analytics/dashboard"),
          api.get("/workflow/unpaid"),
        ]);
        setData(dashRes.data);
        setUnpaidCount(Array.isArray(unpaidRes.data) ? unpaidRes.data.length : 0);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Polling setiap 10 detik untuk update occupancy dan unpaid count
    const interval = setInterval(fetchDashboardData, 10_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {isOwner
        ? <OwnerDashboard data={data} />
        : <CashierDashboard data={data} unpaidCount={unpaidCount} />
      }
    </DashboardLayout>
  );
}
