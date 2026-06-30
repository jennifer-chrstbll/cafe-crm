"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Trash2, Plus, Minus, CheckCircle2, X } from "lucide-react";
import api from "@/services/api";
import { Menu, Customer, CartItem } from "@/types";

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

function POSContent() {
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("COFFEE");

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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [preselectedCustomerId]);

  useEffect(() => {
    if (selectedCustomer) {
      api.get(`/customers/${selectedCustomer.customer_id}`).then(res => {
        setCustomerDetail(res.data);
      }).catch(() => setCustomerDetail(null));
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
      const res = await api.post("/pos/checkout", {
        customer_id: selectedCustomer.customer_id,
        items: cart.map(c => ({ menu_id: c.menu.menu_id, qty: c.qty })),
      });
      setSuccess(res.data);
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
