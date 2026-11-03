/** Client-side formatting. All dates are shown in WIB (Asia/Jakarta), the cafe's local time. */
const TZ = "Asia/Jakarta";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const formatRupiah = (n: number | null | undefined) => rupiah.format(Math.round(n ?? 0));

/** Rp 1,2 jt — for chart axes and dense KPI cards. */
export function formatRupiahShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (Math.abs(n) >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return formatRupiah(n);
}

export const formatNumber = (n: number) => n.toLocaleString("id-ID");
export const formatPercent = (r: number | null | undefined, digits = 0) =>
  r == null ? "–" : `${(r * 100).toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const formatDayLong = (d = new Date()) =>
  d.toLocaleDateString("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

/** "baru saja", "5 mnt lalu", "3 jam lalu", "kemarin", "12 hari lalu" */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "–";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "baru saja";
  if (s < 3600) return `${Math.round(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
  const d = Math.round(s / 86400);
  if (d === 1) return "kemarin";
  if (d < 31) return `${d} hari lalu`;
  return formatDate(iso);
}

export function formatDuration(min: number | null | undefined): string {
  if (min == null) return "–";
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} j ${min % 60} mnt` : `${h} jam`;
}

export const todayKeyWIB = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export const CATEGORY_LABEL: Record<string, string> = {
  COFFEE: "Kopi", NON_COFFEE: "Non-kopi", FOOD: "Makanan", DESSERT: "Dessert",
};
export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tunai", QRIS: "QRIS", DEBIT: "Debit", EWALLET: "E-wallet", UNKNOWN: "Lainnya",
};
export const SEGMENT_LABEL: Record<string, string> = { VIP: "VIP", Regular: "Langganan", New: "Baru" };
