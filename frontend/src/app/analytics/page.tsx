"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { ProductAnalytics, CustomerSegment } from "@/types";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const SEGMENT_COLORS: Record<string, string> = { VIP: "#D4A373", Regular: "#8B5E3C", New: "#5C3D2E" };
const SEGMENT_EMOJI: Record<string, string> = { VIP: "👑", Regular: "⭐", New: "🌱" };

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [visitTrend, setVisitTrend] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [returningRate, setReturningRate] = useState<any>(null);
  const [accuracy, setAccuracy] = useState<any>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && user?.role !== "OWNER") router.push("/dashboard");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role !== "OWNER") return;
    async function fetchData() {
      try {
        const [visitsRes, topRes, peakRes, retRes, accRes, prodRes, segRes] = await Promise.all([
          api.get("/analytics/visit-trend"),
          api.get("/analytics/top-customers"),
          api.get("/analytics/peak-hours"),
          api.get("/analytics/returning-rate"),
          api.get("/analytics/recognition-accuracy"),
          api.get("/analytics/product-analytics"),
          api.get("/analytics/customer-segments"),
        ]);
        setVisitTrend(visitsRes.data);
        setTopCustomers(topRes.data);
        setPeakHours(peakRes.data);
        setReturningRate(retRes.data);
        setAccuracy(accRes.data);
        setProductAnalytics(prodRes.data);
        setSegments(segRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (user?.role !== "OWNER") return null;

  const top8 = productAnalytics.slice(0, 8);
  const recognitionData = accuracy ? [{ name: "Dikenali", value: accuracy.known }, { name: "Tidak Dikenali", value: accuracy.unknown }] : [];
  const returningData = returningRate ? [{ name: "Returning", value: returningRate.returning }, { name: "Baru", value: returningRate.new_customers }] : [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Analytics</h1>
          <p className="text-muted-foreground mt-1">Laporan bisnis komprehensif untuk owner.</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Row 1 */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Tren Kunjungan</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visitTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="visits" stroke="#5C3D2E" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Peak Hours</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHours}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="hour" stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}:00`} />
                      <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="visits" fill="#8B5E3C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Row 2 */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Top Customers</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCustomers} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="customer_name" type="category" stroke="#888" fontSize={11} tickLine={false} axisLine={false} width={80} />
                      <Tooltip />
                      <Bar dataKey="visit_count" fill="#D4A373" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Customer Segmentation</CardTitle></CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <div className="flex gap-6 items-center w-full">
                    <div className="w-1/2 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={segments} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="count">
                            {segments.map((entry) => (
                              <Cell key={entry.segment} fill={SEGMENT_COLORS[entry.segment] || "#888"} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {segments.map(seg => (
                        <div key={seg.segment} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[seg.segment] }} />
                          <span className="text-sm">{SEGMENT_EMOJI[seg.segment]} {seg.segment}</span>
                          <span className="ml-auto font-bold">{seg.count}</span>
                        </div>
                      ))}
                      <div className="text-xs text-muted-foreground pt-1 border-t">VIP ≥15 · Regular 5–14 · New &lt;5</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 3 — Product Analytics */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Most Ordered (Qty)</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top8} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="menu_name" type="category" stroke="#888" fontSize={11} tickLine={false} axisLine={false} width={90} />
                      <Tooltip />
                      <Bar dataKey="total_qty" fill="#5C3D2E" radius={[0, 4, 4, 0]} name="Qty" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Revenue per Produk</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top8} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="menu_name" type="category" stroke="#888" fontSize={11} tickLine={false} axisLine={false} width={90} />
                      <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString("id-ID")}`, "Revenue"]} />
                      <Bar dataKey="total_revenue" fill="#D4A373" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Row 4 — Recognition */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Recognition Accuracy</CardTitle></CardHeader>
                <CardContent className="h-56 flex items-center">
                  <div className="flex gap-6 items-center w-full">
                    <div className="w-1/2 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={recognitionData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                            <Cell fill="#4CAF50" />
                            <Cell fill="#E53935" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {recognitionData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: i === 0 ? "#4CAF50" : "#E53935" }} />
                          <span className="text-sm">{d.name}</span>
                          <span className="ml-auto font-bold">{d.value}</span>
                        </div>
                      ))}
                      {accuracy && <div className="text-xs text-muted-foreground pt-1 border-t">Accuracy: {accuracy.known_percent}%</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Returning vs New Customer</CardTitle></CardHeader>
                <CardContent className="h-56 flex items-center">
                  <div className="flex gap-6 items-center w-full">
                    <div className="w-1/2 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={returningData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                            <Cell fill="#5C3D2E" />
                            <Cell fill="#D4A373" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {returningData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: i === 0 ? "#5C3D2E" : "#D4A373" }} />
                          <span className="text-sm">{d.name}</span>
                          <span className="ml-auto font-bold">{d.value}</span>
                        </div>
                      ))}
                      {returningRate && <div className="text-xs text-muted-foreground pt-1 border-t">Returning rate: {returningRate.returning_percent}%</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
