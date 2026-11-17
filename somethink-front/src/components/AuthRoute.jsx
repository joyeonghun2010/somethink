import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { openAuthModal } from "../lib/authModal";

/** 예전 /login · /signup 주소로 들어오면 홈으로 보내고 로그인 팝업을 띄웁니다. */
export default function AuthRoute({ mode }) {
    const { isLoggedIn } = useAuth();

    useEffect(() => {
        if (!isLoggedIn) openAuthModal(mode);
    }, [isLoggedIn, mode]);

    return <Navigate to={isLoggedIn ? "/main" : "/"} replace />;
}
