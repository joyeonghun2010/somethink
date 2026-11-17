import { useSyncExternalStore } from "react";

// 로그인/회원가입 팝업의 열림 상태. 어디서든 openAuthModal("login") 으로 띄울 수 있습니다.
// 실제 표시는 Layout 안의 <AuthModal /> 가 담당합니다.
//
// session 은 팝업을 새로 열 때마다 1씩 늘어납니다. 폼의 key 로 써서 열 때마다 입력값을 비웁니다.

let state = { open: false, mode: "login", session: 0 };
const listeners = new Set();

function setState(next) {
    if (next.open === state.open && next.mode === state.mode && next.session === state.session) return;
    state = next;
    listeners.forEach((listener) => listener());
}

/** @param {"login" | "signup"} [mode] */
export function openAuthModal(mode = "login") {
    setState({ open: true, mode, session: state.open ? state.session : state.session + 1 });
}

export function closeAuthModal() {
    setState({ ...state, open: false });
}

/** 팝업 안에서 로그인 ↔ 회원가입 전환 */
export function setAuthMode(mode) {
    setState({ ...state, mode });
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return state;
}

/** @returns {{ open: boolean, mode: "login" | "signup", session: number }} */
export function useAuthModal() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
