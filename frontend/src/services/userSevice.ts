import api from './api';
import type {TelegramData} from "../data/TelegramData.ts";


interface AuthData {
    initData: string,
    orderId: number | null
}

const userService = {
    authentication: async (data: AuthData) => {
        const response = await api.post<TelegramData>('/auth/telegram', data)
        const responseData = response.data
        localStorage.setItem('access_token', responseData.token)
        return responseData
    },

    me: async () => {
        return await api.get('/users/me')
    }
}

export default userService
