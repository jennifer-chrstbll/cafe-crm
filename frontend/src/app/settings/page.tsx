"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { CheckCircle2, Camera, Lock, Settings, User, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

const STORAGE_KEY_STREAM_URL = "cafe_stream_url";
const DEFAULT_STREAM_URL = "http://192.168.18.80:5001/video_feed";

/**
 * Halaman Pengaturan
 *
 * Perubahan dari versi sebelumnya:
 * - Tambah kartu "Konfigurasi Kamera" untuk Owner (perbaikan 8.9)
 *   Stream URL disimpan di localStorage — sederhana dan cukup untuk scope TA.
 *   Halaman Live membaca dari localStorage key "cafe_stream_url".
 * - Semua label → Bahasa Indonesia
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isOwner = user?.role === "OWNER";

  // ── Password ──
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // ── Stream URL (Owner only) ──
  const [streamUrl, setStreamUrl] = useState(DEFAULT_STREAM_URL);
  const [streamUrlSaved, setStreamUrlSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STREAM_URL);
    if (saved) setStreamUrl(saved);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess(false);
    try {
      await api.put(`/users/me/password`, { new_password: password });
      setPasswordSuccess(true);
      setPassword("");
    } catch (err) {
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveStreamUrl = () => {
    const trimmed = streamUrl.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY_STREAM_URL, trimmed);
    setStreamUrlSaved(true);
    setTimeout(() => setStreamUrlSaved(false), 3000);
  };

  const handleResetStreamUrl = () => {
    setStreamUrl(DEFAULT_STREAM_URL);
    localStorage.setItem(STORAGE_KEY_STREAM_URL, DEFAULT_STREAM_URL);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-2xl pb-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
            <Settings className="h-7 w-7" /> Pengaturan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi akun dan sistem kafe.
          </p>
        </div>

        {/* Info akun */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Informasi Akun
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-foreground">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge
                  className={`mt-1 text-xs ${isOwner ? "bg-primary/10 text-primary border-primary/20" : "bg-success/10 text-success border-success/20"}`}
                  variant="outline"
                >
                  {isOwner ? "👑 Owner" : "🧑‍💼 Kasir"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ganti password */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> Ganti Password
            </CardTitle>
            <CardDescription>Perbarui kata sandi akun Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            {passwordSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success border border-success/20">
                <CheckCircle2 className="h-4 w-4" />
                Password berhasil diperbarui!
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Password Baru
                </label>
                <Input
                  id="input-password-baru"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <Button
                id="btn-simpan-password"
                type="submit"
                disabled={passwordLoading || !password}
                className="w-full"
              >
                {passwordLoading ? "Menyimpan..." : "Simpan Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Konfigurasi Kamera — Owner only */}
        {isOwner && (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4" /> Konfigurasi Kamera
              </CardTitle>
              <CardDescription>
                Atur URL stream kamera face recognition. Kasir tidak bisa mengubah ini dari halaman Live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">💡 Cara Kerja</p>
                <p>
                  URL stream disimpan di perangkat ini (localStorage). Halaman Live akan otomatis menggunakan
                  URL yang disimpan di sini. Default: <code className="font-mono">{DEFAULT_STREAM_URL}</code>
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Stream URL Kamera
                </label>
                <Input
                  id="input-stream-url"
                  type="url"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="http://192.168.x.x:5001/video_feed"
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  id="btn-simpan-stream-url"
                  onClick={handleSaveStreamUrl}
                  className="flex-1 gap-2"
                  disabled={!streamUrl.trim()}
                >
                  {streamUrlSaved ? (
                    <><CheckCircle2 className="h-4 w-4" /> Tersimpan!</>
                  ) : (
                    "Simpan URL Kamera"
                  )}
                </Button>
                <Button
                  id="btn-reset-stream-url"
                  variant="outline"
                  onClick={handleResetStreamUrl}
                  title="Reset ke URL default"
                >
                  Reset
                </Button>
                <Button
                  id="btn-test-kamera"
                  variant="outline"
                  onClick={() => window.open(streamUrl, "_blank")}
                  className="gap-1.5"
                  title="Buka stream di tab baru untuk test"
                >
                  <ExternalLink className="h-4 w-4" /> Test
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manajemen User — Owner only */}
        {isOwner && (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manajemen Pengguna</CardTitle>
              <CardDescription>Tambah dan kelola akun kasir.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Kelola akses kasir yang dapat login ke sistem Cafe CRM.
              </p>
              <Button
                id="btn-kelola-pengguna"
                variant="outline"
                onClick={() => router.push("/settings/users")}
              >
                Kelola Pengguna
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
