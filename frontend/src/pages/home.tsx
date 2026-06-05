import {useTelegram} from "../hooks/useTelegram.ts";
import {useAuth} from "../hooks/useAuth.ts";

const HomePage = () => {

    const { initData, user } = useTelegram();
    const auth = useAuth(initData)
    if (auth.isPending) {
        return <div>Loading...</div>;
    }
    if (auth.isError) {
        return <div>Auth failed: {auth.error.message}</div>;
    }

    const name = user?.first_name

    return (
        <>
            {name ? <h1>Hello, {name}!</h1> : <h1>I don't know who you are -_-</h1>}
        </>
    )
}

export default HomePage