import { useAuth } from "../lib/auth";
import LoginRequired from "./LoginRequired";

/** 로그인한 사용자에게만 children 을 보여주고, 아니면 로그인 안내를 보여줍니다. */
export default function RequireAuth({ children, title, description }) {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return <LoginRequired title={title} description={description} />;
    return children;
}
