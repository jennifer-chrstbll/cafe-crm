# UX rationale — Kafe CRM

Why every screen, colour and placement is the way it is, with the theory behind it.
Use it for Bab III (perancangan antarmuka) and the defense. File references point to the code.

---

## 1. Users and what they actually need

| User | Device / context | Goal during use | What the research on small cafés says they need |
|---|---|---|---|
| **Kasir** (cashier, also covers *pramusaji* tasks) | iPad in landscape at the counter, touch, standing, customers waiting | Serve the person in front of them fast and without mistakes | Quick order entry, who the customer is and what they usually order, open tabs, payment by QRIS/cash with change, end-of-shift totals |
| **Pemilik** (owner) | Laptop or tablet, sitting, a few times a day | Know how the business is doing and fix problems | Today's revenue vs. yesterday, best sellers, busy hours (staffing), returning-customer rate, menu & price management, staff accounts, privacy compliance |
| **Pelanggan** | Never touches the UI | Be recognised and served personally | Clear consent, no photos stored, easy deletion |

Waiters (*pramusaji*) were folded into the cashier role: their tasks in a small café — see open
tabs, see how full each floor is, register a guest — are all in the cashier's menu, so a third role
would add accounts and training without adding capability (Tesler's law: the complexity is
handled once, by the system, not by an extra role).

## 2. Information architecture — one page, one job

Navigation is **role-based** (`components/app/AppShell.tsx`). People only see what they use
(Hick's law: decision time grows with the number of choices).

| Page | Role | The ONE question it answers | Why it is its own page |
|---|---|---|---|
| **Kasir** `/pos` | both | "Who is in front of me and what are they ordering?" | The core task. Recognition, favourites, recommendations and the cart are on one screen because they serve the *same* task for the *same* person (Gestalt proximity); splitting them would force the cashier to remember context between pages (recall instead of recognition). |
| **Tagihan** `/unpaid` | both | "Who still has to pay?" | Different moment (customer leaving, not ordering); oldest first so nobody is forgotten |
| **Transaksi** `/transactions` | both | "How much did we take, per payment method?" | Shift closing: cash in the drawer must equal *Tunai* |
| **Pelanggan** `/customers` | both | "Find a customer / register one" | Lookup when the face is not recognised; profile & privacy actions |
| **Kamera** `/live` | both | "Is the cashier camera working and well placed?" | Troubleshooting only; video is not needed to serve customers |
| **Ringkasan** `/dashboard` | owner | "How is today going, and is anything wrong?" | 5-second overview; landing page for the owner |
| **Analitik** `/analytics` | owner | "What are the trends?" | Slow, reflective analysis; one chart per business question |
| **Kunjungan** `/visits` | owner | "Who came, how long, how were they linked?" | Evaluation of person tracking + identity association |
| **Menu** `/menus` | owner | "What do we sell and for how much?" | Configuration, rarely used |
| **Log Wajah** `/recognition-logs` | owner | "Is face recognition accurate in the field?" | Audit trail + ground truth (Rank-1/FAR evidence) |
| **Staf** `/staff` | owner | "Who can log in?" | Account management |
| **Pengaturan** `/settings` | both (owner tabs) | "How is the system configured?" | Tabs: Akun, Perangkat, Kafe & asosiasi, Privasi — each tab one purpose |

The owner's 11 destinations are grouped into **4 labelled chunks** — *Hari ini*, *Pelanggan*,
*Bisnis*, *Sistem* — so the menu is scanned as 4 groups instead of 11 items (Miller's chunking).
The cashier has **5** destinations, ordered by frequency of use during a shift (serial-position
effect: the first item is found fastest).

Landing pages differ by role (`homeFor()` in `contexts/AuthContext.tsx`): cashier → Kasir,
owner → Ringkasan. Each role starts where its most frequent task is.

## 3. Visual design

### Colour — every colour has exactly one meaning

Tokens are in `src/app/globals.css`; contrast was computed (WCAG 2.1 relative luminance).

| Token | Colour | Meaning | Contrast on white | Why this colour |
|---|---|---|---|---|
| background | `#FAF8F5` warm paper | canvas | – | Softer than pure white on a bright counter screen (less glare, long shifts); warm tone fits a café |
| primary | `#704329` espresso | brand + **the one main action** per screen (Bayar, Simpan) | 8.3 : 1 | Coffee brand colour; dark enough for white text; used sparingly so the main button stands out (Von Restorff / isolation effect) |
| success | `#1F7A45` green | recognised, paid, online | 5.3 : 1 | Universal "OK/go" convention (Nielsen #2 match the real world) |
| warning | `#A7590C` amber | needs attention but is **not an error**: unknown face, open tab, long-open tab | 5.1 : 1 | An unknown face is an *opportunity* (enroll), not a failure; red would alarm the cashier in front of the customer |
| destructive | `#C22E2E` red | errors, offline device, delete | 5.6 : 1 | Reserved for real problems so it keeps its signal value |
| info | `#1C5FB0` blue | neutral information (notes, manual association) | 6.4 : 1 | Distinct from all status colours |
| muted text | `#645A54` | secondary text | 6.7 : 1 | Hierarchy without failing contrast |

Rules: colour is **never the only cue** — every status also has an icon and a word
(`SegmentBadge`, `Pill`) for the ~8% of men with colour-vision deficiency (WCAG 1.4.1).
Coloured text on its own 10% tint still meets 4.5 : 1.

### Typography & numbers
- Inter (high x-height, legible at arm's length on a tablet); body ≥ 14 px, inputs **16 px**
  (iPad Safari zooms into smaller inputs and breaks the layout).
- Money and counts use **tabular figures** (`.num`) so columns of prices line up and can be
  compared at a glance.
- Rupiah always formatted `Rp 25.000` (Indonesian convention), times in **WIB**.

### Spacing, shape, density
- 4/8 px spacing grid, 12 px radius cards: consistent rhythm reads as one system (Gestalt similarity).
- Cards group related information (Gestalt common region); one card = one topic.
- Dense where experts work repeatedly (tables for the owner), spacious where speed matters (Kasir tiles).

## 4. Placement decisions (and why)

### Kasir screen (`app/pos/page.tsx`)
```
┌──────────────┬──────────────────────────────┬────────────────┐
│ Di kasir     │ [Cari menu]                  │ Pesanan        │
│ sekarang     │ (Semua)(Kopi)(Non-kopi)…     │ 2× Kopi Susu   │
│  Avatar Nama │ ┌────┐┌────┐┌────┐┌────┐     │ 1× Croissant   │
│  VIP · ke-12 │ │menu││menu││menu││menu│     │                │
│  Favorit +   │ └────┘└────┘└────┘└────┘     │ (Bayar sekarang│
│  Rekomendasi+│                              │  | Bayar nanti)│
│  Tagihan     │                              │ Rp 58.000      │
│              │                              │ [ Bayar Rp 58.000 ] │
└──────────────┴──────────────────────────────┴────────────────┘
```
- **Customer left**: read first (left-to-right reading, F-pattern); everything after it is "for this person".
- **Menu centre, biggest area**: the most frequent action (tap an item) gets the largest targets
  (≥ 96 px tiles; Fitts's law: time to hit a target falls with its size).
- **Total + primary button bottom-right**: the end of the reading path (Z-pattern) and where the
  right thumb rests on a landscape iPad. The button states **verb + amount** ("Bayar Rp 58.000")
  so the cashier confirms the amount while acting (error prevention).
- **Favourites/recommendations are tappable** and add to the cart directly: suggestions become
  one tap instead of searching (recognition rather than recall; shortens the path).
- **"Mengikuti kamera" lock**: the panel follows the camera only while the cart is empty. Once an
  order starts, the customer is locked; a new face shows a banner "X terdeteksi — Ganti". A person
  walking past can never silently change who is charged (Nielsen #3 user control, #5 error prevention).
- **Recognition feedback "Benar ini Ana? Ya / Bukan"**: one tap, inline, optional — it creates the
  ground truth for the thesis without adding a step to the order.
- Keyboard: `/` focuses menu search, `Esc` clears it (accelerators for experts, Nielsen #7).

### Ringkasan (owner)
- **Alerts first** (device offline, tabs open > 3 h): problems before vanity numbers.
- 4 KPI cards, each with **context** — revenue vs. yesterday *at the same time* (a raw number has no
  meaning without comparison), average ticket, returning vs. new, open tabs. Cards are tappable
  links to the page that explains them.
- Hourly chart highlights the current hour (pre-attentive attribute: one darker bar).

### Analitik
- Each chart is titled with the **question it answers** ("Kapan perlu tambahan staf?").
- One hue per series; bar charts sorted by value; heatmap uses a single sequential hue (darker =
  busier) so it is readable without a legend key (Cleveland & McGill: position and length are
  judged more accurately than colour/area, so the key numbers are bars, not pies).

## 5. Feedback and system status (Nielsen #1)

| Situation | What the user sees | Theory |
|---|---|---|
| First load | **Skeletons with the same shape as the content** (`components/app/states.tsx`) | Perceived performance: shape-matched placeholders feel faster than spinners and avoid layout jump |
| Background refresh | old data stays, no flicker (`hooks/useApi.ts`, stale-while-revalidate) | Stability; Doherty threshold (respond < 400 ms or show progress) |
| Who is at the cashier | updates every 2 s; "Mengikuti kamera" pulse | Visibility of system status |
| Devices | green/red lights in the top bar for *Kamera kasir* and *Pelacakan* | The owner knows immediately why recognition or occupancy is missing |
| Action done | toast with *what* happened and *the amount* ("Pembayaran Rp 58.000 diterima · QRIS") | Closure; peak-end rule — the transaction ends on a clear, positive moment |
| Old data | "Data lama · diperbarui 5 mnt lalu" on occupancy | Honest status instead of silently stale numbers |
| Open tabs | amber badge count on *Tagihan* in the nav | Unfinished tasks stay visible (Zeigarnik effect) |
| Polling | pauses when the tab is hidden | Saves battery/data on the iPad |

## 6. Error prevention and recovery (Nielsen #5, #9)

- Prices are taken from the database, never from the browser; double taps on *Bayar* are harmless
  (server guard returns "sudah dibayar").
- Destructive actions ask for confirmation with a **specific verb** ("Hapus data wajah", not "OK");
  non-destructive ones don't (no confirmation fatigue).
- Hiding a menu item is reversible and offers **Urungkan** (undo) in the toast.
- Paid transactions are locked; open-tab items can be removed (cashier mistakes are fixable).
- Guest tab requires a label ("Meja 4") so it can be found later.
- Cash payment shows **change** automatically and blocks "Kurang Rp …" (no mental arithmetic).
- Error messages are plain Indonesian with a next step ("Koneksi lambat. Periksa internet lalu
  coba lagi.") and a *Coba lagi* button — never a stack trace or HTTP code.

## 7. First-time use (learnability)

- **Jakob's law**: the Kasir screen follows the layout of POS apps staff already know
  (categories → item grid → cart → pay); the owner pages follow common admin dashboards.
- **One language**: everything in Bahasa Indonesia with café vocabulary (*Tagihan*, *Tunai*,
  *Bayar nanti*), replacing the earlier mix of "Dashboard/Analytics/Customer" (Nielsen #4 consistency).
- **Empty states teach**: every empty list says what will appear and how ("Pesanan 'bayar nanti'
  dari halaman Kasir akan muncul di sini").
- **Sensible defaults**: payment QRIS pre-selected (most common in Indonesia); a customer with an
  open tab defaults to "Bayar nanti".
- **Aesthetic-usability effect**: a calm, consistent visual system makes the app *feel* easier
  and makes users more tolerant of small issues — relevant for the SUS score.
- Minimalism (Nielsen #8): one primary button per screen; secondary actions are outline/ghost.

## 8. Accessibility

WCAG 2.1 AA contrast for all text (§3) · visible focus ring on every control · skip link
"Lewati ke konten" · touch targets ≥ 44 px (Apple HIG; Material 48 dp) · `prefers-reduced-motion`
respected · charts have text alternatives · status never by colour alone · semantic roles
(`radiogroup`, `tablist`, `meter`, `alert`, `aria-live` for the cart and recognition).

## 9. Privacy UX (UU PDP No. 27/2022)

- Enrollment shows a **consent script to read aloud** (what is stored: a numeric template, *not a
  photo*; purpose; deletion on request; automatic deletion after N days; 18+) and a required
  checkbox. No consent → no enrollment.
- No face photos are stored or shown anywhere; avatars are initials.
- *Hapus data wajah* (withdraw consent) is available to any staff member, from the profile, in one
  step — withdrawing consent must be as easy as giving it.
- *Hapus pelanggan* (owner) erases personal data while keeping anonymous sales for bookkeeping.
- Retention screen shows how many faces will be deleted *before* deleting.

## 10. Nielsen's 10 heuristics — where each is applied

| # | Heuristic | Where |
|---|---|---|
| 1 | Visibility of system status | camera-follow indicator, device lights, skeletons, toasts, stale-data labels, nav badge |
| 2 | Match between system and real world | café words, Rupiah, WIB, payment methods used in Indonesia, colour conventions |
| 3 | User control and freedom | lock/unlock customer, *Ganti*, remove tab items, undo menu hide, *Batal* on every dialog |
| 4 | Consistency and standards | one component set, one colour meaning, same pay dialog on Kasir and Tagihan |
| 5 | Error prevention | amount on the button, customer lock, required tab label, change calculator, server validation |
| 6 | Recognition rather than recall | favourites/recommendations as buttons, customer context next to the cart, search by phone |
| 7 | Flexibility and efficiency | `/` search shortcut, quick cash amounts, one-tap feedback, deep links from KPI cards |
| 8 | Aesthetic and minimalist design | one primary action per page, role-based nav, removed debug info from cashier view |
| 9 | Help users recover from errors | plain-language errors + *Coba lagi*, "Bukan dia" → opens customer picker |
| 10 | Help and documentation | empty-state guidance, field hints, camera positioning tips, consent script |

## 11. Other laws used

| Law / principle | Application |
|---|---|
| Hick's law | role-based menus (5 vs. 11), max 4 payment methods, category chips |
| Fitts's law | big menu tiles and pay button, bottom-right primary action, 40–56 px steppers |
| Miller / chunking | owner nav in 4 groups; KPI row of 4; customer panel in short sections |
| Jakob's law | familiar POS layout |
| Doherty threshold (< 400 ms) | optimistic cart (local), skeletons, single `/api/station` request instead of 5 |
| Von Restorff (isolation) | only the main action uses the solid primary colour |
| Serial position | most-used destination first; total at the end of the cart |
| Gestalt: proximity, common region, similarity | customer + suggestions grouped; cards; consistent badges |
| Tesler's law | complexity (association scoring, visit closing, CF) handled by the system, not the cashier |
| Zeigarnik effect | open-tab badge keeps unfinished payments visible |
| Peak-end rule | clear success toast with amount at the end of each transaction |
| Aesthetic-usability effect | calm, consistent styling |

## 12. How to evaluate it (proposal: SUS ≥ 68)

Task scenarios for staff/owner (3–8 people), measure time, errors and SUS afterwards:
1. A recognised regular orders their usual drink and pays by QRIS.
2. An unknown customer agrees to register, then orders and pays cash (Rp 100.000 note).
3. A stay-in customer adds an item to their tab; later pays the whole tab.
4. Remove a wrongly entered item from a tab.
5. (Owner) Find today's revenue and the busiest hour this week.
6. (Owner) Hide a sold-out menu item, then show it again.
7. A customer asks to delete their face data.

## References

- Nielsen, J. (1994). *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group.
- Hick, W. E. (1952). On the rate of gain of information. *Q. J. Exp. Psychol.*, 4(1).
- Fitts, P. M. (1954). The information capacity of the human motor system. *J. Exp. Psychol.*, 47(6).
- Miller, G. A. (1956). The magical number seven, plus or minus two. *Psychol. Review*, 63(2).
- Doherty, W. J., & Thadani, A. J. (1982). *The Economic Value of Rapid Response Time*. IBM.
- Cleveland, W. S., & McGill, R. (1984). Graphical perception. *J. Am. Stat. Assoc.*, 79(387).
- Kurosu, M., & Kashimura, K. (1995). Apparent usability vs. inherent usability. *CHI '95*.
- Yablonski, J. (2020). *Laws of UX*. O'Reilly.
- W3C (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*.
- Apple. *Human Interface Guidelines — Layout (44 pt touch targets)*.
- Brooke, J. (1996). SUS: a "quick and dirty" usability scale.
- Republik Indonesia (2022). UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.
