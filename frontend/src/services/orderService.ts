import api from './api';
import type {
  ApiImportReceiptExpenses,
  ApiMyDebts,
  ApiOrder,
  ApiOrderExpense,
  ApiPayment,
} from '../types';

export type CreateOrderPayload = {
  title: string | null;
};

export type ChangeOrderTitlePayload = {
  title: string | null;
};

export type ChangeOrderStatusPayload = {
  isClosed: boolean;
};

export type UpsertPaymentPayload = {
  userId: number;
  amount: number;
};

export type CalculateDebtsPayload = {
  payments: Array<{
    userId: number;
    paidAmount: number;
  }>;
};

export type CreateExpensePayload = {
  title: string | null;
  price: number;
  quantity: number;
};

export type UpdateExpensePayload = CreateExpensePayload;

const orderService = {
  list: async () => {
    const response = await api.get<ApiOrder[]>('/orders');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiOrder>(`/orders/${id}`);
    return response.data;
  },

  create: async (payload: CreateOrderPayload) => {
    const response = await api.post<ApiOrder>('/orders', payload);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/orders/${id}`);
  },

  changeTitle: async (id: number, payload: ChangeOrderTitlePayload) => {
    const response = await api.patch<ApiOrder>(`/orders/${id}/title`, payload);
    return response.data;
  },

  changeStatus: async (id: number, payload: ChangeOrderStatusPayload) => {
    const response = await api.patch<ApiOrder>(`/orders/${id}/status`, payload);
    return response.data;
  },

  listPayments: async (orderId: number) => {
    const response = await api.get<ApiPayment[]>(`/orders/${orderId}/payments`);
    return response.data;
  },

  upsertPayment: async (orderId: number, payload: UpsertPaymentPayload) => {
    const response = await api.post<ApiPayment>(`/orders/${orderId}/payments`, payload);
    return response.data;
  },

  calculateDebts: async (orderId: number, payload: CalculateDebtsPayload) => {
    const response = await api.post(`/orders/${orderId}/calculate-debts`, payload);
    return response.data;
  },

  getMyDebts: async () => {
    const response = await api.get<ApiMyDebts>('/debts/my', {
      params: { status: 'active', sortDirection: 'desc' },
    });
    return response.data;
  },

  requestDebtSettlement: async (debtId: number) => {
    const response = await api.post(`/debts/${debtId}/settlement-request`);
    return response.data;
  },

  confirmDebtSettlement: async (debtId: number) => {
    const response = await api.post(`/debts/${debtId}/settlement-confirm`);
    return response.data;
  },

  rejectDebtSettlement: async (debtId: number) => {
    const response = await api.post(`/debts/${debtId}/settlement-reject`);
    return response.data;
  },

  listExpenses: async (orderId: number) => {
    const response = await api.get<ApiOrderExpense[]>(`/orders/${orderId}/expenses`);
    return response.data;
  },

  createExpense: async (orderId: number, payload: CreateExpensePayload) => {
    const response = await api.post<ApiOrderExpense>(`/orders/${orderId}/expenses`, payload);
    return response.data;
  },

  importReceipt: async (orderId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiImportReceiptExpenses>(
      `/orders/${orderId}/expenses/receipt`,
      formData,
    );
    return response.data;
  },

  updateExpense: async (orderId: number, expenseId: number, payload: UpdateExpensePayload) => {
    const response = await api.patch<ApiOrderExpense>(`/orders/${orderId}/expenses/${expenseId}`, payload);
    return response.data;
  },

  deleteExpense: async (orderId: number, expenseId: number) => {
    await api.delete(`/orders/${orderId}/expenses/${expenseId}`);
  },

  toggleExpenseParticipation: async (orderId: number, expenseId: number, share: number) => {
    const response = await api.post<ApiOrderExpense>(`/orders/${orderId}/expenses/${expenseId}/participation`, {
      share,
    });
    return response.data;
  },

  setExpenseParticipations: async (
    orderId: number,
    expenseId: number,
    participants: Array<{ userId: number; share: number }>,
  ) => {
    const response = await api.put<ApiOrderExpense>(`/orders/${orderId}/expenses/${expenseId}/participation`, {
      participants,
    });
    return response.data;
  },

  createInviteLink: async (id: number) => {
    const response = await api.post<{ url: string | null }>(`/orders/${id}/invite-link`);
    return response.data;
  },
};

export default orderService;
