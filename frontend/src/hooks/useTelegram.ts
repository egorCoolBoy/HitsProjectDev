export const useTelegram = () => {

    const tg = Telegram.WebApp;

    return {
        tg,
        user: tg.initDataUnsafe?.user,
        initData: tg.initData,
    };
};