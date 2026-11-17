import { useSyncExternalStore } from "react";
import { addStudySeconds } from "./store";
import { playChime, primeAudio } from "./sound";

/*
 * 공부 타이머 (앱 전체에서 하나).
 *
 * - 페이지를 이동해도 계속 흐르고, 새로고침해도 sessionStorage 에서 복원됩니다.
 * - 남은 시간은 "끝나는 시각(endAt) - 현재 시각" 으로 계산하므로 탭이 백그라운드에 있어도 정확합니다.
 * - 흐른 공부 시간은 COMMIT_EVERY_MS 마다, 그리고 일시정지/초기화/종료/페이지 이탈 때
 *   타이머를 시작한 사용자(ownerId)의 공부 기록에 더해집니다. 게스트(ownerId=null)는 기록하지 않습니다.
 *
 * TimerState = {
 *   duration: number,               // 설정 시간(초)
 *   status: "idle" | "running" | "paused" | "finished",
 *   remainingMs: number,            // 남은 시간(ms). 화면에 보이는 초가 바뀔 때마다 갱신
 *   endAt: number | null,           // running 일 때 끝나는 시각(ms)
 *   ownerId: string | null,         // 공부 시간을 기록할 사용자 아이디
 *   lastCommitAt: number | null,    // running 일 때 마지막으로 공부 시간을 저장한 시각(ms)
 * }
 */

const STORAGE_KEY = "somethink:timer";
const TICK_MS = 250;
const COMMIT_EVERY_MS = 10_000;
const STATUSES = ["idle", "running", "paused", "finished"];

/** 빠른 선택 버튼에 쓰는 시간(분) */
export const TIMER_PRESETS = [15, 25, 30, 50];
/** 직접 입력할 수 있는 범위(분) */
export const TIMER_LIMITS = { min: 1, max: 180 };
export const DEFAULT_TIMER_MINUTES = 30;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function idleState(duration) {
    return {
        duration,
        status: "idle",
        remainingMs: duration * 1000,
        endAt: null,
        ownerId: null,
        lastCommitAt: null,
    };
}

function loadState() {
    try {
        const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        if (!raw || !Number.isFinite(raw.duration) || !STATUSES.includes(raw.status)) {
            return idleState(DEFAULT_TIMER_MINUTES * 60);
        }
        const duration = clamp(Math.round(raw.duration), TIMER_LIMITS.min * 60, TIMER_LIMITS.max * 60);
        const ownerId = typeof raw.ownerId === "string" && raw.ownerId ? raw.ownerId : null;
        if (raw.status === "running" && Number.isFinite(raw.endAt) && Number.isFinite(raw.lastCommitAt)) {
            return {
                duration,
                status: "running",
                remainingMs: clamp(raw.endAt - Date.now(), 0, duration * 1000),
                endAt: raw.endAt,
                ownerId,
                lastCommitAt: Math.min(raw.lastCommitAt, raw.endAt),
            };
        }
        if (raw.status === "paused" && Number.isFinite(raw.remainingMs) && raw.remainingMs > 0) {
            return { ...idleState(duration), status: "paused", remainingMs: clamp(raw.remainingMs, 0, duration * 1000), ownerId };
        }
        if (raw.status === "finished") {
            return { ...idleState(duration), status: "finished", remainingMs: 0 };
        }
        return idleState(duration);
    } catch {
        return idleState(DEFAULT_TIMER_MINUTES * 60);
    }
}

let state = loadState();
let intervalId = null;
const listeners = new Set();
const finishListeners = new Set();

function persist() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // 저장 실패해도 타이머는 계속 동작
    }
}

function setState(next) {
    state = next;
    persist();
    listeners.forEach((listener) => listener());
}

function startTicking() {
    if (intervalId === null) intervalId = setInterval(tick, TICK_MS);
}

function stopTicking() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

/**
 * running 상태에서 upTo 시각까지 흐른 공부 시간을 기록하고, 새 lastCommitAt 을 돌려줍니다.
 * 중간 저장은 내림(남은 1초 미만은 다음에 이어서), 마지막 저장(final)은 반올림합니다.
 */
function commitUntil(upTo, final = false) {
    const { ownerId, lastCommitAt } = state;
    if (lastCommitAt === null) return null;
    const elapsed = (upTo - lastCommitAt) / 1000;
    const seconds = final ? Math.round(elapsed) : Math.floor(elapsed);
    if (seconds <= 0) return lastCommitAt;
    if (ownerId) addStudySeconds(ownerId, seconds, new Date(upTo));
    return lastCommitAt + seconds * 1000;
}

function finish() {
    const { duration, ownerId, endAt } = state;
    commitUntil(endAt, true);
    setState({ ...state, status: "finished", remainingMs: 0, endAt: null, lastCommitAt: null });
    stopTicking();
    playChime();
    finishListeners.forEach((listener) => listener({ duration, ownerId }));
}

function tick() {
    if (state.status !== "running") {
        stopTicking();
        return;
    }
    const now = Date.now();
    if (now >= state.endAt) {
        finish();
        return;
    }
    let { lastCommitAt } = state;
    if (now - lastCommitAt >= COMMIT_EVERY_MS) lastCommitAt = commitUntil(now);
    const remainingMs = state.endAt - now;
    const secondChanged = Math.ceil(remainingMs / 1000) !== Math.ceil(state.remainingMs / 1000);
    if (secondChanged || lastCommitAt !== state.lastCommitAt) {
        setState({ ...state, remainingMs, lastCommitAt });
    }
}

// 새로고침 전에 실행 중이던 타이머 이어가기 + 페이지를 떠날 때 공부 시간 저장
if (typeof window !== "undefined") {
    if (state.status === "running") startTicking();
    window.addEventListener("pagehide", () => {
        if (state.status !== "running") return;
        const lastCommitAt = commitUntil(Math.min(Date.now(), state.endAt));
        state = { ...state, lastCommitAt };
        persist();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") tick();
    });
}

// ── 조작 ─────────────────────────────────────────────────

/**
 * 타이머 시작/이어하기. 반드시 클릭 같은 사용자 동작 안에서 호출하세요 (알림음 준비 때문).
 * @param {string|null} ownerId  공부 시간을 기록할 사용자 아이디 (게스트면 null)
 */
export function startTimer(ownerId) {
    if (state.status === "running") return;
    primeAudio();
    const now = Date.now();
    const remainingMs =
        state.status === "finished" || state.remainingMs <= 0 ? state.duration * 1000 : state.remainingMs;
    setState({
        ...state,
        status: "running",
        remainingMs,
        endAt: now + remainingMs,
        ownerId: ownerId ?? null,
        lastCommitAt: now,
    });
    startTicking();
}

export function pauseTimer() {
    if (state.status !== "running") return;
    const now = Date.now();
    if (now >= state.endAt) {
        finish();
        return;
    }
    commitUntil(now, true);
    setState({ ...state, status: "paused", remainingMs: state.endAt - now, endAt: null, lastCommitAt: null });
    stopTicking();
}

/** 처음 설정 시간으로 되돌립니다. 실행 중이었다면 그때까지의 공부 시간은 기록됩니다. */
export function resetTimer() {
    if (state.status === "running") commitUntil(Math.min(Date.now(), state.endAt), true);
    setState(idleState(state.duration));
    stopTicking();
}

/** 타이머 시간을 분 단위로 바꿉니다 (실행 중에는 무시). 바꾸면 초기화됩니다. */
export function setTimerMinutes(minutes) {
    if (state.status === "running") return;
    const value = clamp(Math.round(Number(minutes)) || DEFAULT_TIMER_MINUTES, TIMER_LIMITS.min, TIMER_LIMITS.max);
    setState(idleState(value * 60));
}

/** 게스트로 시작한 타이머를 로그인한 사용자에게 넘깁니다 (지금부터의 시간만 기록). */
export function claimTimer(ownerId) {
    if (!ownerId || state.ownerId === ownerId) return;
    if (state.status === "running") {
        if (state.ownerId) commitUntil(Math.min(Date.now(), state.endAt), true);
        setState({ ...state, ownerId, lastCommitAt: Date.now() });
    } else if (state.status === "paused") {
        setState({ ...state, ownerId });
    }
}

/** 타이머가 끝났을 때 호출될 함수를 등록합니다. 해제 함수를 반환합니다. */
export function onTimerFinish(listener) {
    finishListeners.add(listener);
    return () => finishListeners.delete(listener);
}

// ── React 훅 ─────────────────────────────────────────────

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return state;
}

/** 타이머 상태(TimerState)를 구독합니다. 조작은 startTimer/pauseTimer/... 함수로 하세요. */
export function useTimer() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 화면에 보여줄 남은 초 */
export function getRemainingSeconds(timer) {
    return Math.ceil(timer.remainingMs / 1000);
}

/** 진행률 0~1 */
export function getTimerProgress(timer) {
    const total = timer.duration * 1000;
    return total > 0 ? clamp(1 - timer.remainingMs / total, 0, 1) : 0;
}
