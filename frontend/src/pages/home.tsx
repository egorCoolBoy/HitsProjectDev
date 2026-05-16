import {useTelegram} from "../hooks/telegram.ts";

const HomePage = () => {

    const {tg} = useTelegram()
    console.log(tg)

    return (
        <>
            <h1>Home sweet home</h1>
        </>
    )
}

export default HomePage