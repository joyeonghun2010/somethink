import { PORTRAITS, THEORY_PORTRAITS } from "../data/portraits";

const COMMONS = "https://upload.wikimedia.org/wikipedia/commons";
// 위키미디어는 정해진 폭의 썸네일만 만들어 줍니다 (그 밖의 폭을 요청하면 400 오류).
const THUMB_WIDTHS = [330, 500, 960, 1280, 1920];

function fileName(portrait) {
    return portrait.file.slice(portrait.file.lastIndexOf("/") + 1);
}

/** key 로 초상 정보를 찾습니다. 없으면 null */
export function getPortrait(key) {
    return PORTRAITS[key] ?? null;
}

/** 이론을 제안한 사람의 초상. 등록된 초상이 없으면 null */
export function getTheoryPortrait(theoryId) {
    return getPortrait(THEORY_PORTRAITS[theoryId]);
}

/** width(THUMB_WIDTHS 중 하나) 폭의 이미지 주소. 원본이 그보다 작으면 원본 주소 */
export function portraitUrl(portrait, width = 960) {
    if (portrait.width <= width) return `${COMMONS}/${portrait.file}`;
    return `${COMMONS}/thumb/${portrait.file}/${width}px-${fileName(portrait)}`;
}

/** <img srcset> 값 — 원본보다 작은 썸네일들 + (작은 원본이면) 원본 */
export function portraitSrcSet(portrait) {
    const entries = THUMB_WIDTHS.filter((width) => width < portrait.width).map(
        (width) => `${portraitUrl(portrait, width)} ${width}w`,
    );
    if (portrait.width <= THUMB_WIDTHS.at(-1)) entries.push(`${COMMONS}/${portrait.file} ${portrait.width}w`);
    return entries.join(", ");
}

/** 위키미디어 공용의 파일 설명 페이지 (저작자·라이선스 확인용) */
export function portraitPageUrl(portrait) {
    return `https://commons.wikimedia.org/wiki/File:${fileName(portrait)}`;
}

/** 저작자 표시가 필요한 초상 목록 (사이트 하단 '이미지 출처') */
export const ATTRIBUTED_PORTRAITS = Object.values(PORTRAITS).filter((portrait) => portrait.author);
