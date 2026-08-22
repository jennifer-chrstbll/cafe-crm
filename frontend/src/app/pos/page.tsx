"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Search, Trash2, Plus, Minus, CheckCircle2, X, ChevronDown, ChevronUp, Clock } from "lucide-react";
import api from "@/services/api";
import { recommendationService, RecommendationResponse } from "@/services/recommendationService";
import { workflowService } from "@/services/workflowService";
import { Menu, Customer, CartItem } from "@/types";
import { format } from "date-fns";

const CATEGORY_ORDER = ["COFFEE", "NON_COFFEE", "FOOD", "DESSERT"];
const CATEGORY_LABELS: Record<string, string> = {
  COFFEE: "☕ Coffee",
  NON_COFFEE: "🧋 Non Coffee",
  FOOD: "🥪 Food",
  DESSERT: "🍰 Dessert",
};

const SEGMENT_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 border-amber-300",
  Regular: "bg-blue-100 text-blue-800 border-blue-300",
  New: "bg-green-100 text-green-800 border-green-300",
};

const PAYMENT_METHODS = [
  { value: "cash", label: "💵 Cash" },
  { value: "qris", label: "📱 QRIS" },
  { value: "debit_card", label: "💳 Kartu Debit" },
  { value: "credit_card", label: "💳 Kartu Kredit" },
  { value: "e_wallet", label: "👛 E-Wallet" },
];

function POSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [recommendationsData, setRecommendationsData] = useState<RecommendationResponse | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("COFFEE");
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [orderType, setOrderType] = useState<"pay_now" | "pay_later">("pay_now");
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([]);

  const fetchUnpaidOrders = async () => {
    try {
      const res = await api.get("/workflow/unpaid");
      setUnpaidOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setUnpaidOrders([]);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [menusRes, customersRes] = await Promise.all([
          api.get("/menus"),
          api.get("/customers"),
        ]);
        setMenus(menusRes.data);
        
        const loadedCustomers = customersRes.data;
        setCustomers(loadedCustomers);
        
        // Auto-select customer if preselectedCustomerId is provided in URL
        if (preselectedCustomerId) {
          const found = loadedCustomers.find((c: Customer) => c.customer_id === preselectedCustomerId);
          if (found) setSelectedCustomer(found);
        }

        fetchUnpaidOrders();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [preselectedCustomerId]);

  const handleCheckoutUnpaid = async (unpaidItem: any) => {
    setCheckoutLoading(true);
    try {
      const res = await workflowService.checkoutUnpaidOrder({
        customer_id: unpaidItem.customer_id,
        payment_method: (paymentMethod.toUpperCase() as any) || "QRIS",
      });
      setSuccess({
        customer_name: unpaidItem.customer_name,
        total: res.total_amount || unpaidItem.total_amount,
        items: unpaidItem.items,
      });
      fetchUnpaidOrders();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Pelunasan gagal");
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      api.get(`/customers/${selectedCustomer.customer_id}`).then(res => {
        setCustomerDetail(res.data);
      }).catch(() => setCustomerDetail(null));

      recommendationService.getPersonalizedRecommendations(selectedCustomer.customer_id)
        .then(res => setRecommendationsData(res))
        .catch(() => setRecommendationsData(null));
    } else {
      setRecommendationsData(null);
    }
  }, [selectedCustomer]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone_number && c.phone_number.includes(customerSearch))
  );

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = menus.filter(m => m.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, Menu[]>);

  const addToCart = (menu: Menu) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu.menu_id === menu.menu_id);
      if (existing) {
        return prev.map(c => c.menu.menu_id === menu.menu_id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { menu, qty: 1 }];
    });
  };

  const removeFromCart = (menuId: string) => {
    setCart(prev => prev.filter(c => c.menu.menu_id !== menuId));
  };

  const changeQty = (menuId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menu.menu_id !== menuId) return c;
      const newQty = c.qty + delta;
      return newQty < 1 ? c : { ...c, qty: newQty };
    }));
  };

  const total = cart.reduce((sum, c) => sum + c.menu.price * c.qty, 0);

  const checkout = async () => {
    if (!selectedCustomer || cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const res = await workflowService.createOrder({
        customer_id: selectedCustomer.customer_id,
        items: cart.map(c => ({ menu_id: c.menu.menu_id, quantity: c.qty })),
        order_type: orderType,
        payment_method: (paymentMethod.toUpperCase() as any) || "QRIS",
      });
      setSuccess({
        ...res,
        customer_name: selectedCustomer.name,
        total: res.total_amount,
        items: cart.map(c => ({ menu_name: c.menu.name, qty: c.qty, subtotal: c.menu.price * c.qty }))
      });
      setCart([]);
    } catch (e: any) {
      alert(e.response?.data?.detail || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const resetSuccess = () => {
    setSuccess(null);
    setSelectedCustomer(null);
    setCustomerDetail(null);
    setCustomerSearch("");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center animate-pulse text-primary text-lg">
          Loading POS...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl p-8 shadow-2xl w-full max-w-md">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-success" />
              <h2 className="text-2xl font-bold text-primary">Pembayaran Berhasil!</h2>
              <p className="text-muted-foreground">Transaksi untuk <strong>{success.customer_name}</strong> telah tersimpan.</p>
              <div className="w-full rounded-lg bg-muted/50 p-4 text-left space-y-2">
                {success.items.map((item: any) => (
                  <div key={item.menu_id} className="flex justify-between text-sm">
                    <span>{item.menu_name} x{item.qty}</span>
                    <span>Rp {Number(item.subtotal).toLocaleString("id-ID")}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">Rp {Number(success.total).toLocaleString("id-ID")}</span>
                </div>
              </div>
              <Button onClick={resetSuccess} className="w-full mt-2">Transaksi Baru</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Mini POS</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
          {/* LEFT: Customer + Menu */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Customer Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div>
                      <div className="font-semibold text-primary">{selectedCustomer.name}</div>
                      {customerDetail && (
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{customerDetail.visit_count} kunjungan</span>
                          {customerDetail.segment && (
                            <Badge variant="outline" className={`text-xs ${SEGMENT_COLORS[customerDetail.segment] || ""}`}>
                              {customerDetail.segment}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setCustomerDetail(null); setCustomerSearch(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari customer..."
                      className="pl-9"
                      value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                    />
                    {showDropdown && customerSearch && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">Tidak ada customer ditemukan</div>
                        ) : (
                          filteredCustomers.slice(0, 6).map(c => (
                            <button
                              key={c.customer_id}
                              className="w-full text-left px-3 py-2 hover:bg-accent/20 text-sm transition-colors"
                              onClick={() => { setSelectedCustomer(c); setShowDropdown(false); setCustomerSearch(""); }}
                            >
                              <span className="font-medium">{c.name}</span>
                              {c.phone_number && <span className="text-muted-foreground ml-2">{c.phone_number}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifikasi Konteks: Jika Customer yang dipilih memiliki tagihan Stay-in aktif */}
            {(() => {
              const selectedCustomerUnpaid = unpaidOrders.find(
                (u) => selectedCustomer && u.customer_id === selectedCustomer.customer_id
              );
              if (!selectedCustomerUnpaid) return null;
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-xs animate-in fade-in">
                  <div className="space-y-0.5">
                    <div className="font-bold text-warning flex items-center gap-1.5 text-sm">
                      <span>🛋️ Tagihan Stay-in Aktif:</span>
                      <span>Rp {Number(selectedCustomerUnpaid.total_amount).toLocaleString("id-ID")}</span>
                    </div>
                    <p className="text-muted-foreground">
                      Pesanan baru dengan mode <strong>Pay Later</strong> akan otomatis digabung ke tagihan ini (1x bayar saat checkout).
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-warning/40 text-warning hover:bg-warning/10 font-bold"
                      onClick={() => router.push("/unpaid")}
                    >
                      💳 Buka di Belum Bayar
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Top-3 Personalized Recommendations Card */}
            {selectedCustomer && recommendationsData && recommendationsData.recommendations.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between text-amber-500">
                    <span>✨ Top-3 Rekomendasi Menu ({recommendationsData.strategy === 'COLLABORATIVE_FILTERING' ? 'Personal' : 'Populer'})</span>
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-500">
                      {recommendationsData.strategy === 'COLLABORATIVE_FILTERING' ? 'Collaborative Filtering' : 'Cold-Start'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0">
                  {recommendationsData.recommendations.map(rec => {
                    const matchedMenu = menus.find(m => m.menu_id === rec.menu_id);
                    return (
                      <button
                        key={rec.menu_id}
                        onClick={() => matchedMenu && addToCart(matchedMenu)}
                        className="p-3 rounded-lg border border-amber-500/20 bg-card hover:bg-amber-500/10 transition-all text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-semibold text-sm text-foreground">{rec.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{rec.reason}</div>
                        </div>
                        <div className="mt-2 text-xs font-bold text-amber-500 flex justify-between items-center">
                          <span>Rp {Number(rec.price).toLocaleString("id-ID")}</span>
                          <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">+ Tambah</span>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_ORDER.filter(c => grouped[c]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:bg-accent/20"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(grouped[activeCategory] || []).map(menu => {
                const inCart = cart.find(c => c.menu.menu_id === menu.menu_id);
                return (
                  <button
                    key={menu.menu_id}
                    onClick={() => addToCart(menu)}
                    className={`relative rounded-xl border p-4 text-left transition-all hover:shadow-md hover:scale-105 active:scale-95 ${
                      inCart ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {inCart.qty}
                      </div>
                    )}
                    <div className="text-lg mb-1">
                      {menu.category === "COFFEE" ? "☕" : menu.category === "FOOD" ? "🥪" : menu.category === "DESSERT" ? "🍰" : "🧋"}
                    </div>
                    <div className="font-medium text-sm text-foreground leading-tight">{menu.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{menu.description}</div>
                    <div className="mt-2 font-bold text-primary text-sm">
                      Rp {Number(menu.price).toLocaleString("id-ID")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Cart */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" /> Keranjang
                  {cart.length > 0 && (
                    <Badge className="ml-auto bg-primary text-primary-foreground">{cart.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                {cart.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Belum ada item
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.menu.menu_id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.menu.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Rp {Number(item.menu.price).toLocaleString("id-ID")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => changeQty(item.menu.menu_id, -1)} className="h-6 w-6 rounded-full bg-border flex items-center justify-center hover:bg-muted">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                          <button onClick={() => changeQty(item.menu.menu_id, +1)} className="h-6 w-6 rounded-full bg-border flex items-center justify-center hover:bg-muted">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeFromCart(item.menu.menu_id)} className="h-6 w-6 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 ml-1">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-3 mt-auto space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-xl text-primary">
                      Rp {total.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {/* Order Type Toggle: Pay Now vs Pay Later */}
                  <div className="flex rounded-lg bg-muted p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setOrderType("pay_now")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        orderType === "pay_now" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ⚡ Pay Now (Langsung Lunas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType("pay_later")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        orderType === "pay_later" ? "bg-card text-amber-500 font-bold shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🛋️ Pay Later (Stay-in)
                    </button>
                  </div>

                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Metode pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(pm => (
                        <SelectItem key={pm.value} value={pm.value}>
                          {pm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={!selectedCustomer || cart.length === 0 || checkoutLoading}
                    onClick={checkout}
                  >
                    {checkoutLoading ? "Memproses..." : !selectedCustomer ? "Pilih Customer dulu" : "💳 Bayar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading POS...</div>}>
      <POSContent />
    </Suspense>
  );
}
