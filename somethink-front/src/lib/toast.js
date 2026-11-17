import { useSyncExternalStore } from "react";

// 화면 하단에 잠깐 떴다 사라지는 알림. 어디서든 showToast("저장했어요") 로 띄울 수 있습니다.
// 실제 표시는 Layout 안의 <Toaster /> 가 담당합니다.

let current = null;
let nextId = 1;
let hideTimeoutId = null;
const listeners = new Set();

function emit() {
    listeners.forEach((listener) => listener());
}

/**
 * @param {string} message
 * @param {{ tone?: "default" | "success" | "error", icon?: string, duration?: number }} [options]
 *   icon: components/Icon 의 아이콘 이름 (없으면 tone 에 맞는 기본 아이콘)
 */
export function showToast(message, { tone = "default", icon = null, duration = 2800 } = {}) {
    current = { id: nextId, message, tone, icon };
    nextId += 1;
    emit();
    clearTimeout(hideTimeoutId);
    hideTimeoutId = setTimeout(hideToast, duration);
}

export function hideToast() {
    clearTimeout(hideTimeoutId);
    if (current === null) return;
    current = null;
    emit();
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return current;
}

/** 현재 표시 중인 토스트 { id, message, tone, icon } 또는 null */
export function useToast() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
