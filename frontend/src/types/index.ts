export type Role = "OWNER" | "CASHIER" | "ADMIN";
export type Segment = "VIP" | "Regular" | "New";
export type PaymentMethod = "CASH" | "QRIS" | "DEBIT" | "EWALLET";
export type MenuCategory = "COFFEE" | "NON_COFFEE" | "FOOD" | "DESSERT";

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
  last_login?: string | null;
}

export interface Menu {
  menu_id: string;
  name: string;
  description: string | null;
  category: MenuCategory;
  price: number;
  is_active: boolean;
}

export interface CartItem {
  menu: Menu;
  qty: number;
}

export interface CustomerListItem {
  customer_id: string;
  name: string;
  phone_number: string | null;
  created_at: string;
  visit_count: number;
  last_visit: string | null;
  segment: Segment;
  has_face: boolean;
  consent_given: boolean;
}

export interface Recommendation {
  menu_id: string;
  name: string;
  category: string;
  price: number;
  score: number;
  reason: string;
}

export interface TabItem {
  order_id: string;
  menu_id?: string;
  menu_name: string;
  qty: number;
  subtotal: number;
  created_at: string;
}

export interface OpenTab {
  transaction_id: string;
  visit_id: string;
  total_amount: number;
  created_at: string;
  items: TabItem[];
}

export interface CustomerContext {
  customer_id: string;
  name: string;
  phone_number: string | null;
  notes: string | null;
  member_since: string;
  visit_count: number;
  segment: Segment;
  last_visit: string | null;
  has_face: boolean;
  consent_given: boolean;
  active_visit: { visit_id: string; entry_time: string; track_id: string | null } | null;
  open_tab: OpenTab | null;
  recommendation: {
    strategy: "COLLABORATIVE_FILTERING" | "COLD_START_POPULARITY";
    transaction_count: number;
    recommendations: Recommendation[];
    favorites: { menu_id: string; name: string; qty: number }[];
  };
}

export interface StationLog {
  log_id: string;
  customer_id: string | null;
  similarity_score: number | null;
  recognized: boolean;
  is_correct: boolean | null;
  created_at: string;
}

export type Station =
  | { state: "idle"; window_sec: number }
  | { state: "unknown"; log: StationLog; window_sec: number }
  | { state: "known"; log: StationLog; customer: CustomerContext; window_sec: number };

export interface Tab {
  transaction_id: string;
  visit_id: string;
  created_at: string;
  customer_id: string | null;
  name: string;
  label: string | null;
  is_guest: boolean;
  items: TabItem[];
  total_amount: number;
  minutes_open: number;
}

export interface Device {
  device_id: string;
  kind: "facerec" | "persontrack" | string;
  last_seen_at: string;
  online: boolean;
  seconds_ago: number;
  info: Record<string, unknown>;
}

export interface AppSettings {
  cafe: { name: string; floors: { floor: number; capacity: number }[] };
  devices: { cashier_camera_id: string; area_camera_id: string; stream_url: string };
  association: {
    roi: { x1: number; y1: number; x2: number; y2: number };
    anchor: { x: number; y: number };
    theta: number;
    weights: { spatial: number; kinematic: number; temporal: number };
    sigma: { spatial: number; kinematic: number; temporal: number };
  };
  visits: { exit_timeout_minutes: number; max_open_hours: number };
  privacy: { retention_days: number };
}
