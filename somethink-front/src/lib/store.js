import { useCallback, useSyncExternalStore } from "react";
import { toDateKey } from "./date";

/*
 * 공부 기록 · 프로필 저장소 (localStorage).
 *
 * 아직 백엔드에 공부 기록/프로필 API 가 없어서 브라우저에 사용자별로 저장합니다.
 * 나중에 서버 API 가 생기면 이 파일의 read/write 함수만 fetch 로 바꾸면 됩니다.
 *
 *   somethink:v1:study:<아이디>   → StudyData
 *   somethink:v1:profile:<아이디> → Profile
 *
 * StudyData = {
 *   days: { "YYYY-MM-DD": { seconds: number, theoryIds: string[] } },  // 그날 공부한 시간(초)·이론(하루에 같은 이론은 1번)
 *   history: [{ theoryId, title, category, at }],                      // 공부 완료 기록, 최신순 (최대 HISTORY_LIMIT 개)
 * }
 * Profile = { name, email, bio, interests: string[], dailyGoal, avatarColor, createdAt, updatedAt }
 */

const PREFIX = "somethink:v1:";
const STUDY_PREFIX = `${PREFIX}study:`;
const PROFILE_PREFIX = `${PREFIX}profile:`;
const HISTORY_LIMIT = 300;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PROFILE_LIMITS = { name: 20, email: 100, bio: 150, dailyGoalMin: 1, dailyGoalMax: 20 };
export const DEFAULT_DAILY_GOAL = 3;
/** 아바타 배경색 (흰 글자 대비 4.5:1 이상) */
export const AVATAR_COLORS = [
    "#111111",
    "#007a72",
    "#2563c9",
    "#c2410c",
    "#6d4ae0",
    "#be3a34",
    "#0f7b5f",
    "#8a5a00",
];

// ── 변경 구독 ────────────────────────────────────────────

const listeners = new Set();
let version = 0;

function emitChange() {
    version += 1;
    listeners.forEach((listener) => listener());
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// 다른 탭에서 기록이 바뀌어도 화면이 갱신되도록
if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
        if (event.key === null || event.key.startsWith(PREFIX)) emitChange();
    });
}

// ── 저수준 읽기/쓰기 ──────────────────────────────────────

// 같은 원본 문자열이면 같은 객체를 돌려줘야 useSyncExternalStore 가 불필요하게 다시 렌더링하지 않습니다.
const cache = new Map();

function readRaw(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function parseJSON(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function readCached(key, normalize) {
    const raw = readRaw(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value;
    const value = normalize(parseJSON(raw));
    cache.set(key, { raw, value });
    return value;
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("[somethink] 기록을 저장하지 못했습니다.", error);
    }
    emitChange();
}

// ── 정규화 (깨진/옛날 데이터 방어) ───────────────────────

const EMPTY_STUDY = Object.freeze({ days: Object.freeze({}), history: Object.freeze([]) });

function normalizeStudy(raw) {
    if (!raw || typeof raw !== "object") return EMPTY_STUDY;
    const days = {};
    if (raw.days && typeof raw.days === "object") {
        for (const [key, day] of Object.entries(raw.days)) {
            if (!DATE_KEY_RE.test(key) || !day || typeof day !== "object") continue;
            const seconds = Number.isFinite(day.seconds) && day.seconds > 0 ? Math.floor(day.seconds) : 0;
            const theoryIds = Array.isArray(day.theoryIds)
                ? [...new Set(day.theoryIds.filter((id) => typeof id === "string" && id))]
                : [];
            if (seconds > 0 || theoryIds.length > 0) days[key] = { seconds, theoryIds };
        }
    }
    const history = Array.isArray(raw.history)
        ? raw.history
              .filter((item) => item && typeof item.theoryId === "string" && Number.isFinite(item.at))
              .map((item) => ({
                  theoryId: item.theoryId,
                  title: typeof item.title === "string" ? item.title : item.theoryId,
                  category: typeof item.category === "string" ? item.category : "기타",
                  at: item.at,
              }))
              .slice(0, HISTORY_LIMIT)
        : [];
    return { days, history };
}

function clampInt(value, min, max, fallback) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
}

function cleanText(value, maxLength) {
    return typeof value === "string" ? value.slice(0, maxLength) : "";
}

const EMPTY_PROFILE = Object.freeze({
    name: "",
    email: "",
    bio: "",
    interests: Object.freeze([]),
    dailyGoal: DEFAULT_DAILY_GOAL,
    avatarColor: null,
    createdAt: null,
    updatedAt: null,
});

function normalizeProfile(raw) {
    if (!raw || typeof raw !== "object") return EMPTY_PROFILE;
    return {
        name: cleanText(raw.name, PROFILE_LIMITS.name),
        email: cleanText(raw.email, PROFILE_LIMITS.email),
        bio: cleanText(raw.bio, PROFILE_LIMITS.bio),
        interests: Array.isArray(raw.interests)
            ? [...new Set(raw.interests.filter((item) => typeof item === "string" && item))]
            : [],
        dailyGoal: clampInt(
            raw.dailyGoal,
            PROFILE_LIMITS.dailyGoalMin,
            PROFILE_LIMITS.dailyGoalMax,
            DEFAULT_DAILY_GOAL,
        ),
        avatarColor: AVATAR_COLORS.includes(raw.avatarColor) ? raw.avatarColor : null,
        createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : null,
        updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : null,
    };
}

// ── 공부 기록 ────────────────────────────────────────────

/** 사용자의 공부 기록 (없으면 빈 기록). 반환값은 읽기 전용으로 다루세요. */
export function readStudy(userId) {
    return userId ? readCached(STUDY_PREFIX + userId, normalizeStudy) : EMPTY_STUDY;
}

function cloneStudy(study) {
    const days = {};
    for (const [key, day] of Object.entries(study.days)) {
        days[key] = { seconds: day.seconds, theoryIds: [...day.theoryIds] };
    }
    return { days, history: [...study.history] };
}

/** 공부 시간(초)을 date 가 속한 날짜에 더합니다. 타이머가 자동으로 호출합니다. */
export function addStudySeconds(userId, seconds, date = new Date()) {
    const amount = Math.floor(seconds);
    if (!userId || !(amount > 0)) return;
    const study = cloneStudy(readStudy(userId));
    const key = toDateKey(date);
    const day = study.days[key] ?? { seconds: 0, theoryIds: [] };
    study.days[key] = { ...day, seconds: day.seconds + amount };
    writeJSON(STUDY_PREFIX + userId, study);
}

/**
 * 이론 공부 완료를 기록합니다. 같은 날 같은 이론은 한 번만 집계됩니다.
 * @param {{ id: string, title: string, category: string }} theory
 * @returns {boolean} 새로 기록되었으면 true, 이미 오늘 기록된 이론이면 false
 */
export function markTheoryStudied(userId, theory, date = new Date()) {
    if (!userId || !theory?.id) return false;
    const study = cloneStudy(readStudy(userId));
    const key = toDateKey(date);
    const day = study.days[key] ?? { seconds: 0, theoryIds: [] };
    if (day.theoryIds.includes(theory.id)) return false;
    study.days[key] = { ...day, theoryIds: [...day.theoryIds, theory.id] };
    study.history = [
        { theoryId: theory.id, title: theory.title, category: theory.category, at: date.getTime() },
        ...study.history,
    ].slice(0, HISTORY_LIMIT);
    writeJSON(STUDY_PREFIX + userId, study);
    return true;
}

/** 오늘(date) 기록한 이론 완료를 취소합니다. @returns {boolean} 취소되었으면 true */
export function unmarkTheoryStudied(userId, theoryId, date = new Date()) {
    if (!userId || !theoryId) return false;
    const study = cloneStudy(readStudy(userId));
    const key = toDateKey(date);
    const day = study.days[key];
    if (!day || !day.theoryIds.includes(theoryId)) return false;
    const theoryIds = day.theoryIds.filter((id) => id !== theoryId);
    if (theoryIds.length === 0 && day.seconds === 0) delete study.days[key];
    else study.days[key] = { ...day, theoryIds };
    const index = study.history.findIndex(
        (item) => item.theoryId === theoryId && toDateKey(new Date(item.at)) === key,
    );
    if (index !== -1) study.history.splice(index, 1);
    writeJSON(STUDY_PREFIX + userId, study);
    return true;
}

// ── 프로필 ───────────────────────────────────────────────

/** 사용자의 프로필 (없으면 기본값). 반환값은 읽기 전용으로 다루세요. */
export function readProfile(userId) {
    return userId ? readCached(PROFILE_PREFIX + userId, normalizeProfile) : EMPTY_PROFILE;
}

/** 프로필 일부를 저장합니다. 저장된 최종 프로필을 반환합니다. */
export function saveProfile(userId, patch) {
    if (!userId) return EMPTY_PROFILE;
    const current = readProfile(userId);
    const now = Date.now();
    const next = normalizeProfile({
        ...current,
        ...patch,
        createdAt: current.createdAt ?? now,
        updatedAt: now,
    });
    writeJSON(PROFILE_PREFIX + userId, next);
    return next;
}

/** 로그인한 사용자를 이 기기에 처음 등록합니다 (프로필이 없을 때만 생성). */
export function ensureUserRecord(userId) {
    if (!userId || readRaw(PROFILE_PREFIX + userId) !== null) return;
    writeJSON(PROFILE_PREFIX + userId, { ...EMPTY_PROFILE, createdAt: Date.now() });
}

/** 화면에 보여줄 이름: 프로필 이름 → 없으면 아이디 */
export function getDisplayName(profile, userId) {
    return profile?.name?.trim() || userId || "게스트";
}

/** 아바타 색: 프로필에서 고른 색 → 없으면 아이디로 정해지는 고정 색 */
export function getAvatarColor(profile, userId) {
    if (profile?.avatarColor) return profile.avatarColor;
    let hash = 0;
    for (const char of String(userId ?? "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ── 전체 사용자 (리더보드) ────────────────────────────────

/** 이 브라우저에 기록이 있는 모든 사용자 아이디 */
export function listUserIds() {
    const ids = new Set();
    try {
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key?.startsWith(STUDY_PREFIX)) ids.add(key.slice(STUDY_PREFIX.length));
            else if (key?.startsWith(PROFILE_PREFIX)) ids.add(key.slice(PROFILE_PREFIX.length));
        }
    } catch {
        // localStorage 를 쓸 수 없는 환경이면 빈 목록
    }
    return [...ids].filter(Boolean).sort();
}

let usersCache = { version: -1, value: [] };

function getAllUsersSnapshot() {
    if (usersCache.version !== version) {
        usersCache = {
            version,
            value: listUserIds().map((id) => ({ id, study: readStudy(id), profile: readProfile(id) })),
        };
    }
    return usersCache.value;
}

// ── React 훅 ─────────────────────────────────────────────

/** 사용자의 공부 기록을 구독합니다. userId 가 없으면 빈 기록. */
export function useStudy(userId) {
    const getSnapshot = useCallback(() => readStudy(userId), [userId]);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 사용자의 프로필을 구독합니다. userId 가 없으면 기본값. */
export function useProfile(userId) {
    const getSnapshot = useCallback(() => readProfile(userId), [userId]);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 이 브라우저의 모든 사용자 [{ id, study, profile }] 를 구독합니다 (리더보드용). */
export function useAllUsers() {
    return useSyncExternalStore(subscribe, getAllUsersSnapshot, getAllUsersSnapshot);
}
