import { lastNDayKeys, shiftDateKey, weekStartKey } from "./date";
import { getTheoryById } from "./theory";

// 공부 기록(StudyData)에서 화면에 필요한 수치를 계산하는 순수 함수들.
// todayKey 는 useTodayKey() 로 얻은 "YYYY-MM-DD" 를 넘겨주세요.

function isActiveDay(day) {
    return Boolean(day) && (day.seconds > 0 || day.theoryIds.length > 0);
}

/** 오늘까지 이어진 연속 공부 일수. 오늘 아직 기록이 없으면 어제부터 셉니다. */
export function currentStreak(study, todayKey) {
    let cursor = isActiveDay(study.days[todayKey]) ? todayKey : shiftDateKey(todayKey, -1);
    let streak = 0;
    while (isActiveDay(study.days[cursor])) {
        streak += 1;
        cursor = shiftDateKey(cursor, -1);
    }
    return streak;
}

/** 지금까지 가장 길었던 연속 공부 일수 */
export function bestStreak(study) {
    const keys = Object.keys(study.days)
        .filter((key) => isActiveDay(study.days[key]))
        .sort();
    let best = 0;
    let run = 0;
    let previous = null;
    for (const key of keys) {
        run = previous !== null && shiftDateKey(previous, 1) === key ? run + 1 : 1;
        best = Math.max(best, run);
        previous = key;
    }
    return best;
}

/**
 * 전체 요약.
 * @returns {{
 *   todayTheories: number, todaySeconds: number, todayTheoryIds: string[],
 *   totalTheories: number, totalSeconds: number, uniqueTheories: number,
 *   activeDays: number, currentStreak: number, bestStreak: number, firstDayKey: string | null,
 * }}
 *  - totalTheories: 날짜별로 공부한 이론 수의 합 (다른 날 다시 공부한 이론은 다시 셈)
 *  - uniqueTheories: 한 번이라도 공부한 서로 다른 이론 수
 */
export function summarizeStudy(study, todayKey) {
    let totalSeconds = 0;
    let totalTheories = 0;
    let activeDays = 0;
    let firstDayKey = null;
    const unique = new Set();
    for (const [key, day] of Object.entries(study.days)) {
        totalSeconds += day.seconds;
        totalTheories += day.theoryIds.length;
        day.theoryIds.forEach((id) => unique.add(id));
        if (isActiveDay(day)) {
            activeDays += 1;
            if (firstDayKey === null || key < firstDayKey) firstDayKey = key;
        }
    }
    const today = study.days[todayKey];
    return {
        todayTheories: today?.theoryIds.length ?? 0,
        todaySeconds: today?.seconds ?? 0,
        todayTheoryIds: today?.theoryIds ?? [],
        totalTheories,
        totalSeconds,
        uniqueTheories: unique.size,
        activeDays,
        currentStreak: currentStreak(study, todayKey),
        bestStreak: bestStreak(study),
        firstDayKey,
    };
}

/** 오늘 포함 최근 n일의 일별 기록 — [{ key, seconds, theories }] (오래된 날 → 오늘) */
export function dailySeries(study, todayKey, n) {
    return lastNDayKeys(n, todayKey).map((key) => {
        const day = study.days[key];
        return { key, seconds: day?.seconds ?? 0, theories: day?.theoryIds.length ?? 0 };
    });
}

export const PERIODS = [
    { value: "today", label: "오늘" },
    { value: "week", label: "이번 주" },
    { value: "all", label: "전체" },
];

/**
 * 기간별 합계. period: "today" | "week"(월요일부터 오늘까지) | "all"
 * @returns {{ seconds: number, theories: number }}
 */
export function periodTotals(study, period, todayKey) {
    const from = period === "today" ? todayKey : period === "week" ? weekStartKey(todayKey) : null;
    let seconds = 0;
    let theories = 0;
    for (const [key, day] of Object.entries(study.days)) {
        if (from !== null && (key < from || key > todayKey)) continue;
        seconds += day.seconds;
        theories += day.theoryIds.length;
    }
    return { seconds, theories };
}

/** 카테고리별 공부한 이론 수 (전체 기간) — [{ category, count }] 많은 순 */
export function categoryBreakdown(study) {
    const counts = new Map();
    for (const day of Object.values(study.days)) {
        for (const id of day.theoryIds) {
            const category = getTheoryById(id)?.category ?? "기타";
            counts.set(category, (counts.get(category) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, "ko"));
}
