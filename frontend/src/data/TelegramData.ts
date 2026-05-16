export interface TelegramData {
    token: string,
    user: {
        id: number,
        telegramId: number,
        username: string,
        firstName: string,
        createdAt: string,
        updatedAt: string,
    },
    order: {
        id: number,
        role: string,
    }
}

