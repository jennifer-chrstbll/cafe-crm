"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Search, Utensils } from "lucide-react";
import api from "@/services/api";
import { Menu } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function MenusPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "COFFEE",
    price: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user?.role !== "OWNER") {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  const fetchMenus = async () => {
    try {
      const res = await api.get("/menus");
      setMenus(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "OWNER") fetchMenus();
  }, [user]);

  if (user?.role !== "OWNER") return null;

  const filteredMenus = menus.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingMenu(null);
    setFormData({ name: "", description: "", category: "COFFEE", price: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      description: menu.description || "",
      category: menu.category,
      price: menu.price.toString()
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price)
      };

      if (editingMenu) {
        await api.put(`/menus/${editingMenu.menu_id}`, payload);
      } else {
        await api.post("/menus", payload);
      }
      
      setIsDialogOpen(false);
      fetchMenus();
    } catch (e: any) {
      alert("Failed to save menu: " + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (menuId: string) => {
    if (!confirm("Are you sure you want to delete this menu?")) return;
    try {
      await api.delete(`/menus/${menuId}`);
      fetchMenus();
    } catch (e: any) {
      alert("Failed to delete: " + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 h-full pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Utensils className="h-8 w-8" /> Menus
            </h1>
            <p className="text-muted-foreground mt-1">Manage cafe menu items and pricing.</p>
          </div>
          <Button onClick={openAddDialog} className="shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Menu
          </Button>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menus..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading menus...</div>
            ) : filteredMenus.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No menus found. Click "Add Menu" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                {filteredMenus.map(menu => (
                  <div key={menu.menu_id} className="relative rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xl">
                        {menu.category === "COFFEE" ? "☕" : menu.category === "FOOD" ? "🥪" : menu.category === "DESSERT" ? "🍰" : "🧋"}
                      </div>
                      <Badge variant="outline" className="text-xs bg-muted/50">{menu.category}</Badge>
                    </div>
                    <div className="font-bold text-foreground text-lg mb-1 leading-tight">{menu.name}</div>
                    <div className="text-xs text-muted-foreground mb-3 flex-1">{menu.description || "No description"}</div>
                    
                    <div className="flex items-center justify-between mt-auto pt-3 border-t">
                      <div className="font-bold text-primary">Rp {Number(menu.price).toLocaleString("id-ID")}</div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditDialog(menu)} className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent/20 hover:text-foreground">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(menu.menu_id)} className="h-8 w-8 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMenu ? "Edit Menu" : "Add New Menu"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Matcha Latte" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="COFFEE">COFFEE</option>
                <option value="NON_COFFEE">NON_COFFEE</option>
                <option value="FOOD">FOOD</option>
                <option value="DESSERT">DESSERT</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price (Rp)</label>
              <Input required type="number" min="0" step="100" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="25000" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Optional description" />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={submitting}>
              {submitting ? "Saving..." : "Save Menu"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
