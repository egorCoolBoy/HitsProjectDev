import api from './api';
import type { TelegramData } from '../types';

interface AuthData {
  initData: string;
  orderId: number | null;
}

const userService = {
  authentication: async (data: AuthData): Promise<TelegramData> => {
    const response = await api.post<TelegramData>('/auth/telegram', data);
    const responseData = response.data;
    localStorage.setItem('access_token', responseData.token);
    return responseData;
  },

  me: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

export default userService;
