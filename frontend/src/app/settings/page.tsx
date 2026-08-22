"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import {
  CheckCircle2,
  Camera,
  Lock,
  Settings,
  User,
  ExternalLink,
  ShieldCheck,
  Fingerprint,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";

const STORAGE_KEY_STREAM_URL = "cafe_stream_url";
const DEFAULT_STREAM_URL = "http://192.168.18.80:5001/video_feed";

interface RetentionStatus {
  total_embeddings: number;
  total_customers_with_face: number;
  configured_retention_days: number;
  inactive_candidates_count: number;
  oldest_embedding_created_at: string | null;
  legal_basis: string;
  policy_description: string;
}

/**
 * Halaman Pengaturan — Konfigurasi Akun, Kamera, dan Kebijakan Privasi Biometrik (UU PDP).
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

  // ── Biometric Retention (Owner only - UU PDP No. 27/2022) ──
  const [retentionDays, setRetentionDays] = useState("90");
  const [retentionStatus, setRetentionStatus] = useState<RetentionStatus | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STREAM_URL);
    if (saved) setStreamUrl(saved);
  }, []);

  const fetchRetentionStatus = useCallback(async (days: string) => {
    if (!isOwner) return;
    setRetentionLoading(true);
    try {
      const res = await api.get(`/biometrics/retention-status?retention_days=${days}`);
      setRetentionStatus(res.data);
    } catch (err) {
      console.error("Gagal mengambil status retensi biometrik:", err);
    } finally {
      setRetentionLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    fetchRetentionStatus(retentionDays);
  }, [fetchRetentionStatus, retentionDays]);

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

  const handleExecuteCleanup = async () => {
    const daysNum = parseInt(retentionDays, 10);
    const confirmed = window.confirm(
      `Jalankan pembersihan retensi biometrik untuk pelanggan yang tidak berkunjung lebih dari ${daysNum} hari?\n\n` +
      `Tindakan ini menghapus vector embedding wajah yang kedaluwarsa. Data profil dan transaksi pelanggan tetap aman.`
    );
    if (!confirmed) return;

    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const res = await api.post("/biometrics/retention-cleanup", {
        retention_days: daysNum,
        dry_run: false,
      });
      setCleanupResult(
        `Berhasil! ${res.data.deleted_embeddings_count} embedding kedaluwarsa dibersihkan. Galeri pengenalan (FAISS) diperbarui (${res.data.reloaded_faiss_count} aktif).`
      );
      await fetchRetentionStatus(retentionDays);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Pembersihan retensi gagal. Coba lagi.");
    } finally {
      setCleanupLoading(false);
    }
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
            Konfigurasi akun, kamera, dan kepatuhan privasi data kafe.
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

        {/* Kebijakan Retensi Data Biometrik — Owner only (UU PDP No. 27/2022) */}
        {isOwner && (
          <Card className="border-2 border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-primary font-bold">
                  <Fingerprint className="h-5 w-5 text-accent" /> Retensi Data Biometrik (Embedding)
                </CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                  UU PDP No. 27/2022
                </Badge>
              </div>
              <CardDescription>
                Kebijakan masa simpan (Storage Limitation) vektor embedding biometrik wajah di basis data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrik status embedding */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-xl font-bold text-primary">
                    {retentionLoading ? "..." : retentionStatus?.total_embeddings ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Total Embedding</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-xl font-bold text-success">
                    {retentionLoading ? "..." : retentionStatus?.total_customers_with_face ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pelanggan Aktif</p>
                </div>
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-center">
                  <p className="text-xl font-bold text-warning">
                    {retentionLoading ? "..." : retentionStatus?.inactive_candidates_count ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Kedaluwarsa</p>
                </div>
              </div>

              {/* Kontrol Masa Retensi */}
              <div className="space-y-2 pt-1">
                <label className="block text-sm font-medium text-foreground">
                  Masa Retensi Wajah Pelanggan Non-Aktif
                </label>
                <div className="flex gap-2">
                  <Select value={retentionDays} onValueChange={setRetentionDays}>
                    <SelectTrigger id="select-retensi-hari" className="flex-1">
                      <SelectValue placeholder="Pilih batas waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Hari (Uji Coba Ketat)</SelectItem>
                      <SelectItem value="90">90 Hari (Standar Rekomendasi)</SelectItem>
                      <SelectItem value="180">180 Hari (6 Bulan)</SelectItem>
                      <SelectItem value="365">365 Hari (1 Tahun)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    id="btn-refresh-retensi"
                    variant="outline"
                    size="icon"
                    onClick={() => fetchRetentionStatus(retentionDays)}
                    disabled={retentionLoading}
                    title="Segarkan data retensi"
                  >
                    <RefreshCw className={`h-4 w-4 ${retentionLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pelanggan yang tidak berkunjung dalam {retentionDays} hari akan dikategorikan kedaluwarsa.
                </p>
              </div>

              {/* Banner feedback hasil cleanup */}
              {cleanupResult && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-success/10 border border-success/30 text-xs text-success animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{cleanupResult}</span>
                </div>
              )}

              {/* Tombol aksi pembersihan */}
              <Button
                id="btn-jalankan-pembersihan-retensi"
                variant="outline"
                className="w-full gap-2 border-warning/40 text-warning hover:bg-warning/10 font-bold"
                onClick={handleExecuteCleanup}
                disabled={cleanupLoading || (retentionStatus?.inactive_candidates_count ?? 0) === 0}
              >
                <Trash2 className={`h-4 w-4 ${cleanupLoading ? "animate-spin" : ""}`} />
                {cleanupLoading
                  ? "Membersihkan..."
                  : `Bersihkan ${retentionStatus?.inactive_candidates_count ?? 0} Embedding Kedaluwarsa`}
              </Button>

              {/* Info Kepatuhan Hukum */}
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>Prinsip Pembatasan Penyimpanan (UU PDP Pasal 35 & GDPR)</span>
                </div>
                <p>
                  Pembersihan retensi hanya menghapus data vektor biometrik wajah. Profil CRM dan riwayat
                  transaksi penjualan tetap tersimpan aman tanpa data biometrik yang sensitif.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
