/** Indonesia (WIB, UTC+7, no DST). The cafe's "today" starts at 00:00 WIB, not 00:00 UTC. */
export const TZ = "Asia/Jakarta";
const OFFSET_MS = 7 * 3600 * 1000;

/** UTC instant of 00:00 WIB, `daysAgo` days before the WIB date of `now`. */
export function jakartaDayStart(now = new Date(), daysAgo = 0): Date {
  const local = new Date(now.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MS - daysAgo * 86_400_000);
}

/** "YYYY-MM-DD" of the WIB calendar date of an instant. */
export function jakartaDateKey(d: string | Date): string {
  const t = typeof d === "string" ? new Date(d) : d;
  return new Date(t.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function jakartaHour(d: string | Date): number {
  const t = typeof d === "string" ? new Date(d) : d;
  return new Date(t.getTime() + OFFSET_MS).getUTCHours();
}

/** 0 = Monday ... 6 = Sunday in WIB. */
export function jakartaWeekday(d: string | Date): number {
  const t = typeof d === "string" ? new Date(d) : d;
  return (new Date(t.getTime() + OFFSET_MS).getUTCDay() + 6) % 7;
}

export const minutesBetween = (a: string | Date, b: string | Date) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
