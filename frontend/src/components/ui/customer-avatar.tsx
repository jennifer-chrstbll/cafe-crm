"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Camera, User } from "lucide-react";

interface CustomerAvatarProps {
  name: string;
  snapshotUrl?: string | null;
  isActiveVisit?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
}

const SIZE_STYLES = {
  sm: {
    container: "h-8 w-8 text-xs",
    icon: "h-4 w-4",
    badge: "h-2 w-2 bottom-0 right-0",
  },
  md: {
    container: "h-12 w-12 text-sm",
    icon: "h-6 w-6",
    badge: "h-3 w-3 bottom-0 right-0",
  },
  lg: {
    container: "h-16 w-16 text-lg",
    icon: "h-8 w-8",
    badge: "h-4 w-4 bottom-0.5 right-0.5",
  },
  xl: {
    container: "h-24 w-24 text-2xl",
    icon: "h-12 w-12",
    badge: "h-5 w-5 bottom-1 right-1",
  },
};

/**
 * CustomerAvatar — Komponen Avatar Cerdas berbasis Privacy by Design (UU PDP & GDPR).
 *
 * Logika Transisi:
 * 1. Sesi Kunjungan Aktif (`isActiveVisit = true` & ada `snapshotUrl`):
 *    Menampilkan foto wajah sementara yang dijepret live oleh kamera CCTV + ring hijau aktif.
 * 2. Kunjungan Selesai / Arsip (`isActiveVisit = false` / tidak ada snapshot):
 *    Beralih otomatis ke avatar inisial huruf generik (Data Minimization & Storage Limitation).
 */
export function CustomerAvatar({
  name,
  snapshotUrl,
  isActiveVisit = false,
  size = "md",
  className,
  showBadge = true,
}: CustomerAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = SIZE_STYLES[size];

  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  // Hanya tampilkan foto jika sesi kunjungan aktif dan snapshot valid
  const hasLivePhoto = Boolean(snapshotUrl && isActiveVisit && !imageError);

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <div
        className={cn(
          "relative overflow-hidden rounded-full font-bold flex items-center justify-center select-none transition-all duration-300",
          sizeConfig.container,
          hasLivePhoto
            ? "ring-2 ring-success ring-offset-2 ring-offset-background shadow-md bg-muted"
            : "bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 text-primary border border-primary/20",
          isActiveVisit && !hasLivePhoto && "ring-2 ring-success/60 ring-offset-1 ring-offset-background",
          className
        )}
        title={
          hasLivePhoto
            ? `${name} — 📷 Foto Sementara Sesi Aktif (UU PDP)`
            : isActiveVisit
            ? `${name} — 🟢 Sedang di Kafe (Sesi Aktif)`
            : name
        }
      >
        {hasLivePhoto ? (
          <img
            src={snapshotUrl!}
            alt={`Snapshot sementara ${name}`}
            className="h-full w-full object-cover animate-in fade-in duration-300"
            onError={() => setImageError(true)}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className={sizeConfig.icon} />
        )}
      </div>

      {/* Badge status sesi aktif / foto sementara */}
      {showBadge && isActiveVisit && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-background flex items-center justify-center shadow-sm",
            hasLivePhoto ? "bg-success text-white" : "bg-success",
            sizeConfig.badge
          )}
          title={hasLivePhoto ? "Foto Sementara Aktif" : "Sesi Kunjungan Aktif"}
        >
          {hasLivePhoto && size === "xl" && <Camera className="h-2.5 w-2.5" />}
        </span>
      )}
    </div>
  );
}
