"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await api.put(`/users/me/password`, { new_password: password });
      setSuccess(true);
      setPassword("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Password updated successfully.
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  New Password
                </label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {user?.role === "OWNER" && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>Owner controls for managing cashiers.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                User management allows you to add and remove cashiers.
              </p>
              <Button variant="outline" onClick={() => router.push("/settings/users")}>View Users</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
