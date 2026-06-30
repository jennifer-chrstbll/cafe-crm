"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, ShoppingBag, TrendingUp, ArrowRight } from "lucide-react";
import api from "@/services/api";
import { DashboardSummary, RecognitionLog } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [visitTrend, setVisitTrend] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecognitionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const isOwner = user?.role === "OWNER";

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, logsRes] = await Promise.all([
          api.get("/analytics/dashboard-summary"),
          api.get("/recognition-logs?limit=5"),
        ]);
        setSummary(summaryRes.data);
        setRecentLogs(logsRes.data);

        if (isOwner) {
          const trendRes = await api.get("/analytics/visit-trend");
          setVisitTrend(trendRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isOwner]);

  const statsCards = summary
    ? [
        { title: "Total Customers", value: summary.total_customers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
        { title: "Today's Visits", value: summary.today_visits, icon: Clock, color: "text-secondary", bg: "bg-secondary/10" },
        { title: "Recognized Today", value: summary.recognized_today, icon: UserCheck, color: "text-success", bg: "bg-success/10" },
        { title: "Unknown Today", value: summary.unknown_today, icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
        ...(isOwner
          ? [
              { title: "Total Orders", value: summary.total_orders, icon: ShoppingBag, color: "text-accent", bg: "bg-accent/20" },
              { title: "Total Revenue", value: `Rp ${Number(summary.total_revenue).toLocaleString("id-ID")}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
            ]
          : []),
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Selamat datang, <span className="font-semibold">{user?.name}</span>.{" "}
              {isOwner ? "Inilah ringkasan bisnis cafe Anda." : "Ini aktivitas hari ini."}
            </p>
          </div>
          {!isOwner && (
            <button
              onClick={() => router.push("/pos")}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" /> Buka POS
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Card key={i} className="animate-pulse bg-muted h-28" />)}
          </div>
        ) : (
          <div className={`grid gap-4 ${isOwner ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-2 lg:grid-cols-4"}`}>
            {statsCards.map((card) => (
              <Card key={card.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={`h-8 w-8 rounded-full ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Recognition Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Aktivitas Terkini</CardTitle>
              <button onClick={() => router.push("/recognition-logs")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                Lihat semua <ArrowRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Belum ada aktivitas.</div>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log) => (
                    <div key={log.log_id} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${log.recognized ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {log.recognized ? "✓" : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{log.customer_name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm - dd MMM")}
                          {log.similarity_score && ` · Score: ${log.similarity_score.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit Trend (owner) or Quick Actions (kasir) */}
          {isOwner ? (
            <Card>
              <CardHeader><CardTitle>Tren Kunjungan</CardTitle></CardHeader>
              <CardContent className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="visits" stroke="#5C3D2E" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Menu Cepat</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Buka POS — Catat Transaksi", href: "/pos", icon: "💳" },
                  { label: "Daftar Customer", href: "/customers", icon: "👥" },
                  { label: "Riwayat Kunjungan", href: "/visits", icon: "📋" },
                  { label: "Log Rekognisi", href: "/recognition-logs", icon: "🔍" },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left text-sm hover:bg-accent/10 hover:border-accent transition-all"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
