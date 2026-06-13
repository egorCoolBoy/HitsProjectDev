import api from './api';

export type ApiOrder = {
  id: number;
  title: string | null;
  isClosed: boolean;
  participants: ApiOrderParticipant[];
  createdAt: string;
};

export type ApiOrderParticipant = {
  id: number;
  role: 'creator' | 'member';
  user: ApiUser;
  createdAt: string;
};

export type ApiUser = {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiOrderExpense = {
  id: number;
  orderId: number;
  title: string | null;
  price: number;
  quantity: number;
  totalPrice: number;
  participantCount: number;
  isParticipating: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderPayload = {
  title: string | null;
};

export type ChangeOrderTitlePayload = {
  title: string | null;
};

export type ChangeOrderStatusPayload = {
  isClosed: boolean;
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

  listExpenses: async (orderId: number) => {
    const response = await api.get<ApiOrderExpense[]>(`/orders/${orderId}/expenses`);
    return response.data;
  },

  createExpense: async (orderId: number, payload: CreateExpensePayload) => {
    const response = await api.post<ApiOrderExpense>(`/orders/${orderId}/expenses`, payload);
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

  createInviteLink: async (id: number) => {
    const response = await api.post<{ url: string | null }>(`/orders/${id}/invite-link`);
    return response.data;
  },
};

export default orderService;
