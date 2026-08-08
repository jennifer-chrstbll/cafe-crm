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
  Clock,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Camera,
  Sparkles,
  Layers,
  Flame,
  CreditCard,
  Plus,
  RefreshCw,
  ShieldCheck,
  Building2,
  DollarSign,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const isOwner = user?.role === "OWNER";

  const fetchDashboardData = async () => {
    try {
      const [dashRes, unpaidRes, logsRes] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/workflow/unpaid"),
        api.get("/recognition-logs?limit=5"),
      ]);
      setData(dashRes.data);
      setUnpaidOrders(unpaidRes.data);
      setRecentLogs(logsRes.data);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const floor1Max = 20;
  const floor2Max = 25;
  const floor1Percent = Math.min(Math.round(((data?.floor1_count || 0) / floor1Max) * 100), 100);
  const floor2Percent = Math.min(Math.round(((data?.floor2_count || 0) / floor2Max) * 100), 100);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 pb-8">
        {/* Header & Quick Action Hub */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-accent/10 to-background p-6 rounded-2xl border border-primary/20 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                System Operational · CCTV Sync Live
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">
              Selamat datang, {user?.name || "Kasir"}! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ringkasan real-time aktivitas pengunjung, okupansi lantai, & transaksi kafe hari ini.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 font-bold shadow-md gap-2"
              onClick={() => router.push("/pos")}
            >
              <CreditCard className="h-5 w-5" /> Buka POS
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary/30 font-semibold gap-2"
              onClick={() => router.push("/live")}
            >
              <Camera className="h-5 w-5 text-primary" /> Live CCTV
            </Button>
          </div>
        </div>

        {/* SECTION 1: REALTIME PERSON TRACKING & OCCUPANCY DENSITY */}
        <div>
          <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" /> Real-time Occupancy & Person Tracking
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Live Occupancy */}
            <Card className="border-2 border-primary/20 bg-card shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Di Dalam Kafe
                </CardTitle>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-primary">{data?.active_occupancy || 0}</span>
                  <span className="text-sm font-medium text-muted-foreground">Orang Aktif</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Terdeteksi dari kamera CCTV
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Lantai 1 Occupancy */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-500" /> Lantai 1 (Bar & Counter)
                </CardTitle>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-xs">
                  {data?.floor1_count || 0} / {floor1Max}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Kepadatan Area</span>
                  <span className="font-bold text-blue-600">{floor1Percent}%</span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${floor1Percent}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Lantai 2 Occupancy */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-500" /> Lantai 2 (Outdoor & Lounge)
                </CardTitle>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold text-xs">
                  {data?.floor2_count || 0} / {floor2Max}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Kepadatan Area</span>
                  <span className="font-bold text-purple-600">{floor2Percent}%</span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${floor2Percent}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 2: OPERATIONAL & FINANCIAL KPI STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pendapatan Hari Ini</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                Rp {Number(data?.today_revenue || 0).toLocaleString("id-ID")}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Total omset penjualan hari ini
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Hari Ini Pesanan</CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{data?.total_orders || 0}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Total item dipesan
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Kunjungan Hari Ini</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data?.today_visits || 0}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {data?.recognized_today || 0} Dikenali · {data?.unknown_today || 0} Unknown
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Customer Baru</CardTitle>
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">+{data?.new_customers_today || 0}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Terdaftar hari ini via CCTV/POS
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 3: TOP SELLING & UNPAID STAY-IN TABS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Sellers Today Card */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <Flame className="h-5 w-5 text-orange-500" /> Top Seller Hari Ini
              </CardTitle>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold text-xs">
                HOT MENU
              </Badge>
            </CardHeader>
            <CardContent>
              {!data?.top_sellers || data.top_sellers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Belum ada transaksi hari ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.top_sellers.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0 ? "bg-amber-400 text-amber-950" :
                          idx === 1 ? "bg-slate-300 text-slate-900" :
                          "bg-amber-700/20 text-amber-700"
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-primary">{item.qty}x Dipesan</div>
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

          {/* Active Unpaid Stay-in Tabs Quick Action Card */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                🛋️ Tagihan Stay-in Belum Dibayar ({unpaidOrders.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary font-bold"
                onClick={() => router.push("/pos")}
              >
                Buka POS <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {unpaidOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2 opacity-70" />
                  <p>Semua tagihan stay-in telah lunas!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unpaidOrders.slice(0, 3).map((unpaid: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div>
                        <div className="font-bold text-sm text-foreground">{unpaid.customer_name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {unpaid.items.map((it: any) => `${it.menu_name} x${it.qty}`).join(", ")}
                        </div>
                        <div className="text-xs font-bold text-amber-600 mt-0.5">
                          Total: Rp {Number(unpaid.total_amount).toLocaleString("id-ID")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        onClick={() => router.push(`/pos?customerId=${unpaid.customer_id}`)}
                      >
                        💳 Pelunasan
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECTION 4: QUICK MENU SHORTCUT HUB */}
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 text-accent" /> Menu Pintas & Kontrol Kasir
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Buka POS (Kasir)", desc: "Catat transaksi & pelunasan", href: "/pos", icon: "💳", bg: "bg-primary/5 hover:bg-primary/10 border-primary/20" },
              { label: "Live CCTV Camera", desc: "Streaming AI Face Recognition", href: "/live", icon: "🎥", bg: "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20" },
              { label: "Daftar Customer", desc: "Kelola profil & riwayat", href: "/customers", icon: "👥", bg: "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20" },
              { label: "Daftar Menu Kafe", desc: "Kelola harga & kategori", href: "/menus", icon: "☕", bg: "bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/20" },
            ].map((tile) => (
              <button
                key={tile.href}
                onClick={() => router.push(tile.href)}
                className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${tile.bg}`}
              >
                <div className="text-2xl mb-2">{tile.icon}</div>
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center justify-between">
                    <span>{tile.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tile.desc}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
