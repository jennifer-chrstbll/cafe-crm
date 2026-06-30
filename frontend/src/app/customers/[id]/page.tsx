"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Phone, Mail, Calendar, ShoppingBag } from "lucide-react";
import api from "@/services/api";
import { Visit, CustomerOrder } from "@/types";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";

const SEGMENT_STYLES: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 border-amber-300",
  Regular: "bg-blue-100 text-blue-800 border-blue-300",
  New: "bg-green-100 text-green-800 border-green-300",
};

const SEGMENT_EMOJI: Record<string, string> = {
  VIP: "👑",
  Regular: "⭐",
  New: "🌱",
};

export default function CustomerDetailPage() {
  const [customer, setCustomer] = useState<any>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    async function fetchCustomerData() {
      try {
        const [customerRes, visitsRes, ordersRes] = await Promise.all([
          api.get(`/customers/${id}`),
          api.get(`/customers/${id}/visits`),
          api.get(`/customers/${id}/orders`),
        ]);
        setCustomer(customerRes.data);
        setVisits(visitsRes.data);
        setOrders(ordersRes.data);
      } catch (error) {
        console.error("Failed to fetch customer detail", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomerData();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center animate-pulse text-primary">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="text-destructive">Customer not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Profil Customer</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-col items-center pb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-4">
                <User className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-center">{customer.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                {customer.segment && (
                  <Badge variant="outline" className={SEGMENT_STYLES[customer.segment]}>
                    {SEGMENT_EMOJI[customer.segment]} {customer.segment}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {customer.visit_count} Kunjungan
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{customer.phone_number || "Tidak ada nomor HP"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{customer.email || "Tidak ada email"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Gender: {customer.gender || "Tidak diketahui"}</span>
              </div>
              {customer.segment && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <strong>Segmen {customer.segment}:</strong>{" "}
                  {customer.segment === "VIP" && "Pelanggan setia dengan 15+ kunjungan. Berikan pelayanan terbaik!"}
                  {customer.segment === "Regular" && "Pelanggan aktif dengan 5–14 kunjungan."}
                  {customer.segment === "New" && "Pelanggan baru dengan kurang dari 5 kunjungan."}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Visits + Orders */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> Riwayat Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 text-sm">
                    Belum ada order yang tercatat.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order.visit_id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-medium text-muted-foreground">
                            {format(new Date(order.entry_time), "dd MMMM yyyy, HH:mm")}
                          </div>
                          <div className="font-bold text-primary text-sm">
                            Rp {Number(order.total).toLocaleString("id-ID")}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.menu_name} x{item.qty}</span>
                              <span className="text-muted-foreground">
                                Rp {Number(item.subtotal).toLocaleString("id-ID")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visit History */}
            <Card>
              <CardHeader><CardTitle>Riwayat Kunjungan</CardTitle></CardHeader>
              <CardContent>
                {visits.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 text-sm">Belum ada kunjungan.</div>
                ) : (
                  <div className="space-y-3">
                    {visits.slice(0, 6).map(visit => (
                      <div key={visit.visit_id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                        <div>
                          <div className="text-sm font-medium">
                            {format(new Date(visit.entry_time), "dd MMMM yyyy, HH:mm")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Durasi: {visit.duration_minutes ? `${visit.duration_minutes} menit` : "Sedang berlangsung"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
