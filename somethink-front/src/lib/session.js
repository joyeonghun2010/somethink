import { clearToken } from "./auth";
import { resetTimer } from "./timer";

/** 로그아웃: 실행 중인 타이머의 공부 시간을 저장하고 초기화한 뒤 로그인 토큰을 지웁니다. */
export function signOut() {
    resetTimer();
    clearToken();
}
