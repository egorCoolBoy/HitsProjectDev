import api from './api';

interface AuthData {
    initData: string,
    orderId: number | null
}

const userService = {
    authentication: (data: AuthData) => {
        api.post<string>('/auth/telegram', data)
            .then((response) => {
                const token = response.data
                localStorage.setItem('access_token', token)
            })
    },

    me: async () => {
        return await api.get('/users/me')
    }
}

export default userService
