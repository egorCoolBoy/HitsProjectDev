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
                localStorage.setItem('token', token)
            })
    },

    me: async () => {
        return await api.get('/user/me')
    }
}

export default userService