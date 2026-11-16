/**
 * Greeting script for the cashier ("Halo Kak Jennifer, mau pesan Kopi Susu lagi?").
 *
 * Why it looks like this (docs/RECOMMENDATION.md §4):
 *  - Using the customer's name: remembering a name increases compliance with a purchase
 *    request, through flattery (Howard, Gengler & Jain 1995, J. Consumer Research 22(2)).
 *  - A concrete suggestion: verbal prompts by staff raise sales of the suggested item
 *    (Johnson & Masotti 1990, J. Organizational Behavior Management 11(1); van Kleef,
 *    van Trijp & van den Broek 2015, Applied Psychology: Health and Well-Being 7(2)).
 *  - Several wordings, rotated: customers notice scripted lines, and it hurts most when
 *    they expect a personal recommendation (Victorino, Verma, Bonner & Wardell 2012,
 *    J. Service Research 15(4)).
 *  - Loyal customers are offered something new (variety seeking, McAlister & Pessemier 1982).
 * The line is a suggestion for the cashier, never read out by the system.
 */

export interface GreetingInput {
  name: string;
  visitCount: number;
  favorite?: string;
  recommendation?: string;
  discover?: string;
  hasTab: boolean;
  loyal: boolean;
}

type Tpl = (v: Required<Pick<GreetingInput, "name">> & GreetingInput) => string | null;

const NEW: Tpl[] = [
  (v) => v.recommendation ? `Halo Kak ${v.name}, selamat datang! Mau coba ${v.recommendation}? Ini salah satu yang paling sering dipesan di sini.` : null,
  (v) => v.recommendation ? `Hai Kak ${v.name}! Kalau masih bingung, ${v.recommendation} jadi favorit banyak pelanggan, lho.` : null,
  (v) => v.recommendation ? `Selamat datang, Kak ${v.name}! Boleh saya rekomendasikan ${v.recommendation}?` : null,
  (v) => `Halo Kak ${v.name}, selamat datang! Mau pesan apa hari ini?`,
];

const RETURNING: Tpl[] = [
  (v) => v.favorite ? `Halo Kak ${v.name}, senang ketemu lagi! Mau pesan ${v.favorite} seperti biasa?` : null,
  (v) => v.favorite ? `Hai Kak ${v.name}! ${v.favorite} lagi hari ini?` : null,
  (v) => v.favorite && v.recommendation ? `Kak ${v.name}, mau ${v.favorite} yang biasa, atau coba ${v.recommendation} kali ini?` : null,
  (v) => v.favorite ? `Selamat datang kembali, Kak ${v.name}! Biasanya ${v.favorite}, mau yang sama?` : null,
];

const LOYAL: Tpl[] = [
  (v) => v.discover ? `Kak ${v.name}, makasih sudah sering mampir! Mau coba yang baru? ${v.discover} belum pernah Kakak pesan.` : null,
  (v) => v.discover && v.favorite ? `Halo Kak ${v.name}! Selain ${v.favorite}, ada ${v.discover} yang mungkin Kakak suka.` : null,
  (v) => v.discover && v.favorite ? `Kak ${v.name}, mau ${v.favorite} seperti biasa, atau sesekali coba ${v.discover}?` : null,
];

/** First name only, as a cashier would say it. */
export function callName(full: string): string {
  const first = full.trim().split(/\s+/)[0] ?? "";
  return first.length > 1 ? first : full.trim();
}

/** Small stable hash, so the same customer gets the same line during one visit. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** All lines that fit this customer, in a shuffled order seeded by `seed` (customer + day). */
export function greetings(input: GreetingInput, seed: string): string[] {
  const v = { ...input, name: callName(input.name) };
  const pool = input.loyal && input.discover ? [...LOYAL, ...RETURNING]
    : input.visitCount > 1 && input.favorite ? RETURNING : NEW;
  let lines = pool.map((t) => t(v)).filter((x): x is string => !!x);
  if (!lines.length) lines = NEW.map((t) => t(v)).filter((x): x is string => !!x);
  let h = hash(seed);
  const out = [...lines];
  for (let i = out.length - 1; i > 0; i--) {          // Fisher-Yates with a seeded generator
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (input.hasTab) return out.map((l) => `${l} Bisa juga ditambahkan ke tagihan yang tadi.`);
  return out;
}
