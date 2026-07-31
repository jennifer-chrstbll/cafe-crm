import api from './api';

export interface OrderItemInput {
  menu_id: string;
  quantity: number;
}

export interface CreateOrderPayload {
  customer_id: string;
  order_type: 'pay_now' | 'pay_later';
  payment_method: 'QRIS' | 'CASH' | 'CARD';
  items: OrderItemInput[];
}

export interface CreateOrderResponse {
  status: string;
  order_id: string;
  order_type: string;
  order_status: 'PAID' | 'UNPAID';
  transaction_id: string | null;
  visit_id: string;
  total_amount: number;
  items_count: number;
}

export interface CheckoutUnpaidPayload {
  customer_id: string;
  payment_method: 'QRIS' | 'CASH' | 'CARD';
}

export const workflowService = {
  createOrder: async (payload: CreateOrderPayload): Promise<CreateOrderResponse> => {
    const response = await api.post<CreateOrderResponse>('/workflow/order', payload);
    return response.data;
  },

  checkoutUnpaidOrder: async (payload: CheckoutUnpaidPayload) => {
    const response = await api.post('/workflow/checkout-unpaid', payload);
    return response.data;
  },

  triggerExitCheck: async (exitTimeoutSeconds: number = 3600) => {
    const response = await api.post('/workflow/exit-check', { exit_timeout_seconds: exitTimeoutSeconds });
    return response.data;
  },
};
