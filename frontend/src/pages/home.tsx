import {useTelegram} from "../hooks/telegram.ts";

const HomePage = () => {

    const {tg, user} = useTelegram()
    console.log(tg)

    const name = user?.toString()

    return (
        <>
            {name ? <h1>Hello, {name}!</h1> : <h1>I don't know who you are</h1>}
        </>
    )
}

export default HomePage