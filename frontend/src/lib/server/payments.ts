export const PAYMENT_METHODS = ["CASH", "QRIS", "DEBIT", "EWALLET"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const MENU_CATEGORIES = ["COFFEE", "NON_COFFEE", "FOOD", "DESSERT"] as const;
