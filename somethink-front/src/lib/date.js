import { useSyncExternalStore } from "react";

// 날짜 키는 모두 사용자 로컬 시간 기준 "YYYY-MM-DD" 문자열입니다.
// (문자열 비교만으로 날짜 순서 비교가 가능합니다: "2026-11-09" < "2026-11-16")

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function fromDateKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(date, amount) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + amount);
    return next;
}

/** dateKey 기준 amount 일 뒤(음수면 앞)의 날짜 키 */
export function shiftDateKey(key, amount) {
    return toDateKey(addDays(fromDateKey(key), amount));
}

/** 오늘(todayKey) 포함 최근 n일의 날짜 키 — 오래된 날 → 오늘 순 */
export function lastNDayKeys(n, todayKey) {
    return Array.from({ length: n }, (_, i) => shiftDateKey(todayKey, i - (n - 1)));
}

/** todayKey 가 속한 주의 월요일 날짜 키 */
export function weekStartKey(todayKey) {
    const date = fromDateKey(todayKey);
    return shiftDateKey(todayKey, -((date.getDay() + 6) % 7));
}

/** 두 날짜 키 사이의 일수 (to - from) */
export function daysBetween(fromKey, toKey) {
    return Math.round((fromDateKey(toKey) - fromDateKey(fromKey)) / 86_400_000);
}

export function weekdayLabel(key) {
    return WEEKDAYS[fromDateKey(key).getDay()];
}

/** "11/16" */
export function shortDateLabel(key) {
    const date = fromDateKey(key);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** "11월 16일 (월)" */
export function longDateLabel(key) {
    const date = fromDateKey(key);
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

/** 타임스탬프(ms) → "11월 16일 14:05" */
export function formatDateTime(ms) {
    const date = new Date(ms);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${hh}:${mm}`;
}

/** 초 → "1시간 5분" · "12분" · "40초" · "0분" */
export function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
    if (m > 0) return `${m}분`;
    return s > 0 ? `${s}초` : "0분";
}

/** 초 → "MM:SS" (1시간 이상이면 "H:MM:SS") — 타이머 표시용 */
export function formatClock(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ── 오늘 날짜 구독 ──────────────────────────────────────
// 자정이 지나거나 잠들었던 탭으로 돌아오면 "오늘" 이 바뀌도록 합니다.

function getTodayKey() {
    return toDateKey(new Date());
}

function subscribeToday(callback) {
    let timeoutId;
    const schedule = () => {
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        timeoutId = setTimeout(() => {
            callback();
            schedule();
        }, nextMidnight.getTime() - now.getTime() + 500);
    };
    schedule();
    document.addEventListener("visibilitychange", callback);
    return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("visibilitychange", callback);
    };
}

/** 오늘 날짜 키("YYYY-MM-DD"). 자정이 지나면 자동으로 다시 렌더링됩니다. */
export function useTodayKey() {
    return useSyncExternalStore(subscribeToday, getTodayKey, getTodayKey);
}
