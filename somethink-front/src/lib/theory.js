import { CATEGORIES, THEORIES } from "../data/theories";

export const ALL_CATEGORY = "전체";
export const THEORY_CATEGORIES = CATEGORIES;
export const THEORY_COUNT = THEORIES.length;

/** 카테고리의 영문 이름 (화면 장식용) */
export const CATEGORY_ENGLISH = {
    경제: "Economics",
    심리: "Psychology",
    과학: "Science",
    철학: "Philosophy",
    사회: "Society",
    "수학·컴퓨터": "Math & Computing",
    학습: "Learning",
};

const theoriesById = new Map(THEORIES.map((theory) => [theory.id, theory]));

export function getTheoryById(id) {
    return theoriesById.get(id) ?? null;
}

/** 함께 읽으면 좋은 이론들 (theory.related 의 id 순서대로, 없는 id 는 건너뜀) */
export function getRelatedTheories(theory) {
    return (theory?.related ?? []).map(getTheoryById).filter(Boolean);
}

export function countTheoriesInCategory(category) {
    if (category === ALL_CATEGORY) return THEORIES.length;
    return THEORIES.filter((theory) => theory.category === category).length;
}

/**
 * 이론을 무작위로 하나 뽑습니다. (이벤트 핸들러 안에서 호출하세요 — 렌더 중 호출 금지)
 * @param {object} options
 * @param {string} [options.category]   ALL_CATEGORY 또는 특정 카테고리
 * @param {string|null} [options.excludeId]  방금 뽑은 이론 (연속으로 같은 이론이 나오지 않게)
 * @param {string[]} [options.avoidIds]  되도록 피할 이론들 (예: 오늘 이미 공부한 이론)
 * @returns {object|null} 뽑힌 이론, 해당 카테고리에 이론이 없으면 null
 */
export function drawTheory({ category = ALL_CATEGORY, excludeId = null, avoidIds = [] } = {}) {
    const pool =
        category === ALL_CATEGORY ? THEORIES : THEORIES.filter((theory) => theory.category === category);
    if (pool.length === 0) return null;
    const avoid = new Set(avoidIds);
    const fresh = pool.filter((theory) => theory.id !== excludeId && !avoid.has(theory.id));
    const notRepeated = pool.filter((theory) => theory.id !== excludeId);
    const candidates = fresh.length > 0 ? fresh : notRepeated.length > 0 ? notRepeated : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

/** 뽑기 연출용: 무작위 이론 제목 하나 (이벤트 핸들러/타이머 콜백에서만 호출) */
export function randomTheoryTitle(category = ALL_CATEGORY) {
    return drawTheory({ category })?.title ?? "";
}
