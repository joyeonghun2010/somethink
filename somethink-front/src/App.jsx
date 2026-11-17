import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";

import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import AuthRoute from "./components/AuthRoute";
import Home from "./pages/home";
import Main from "./pages/main";
import Stats from "./pages/stats";
import Leaderboard from "./pages/leaderboard";
import Profile from "./pages/profile";

function App() {
    return (
        <BrowserRouter>

            <Routes>

                {/* 상단 메뉴가 있는 화면들 (로그인 · 회원가입은 Layout 의 팝업으로 열립니다) */}
                <Route element={<Layout />}>

                    <Route path="/" element={<Home />} />

                    <Route path="/main" element={<Main />} />

                    <Route
                        path="/stats"
                        element={
                            <RequireAuth description="로그인하면 지금까지의 공부 통계를 볼 수 있어요.">
                                <Stats />
                            </RequireAuth>
                        }
                    />

                    <Route path="/leaderboard" element={<Leaderboard />} />

                    <Route
                        path="/profile"
                        element={
                            <RequireAuth description="로그인하면 나의 프로필을 꾸밀 수 있어요.">
                                <Profile />
                            </RequireAuth>
                        }
                    />

                    {/* 예전 로그인 · 회원가입 페이지 주소 → 홈에서 팝업으로 */}
                    <Route path="/login" element={<AuthRoute mode="login" />} />

                    <Route path="/signup" element={<AuthRoute mode="signup" />} />

                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>

        </BrowserRouter>
    );
}

export default App;
