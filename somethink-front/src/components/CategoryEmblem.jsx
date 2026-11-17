// 카테고리를 나타내는 선 그림 (48×48). 초상이 없는 이론에서 초상 대신 보여줍니다.

const EMBLEMS = {
    // 오르는 그래프
    경제: (
        <>
            <path d="M7 8v33h34" />
            <path d="M12 34l8-9 6 5 12-13" />
            <path d="M31 17h7v7" />
            <path d="M12 41v-3M20 41v-6M26 41v-4M34 41v-8" opacity=".45" />
        </>
    ),
    // 옆얼굴 속의 소용돌이
    심리: (
        <>
            <path d="M29 42v-6.2c4.8-1.7 8.3-6.3 8.3-11.8C37.3 16.3 31 10 23.3 10S9.3 16.3 9.3 24c0 1.4.2 2.7.6 4L7 33.5h4.3V37a4 4 0 0 0 4 4H19" />
            <path d="M23.4 24.2a1.9 1.9 0 1 1 1.9-1.9 3.8 3.8 0 1 1-3.8-3.8 5.7 5.7 0 1 1 5.7 5.7" />
        </>
    ),
    // 원자
    과학: (
        <>
            <ellipse cx="24" cy="24" rx="17" ry="6.4" />
            <ellipse cx="24" cy="24" rx="17" ry="6.4" transform="rotate(60 24 24)" />
            <ellipse cx="24" cy="24" rx="17" ry="6.4" transform="rotate(120 24 24)" />
            <circle cx="24" cy="24" r="2.6" fill="currentColor" stroke="none" />
        </>
    ),
    // 그리스 신전 기둥
    철학: (
        <>
            <path d="M8 14h32L24 6.5z" />
            <path d="M10 17.5h28M12 39.5h24M8.5 43h31" />
            <path d="M15 21v15M21 21v15M27 21v15M33 21v15" />
        </>
    ),
    // 이어진 사람들
    사회: (
        <>
            <circle cx="24" cy="15" r="5" />
            <path d="M15 34c1.4-5 4.8-7.6 9-7.6s7.6 2.6 9 7.6" />
            <circle cx="10.5" cy="21.5" r="3.8" />
            <path d="M4 34.5c.9-3.8 3.4-5.8 6.5-5.8 1.4 0 2.6.4 3.6 1.1" />
            <circle cx="37.5" cy="21.5" r="3.8" />
            <path d="M44 34.5c-.9-3.8-3.4-5.8-6.5-5.8-1.4 0-2.6.4-3.6 1.1" />
            <path d="M8 40.5h32" />
        </>
    ),
    // 칩 위의 시그마
    "수학·컴퓨터": (
        <>
            <rect x="12" y="12" width="24" height="24" rx="4" />
            <path d="M19 6v6M24 6v6M29 6v6M19 36v6M24 36v6M29 36v6M6 19h6M6 24h6M6 29h6M36 19h6M36 24h6M36 29h6" />
            <path d="M28.5 18.5h-9l5 5.5-5 5.5h9" />
        </>
    ),
    // 펼친 책
    학습: (
        <>
            <path d="M24 14c-3.8-3-9.4-4-17-3.6v26c7.6-.4 13.2.6 17 3.6 3.8-3 9.4-4 17-3.6v-26c-7.6-.4-13.2.6-17 3.6z" />
            <path d="M24 14v26" />
            <path d="M12 18c3 0 5.6.5 7.6 1.4M12 24c3 0 5.6.5 7.6 1.4M28.4 19.4c2-.9 4.6-1.4 7.6-1.4M28.4 25.4c2-.9 4.6-1.4 7.6-1.4" />
        </>
    ),
};

const FALLBACK = (
    <path d="M24 9.5c1.2 8 5.8 12.6 13.8 13.8-8 1.2-12.6 5.8-13.8 13.8-1.2-8-5.8-12.6-13.8-13.8 8-1.2 12.6-5.8 13.8-13.8z" />
);

export default function CategoryEmblem({ category, size = 96, strokeWidth = 1.5, className = "" }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {EMBLEMS[category] ?? FALLBACK}
        </svg>
    );
}
