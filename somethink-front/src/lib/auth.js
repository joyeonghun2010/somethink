import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

// 로그인 토큰은 기존과 같이 sessionStorage 의 "access_token" 에 저장됩니다.
// 백엔드가 발급하는 JWT 의 payload 는 { sub: 아이디, exp: 만료시각(초) } 입니다.
const TOKEN_KEY = "access_token";
const AUTH_EVENT = "somethink:auth";

function readToken() {
    try {
        return sessionStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function subscribe(callback) {
    window.addEventListener(AUTH_EVENT, callback);
    return () => window.removeEventListener(AUTH_EVENT, callback);
}

export function saveToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_EVENT));
}

/** JWT payload 디코딩 (서명 검증은 서버의 몫이고, 여기서는 화면 표시용으로만 읽습니다) */
export function decodeToken(token) {
    if (!token) return null;
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));
        return payload && typeof payload === "object" ? payload : null;
    } catch {
        return null;
    }
}

/** payload 에서 사용자 정보를 꺼냅니다. 아이디가 없거나 만료된 토큰이면 null */
function toUser(payload, now) {
    if (!payload || payload.sub === undefined || payload.sub === null || payload.sub === "") {
        return null;
    }
    const expiresAt = typeof payload.exp === "number" ? payload.exp * 1000 : null;
    if (expiresAt !== null && expiresAt <= now) return null;
    return { id: String(payload.sub), expiresAt };
}

/** 컴포넌트 밖(이벤트 핸들러 등)에서 현재 사용자를 읽을 때 사용 */
export function getCurrentUser() {
    return toUser(decodeToken(readToken()), Date.now());
}

/**
 * 현재 로그인 상태를 구독하는 훅.
 * @returns {{ user: { id: string, expiresAt: number | null } | null, isLoggedIn: boolean, logout: () => void }}
 */
export function useAuth() {
    const token = useSyncExternalStore(subscribe, readToken, readToken);
    // 만료 판정 기준 시각. 렌더 중에는 Date.now() 를 직접 부르지 않고 상태로 들고 있다가
    // 만료 시각이 되거나 탭으로 돌아왔을 때 갱신합니다.
    const [now, setNow] = useState(() => Date.now());
    const payload = useMemo(() => decodeToken(token), [token]);
    const user = useMemo(() => toUser(payload, now), [payload, now]);
    const expiresAt = typeof payload?.exp === "number" ? payload.exp * 1000 : null;

    useEffect(() => {
        if (expiresAt === null) return undefined;
        const refresh = () => setNow(Date.now());
        const delay = Math.min(Math.max(expiresAt - Date.now(), 0) + 50, 2 ** 31 - 1);
        const timeoutId = setTimeout(refresh, delay);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [expiresAt]);

    return { user, isLoggedIn: user !== null, logout: clearToken };
}
