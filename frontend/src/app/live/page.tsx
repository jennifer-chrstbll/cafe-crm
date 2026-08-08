"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCheck, UserX, Camera, Loader2, Sparkles, ShoppingCart } from "lucide-react";
import api from "@/services/api";
import { supabase } from "@/lib/supabase";
import { LiveEvent, RecognitionLog } from "@/types";
import { format } from "date-fns";

const SEGMENT_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 border-amber-300",
  Regular: "bg-blue-100 text-blue-800 border-blue-300",
  New: "bg-green-100 text-green-800 border-green-300",
};

export default function LiveRecognitionPage() {
  const router = useRouter();
  const [latestEvent, setLatestEvent] = useState<LiveEvent | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecognitionLog[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  
  // Enroll state
  const [enrollName, setEnrollName] = useState("");
  const [enrollPhone, setEnrollPhone] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fetchLatest = async () => {
    try {
      const res = await api.get("/recognition/latest");
      setLatestEvent(res.data);
    } catch (e) {
      // Ignore 404s if no logs exist yet
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await api.get("/recognition-logs?limit=5");
      setRecentLogs(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    // Initial fetch
    fetchLatest();
    fetchRecent();

    // ⚡ Supabase Realtime — instant push when camera_agent.py writes new recognition
    const channel = supabase
      .channel("recognition_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recognition_logs" },
        (_payload) => {
          // New recognition event — fetch full context immediately
          fetchLatest();
          fetchRecent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Enroll Customer Flow (menggunakan wajah dari CCTV secara otomatis)
  const handleEnroll = async () => {
    if (!enrollName.trim()) return alert("Nama wajib diisi");
    
    setIsEnrolling(true);
    
    try {
      // Tidak perlu ambil foto manual. Cukup kirim FormData, backend akan mengambil wajah terakhir dari CCTV
      const formData = new FormData();
      formData.append("name", enrollName);
      if (enrollPhone) formData.append("phone_number", enrollPhone);

      const res = await api.post("/recognition/enroll", formData);

      alert(res.data.message);
      setIsEnrollModalOpen(false);
      setEnrollName("");
      setEnrollPhone("");
    } catch (e: any) {
      alert("Gagal mendaftar: " + (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : JSON.stringify(e.response?.data?.detail || e.message)));
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 h-full pb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-destructive"></span>
            </span>
            Live Recognition
          </h1>
          <p className="text-muted-foreground mt-1">Sistem deteksi wajah berjalan secara real-time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* LEFT: Kamera feed */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border-4 border-border shadow-lg flex items-center justify-center">
              {/* CCTV Stream dari Arduino Uno Q */}
              <img
                src="http://192.168.18.80:5001/video_feed"
                alt="CCTV Stream"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = ""; // Clear src to prevent broken image icon
                  (e.target as HTMLImageElement).alt = "CCTV Offline (Pastikan api_server.py berjalan)";
                }}
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">
                <Camera className="h-3 w-3" /> Camera 1 Active
              </div>
            </div>

            {/* Riwayat Live (Kecil di bawah kamera) */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Aktivitas Terakhir</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {recentLogs.map(log => (
                    <div key={log.log_id} className="flex flex-col items-center gap-1 min-w-[80px] p-2 rounded-lg bg-muted/40">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${log.recognized ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {log.recognized ? "✓" : "?"}
                      </div>
                      <div className="text-xs font-medium truncate w-full text-center">
                        {log.customer_name || "Unknown"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), "HH:mm:ss")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Hasil Recognition Aktif */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1 border-2 shadow-xl relative overflow-hidden flex flex-col">
              {/* Highlight bar di atas kartu berdasarkan status */}
              <div className={`absolute top-0 left-0 right-0 h-2 ${
                !latestEvent ? "bg-muted" : 
                latestEvent.recognized ? "bg-success" : "bg-destructive"
              }`} />
              
              <CardHeader className="pt-6">
                <CardTitle>Customer Terdeteksi</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {!latestEvent ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center flex-1">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 opacity-50" />
                    <p>Menunggu pelanggan...</p>
                  </div>
                ) : latestEvent.recognized ? (
                  <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500 flex-1">
                    {/* Profil */}
                    <div className="flex flex-col items-center text-center">
                      <div className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center mb-4">
                        <UserCheck className="h-12 w-12 text-success" />
                      </div>
                      <h2 className="text-3xl font-bold text-primary">{latestEvent.customer_name}</h2>
                      
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                        {latestEvent.segment && (
                          <Badge className={SEGMENT_COLORS[latestEvent.segment] || ""}>
                            {latestEvent.segment}
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-primary/5">
                          {latestEvent.visit_count} Kunjungan
                        </Badge>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent" /> Menu Favorit & Rekomendasi
                      </h3>
                      {latestEvent.favorites.length > 0 ? (
                        <div className="space-y-2">
                          {latestEvent.favorites.map((fav, i) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded bg-muted/30 border border-border/50">
                              <span className="font-medium text-sm">{fav.menu_name}</span>
                              <span className="text-xs text-muted-foreground">{fav.total_qty}x dipesan</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Belum ada riwayat pesanan.</p>
                      )}
                    </div>

                    {/* Lanjut ke POS Action */}
                    <div className="mt-auto pt-4 flex flex-col gap-3">
                      <div className="rounded-lg bg-accent/10 border border-accent/20 p-4 relative">
                        <div className="absolute -top-3 -left-2 text-2xl">💬</div>
                        <p className="text-sm italic font-bold text-[#5C3D2E] text-center">
                          "Halo kak {latestEvent.customer_name}! Mau pesan {latestEvent.favorites[0]?.menu_name || 'yang biasa'} lagi hari ini?"
                        </p>
                      </div>
                      
                      <Button 
                        size="lg" 
                        className="w-full shadow-md font-bold text-md mt-2 h-14"
                        onClick={() => router.push(`/pos?customerId=${latestEvent.customer_id}`)}
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" /> Lanjut ke POS
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center animate-in slide-in-from-right-4 duration-500 flex-1">
                    <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                      <UserX className="h-12 w-12 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold text-destructive">UNKNOWN PERSON</h2>
                    <p className="text-sm text-muted-foreground mt-2 mb-8">
                      Wajah tidak dikenali dalam database.
                    </p>
                    
                    <Button 
                      size="lg" 
                      className="w-full bg-primary hover:bg-primary/90 shadow-md"
                      onClick={() => setIsEnrollModalOpen(true)}
                    >
                      <Camera className="mr-2 h-5 w-5" /> Daftarkan Customer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enroll Modal */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Daftarkan Customer Baru</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <Input 
                placeholder="Misal: Kevin" 
                value={enrollName}
                onChange={e => setEnrollName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor HP (opsional)</label>
              <Input 
                placeholder="0812..." 
                value={enrollPhone}
                onChange={e => setEnrollPhone(e.target.value)}
              />
            </div>
            
            <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground border border-border mt-2">
              <p>💡 Saat klik Simpan, sistem akan otomatis mengambil wajah yang sedang berada di depan kamera (CCTV).</p>
            </div>

            <Button 
              className="w-full mt-2" 
              onClick={handleEnroll} 
              disabled={isEnrolling || !enrollName.trim()}
            >
              {isEnrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              {isEnrolling ? "Menyimpan..." : "Ambil Wajah CCTV & Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
