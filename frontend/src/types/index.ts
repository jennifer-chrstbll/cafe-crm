export interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'CASHIER' | 'ADMIN';
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  phone_number: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  notes: string | null;
  is_active: boolean;
  visit_count: number;
  last_visit: string | null;
  segment?: string | null;
}

export interface Visit {
  visit_id: string;
  customer_id: string;
  customer_name: string;
  entry_time: string;
  exit_time: string | null;
  duration_minutes: number | null;
}

export interface RecognitionLog {
  log_id: string;
  customer_id: string | null;
  customer_name: string | null;
  similarity_score: number | null;
  recognized: boolean;
  camera_id: string | null;
  model_used: string | null;
  created_at: string;
}

export interface DashboardSummary {
  total_customers: number;
  today_visits: number;
  recognized_today: number;
  unknown_today: number;
  total_orders: number;
  total_revenue: number;
}

export interface Menu {
  menu_id: string;
  name: string;
  description: string | null;
  category: 'COFFEE' | 'NON_COFFEE' | 'FOOD' | 'DESSERT';
  price: number;
  is_active: boolean;
}

export interface CartItem {
  menu: Menu;
  qty: number;
}

export interface OrderItemDetail {
  menu_name: string;
  qty: number;
  subtotal: number;
}

export interface CustomerOrder {
  visit_id: string;
  entry_time: string;
  items: OrderItemDetail[];
  total: number;
}

export interface ProductAnalytics {
  menu_name: string;
  category: string;
  total_qty: number;
  total_revenue: number;
}

export interface CustomerSegment {
  segment: string;
  count: number;
}

export interface FavoriteItem {
  menu_name: string;
  total_qty: number;
}

export interface UnpaidOrderInfo {
  transaction_id: string;
  visit_id: string;
  total_amount: number;
  items: { menu_name: string; qty: number; subtotal: number }[];
}

export interface LiveEvent {
  log_id: string;
  recognized: boolean;
  customer_id: string | null;
  customer_name: string | null;
  similarity_score: number | null;
  visit_count: number | null;
  segment: string | null;
  member_since: string | null;
  favorites: FavoriteItem[];
  unpaid_order?: UnpaidOrderInfo | null;
  snapshot_url?: string | null;
  has_active_visit?: boolean;
  photo_temporary?: boolean;
  created_at: string;
}

