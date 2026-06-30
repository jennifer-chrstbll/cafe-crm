"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, Users } from "lucide-react";
import api from "@/services/api";
import { User } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function ManageUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "CASHIER"
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user?.role !== "OWNER") {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "OWNER") fetchUsers();
  }, [user]);

  if (user?.role !== "OWNER") return null;

  const openAddDialog = () => {
    setFormData({ name: "", email: "", password: "", role: "CASHIER" });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/users", formData);
      setIsDialogOpen(false);
      fetchUsers();
    } catch (e: any) {
      alert("Failed to create user: " + (e.response?.data?.detail || e.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (e: any) {
      alert("Failed to delete user: " + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 h-full pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/settings")} className="h-10 w-10 p-0 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                <Users className="h-8 w-8" /> Manage Users
              </h1>
              <p className="text-muted-foreground mt-1">Add or remove cashier accounts.</p>
            </div>
          </div>
          <Button onClick={openAddDialog} className="shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Cashier
          </Button>
        </div>

        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading users...</div>
            ) : (
              <div className="divide-y divide-border">
                {users.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{u.name}</span>
                        <Badge variant={u.role === "OWNER" ? "default" : "secondary"}>{u.role}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{u.email}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Joined {format(new Date(u.created_at || new Date()), "MMM dd, yyyy")}
                      </span>
                    </div>
                    {u.role !== "OWNER" && u.user_id !== user.user_id && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(u.user_id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">No users found.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Cashier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@cafecrm.com" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={submitting}>
              {submitting ? "Creating..." : "Create Cashier"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
