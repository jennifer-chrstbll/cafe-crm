"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";

interface PaginationBarProps {
  page: number;           // 0-indexed current page
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Komponen pagination reusable — sesuai prinsip Miller's Law (7±2):
 * Menampilkan maksimal 5 halaman sekaligus di navigator agar tidak overload.
 * Dipakai di: Kunjungan, Log Pengenalan, Pelanggan.
 */
export function PaginationBar({ page, totalPages, onPageChange, isLoading }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  // Hitung jendela halaman (max 5 nomor)
  const windowSize = 5;
  const halfWindow = Math.floor(windowSize / 2);
  let startPage = Math.max(0, page - halfWindow);
  let endPage = Math.min(totalPages - 1, startPage + windowSize - 1);
  if (endPage - startPage < windowSize - 1) {
    startPage = Math.max(0, endPage - windowSize + 1);
  }
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-sm text-muted-foreground">
        Halaman <span className="font-semibold text-foreground">{page + 1}</span> dari{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1">
        {/* Ke halaman pertama */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(0)}
          disabled={page === 0 || isLoading}
          aria-label="Halaman pertama"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Sebelumnya */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0 || isLoading}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Nomor halaman */}
        {pageNumbers.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(p)}
            disabled={isLoading}
            aria-label={`Halaman ${p + 1}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p + 1}
          </Button>
        ))}

        {/* Berikutnya */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1 || isLoading}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Ke halaman terakhir */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1 || isLoading}
          aria-label="Halaman terakhir"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
