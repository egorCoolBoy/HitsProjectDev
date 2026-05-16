import userService from "../services/userSevice.ts";

export const useTelegram = () => {

    const tg = Telegram.WebApp;

    userService.authentication({
        initData: tg.initData,
        orderId: null
    })

    return {
        tg,
        user: tg.initDataUnsafe?.user,
        queryId: tg.initDataUnsafe?.query_id,
    };
};