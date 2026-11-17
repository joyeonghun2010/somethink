// 사이트 전체에서 쓰는 선 아이콘 (24×24 격자에 직접 그린 SVG). 이모지 대신 사용합니다.
// 사용법: <Icon name="arrowRight" />  — 기본은 장식용(aria-hidden). 뜻을 전해야 하면 label 을 넘기세요.

const DOT = { fill: "currentColor", stroke: "none" };

const ICONS = {
    arrowRight: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
    arrowLeft: <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />,
    arrowUp: <path d="M12 19.5v-15M6 10.5l6-6 6 6" />,
    arrowDown: <path d="M12 4.5v15M6 13.5l6 6 6-6" />,
    arrowUpRight: <path d="M7 17 17 7M8.5 7H17v8.5" />,
    chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
    chevronRight: <path d="M9.5 6l6 6-6 6" />,
    chevronDown: <path d="M6 9.5l6 6 6-6" />,
    close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    play: <path {...DOT} d="M8 5.9v12.2a.9.9 0 0 0 1.37.77l9.8-6.1a.9.9 0 0 0 0-1.54l-9.8-6.1A.9.9 0 0 0 8 5.9z" />,
    pause: (
        <>
            <rect {...DOT} x="6.5" y="5" width="3.8" height="14" rx="1.2" />
            <rect {...DOT} x="13.7" y="5" width="3.8" height="14" rx="1.2" />
        </>
    ),
    // 🔒
    lock: (
        <>
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
            <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.4v2.4" />
        </>
    ),
    // ⏰
    alarm: (
        <>
            <circle cx="12" cy="13" r="7" />
            <path d="M12 9.6v3.6l2.4 1.7M4.2 6.6 7 4.2M19.8 6.6 17 4.2M7.4 18.8l-1.5 1.9M16.6 18.8l1.5 1.9" />
        </>
    ),
    // 🎉
    party: (
        <>
            <path d="M4 20l4.4-12.4 8 8z" />
            <path d="M6.3 13.7l4 4M7.5 10.2l6.3 6.3" />
            <path d="M13.2 3.6c.5 1.4-.1 2.6-1.4 3.2M20.4 10.8c-1.4-.5-2.6.1-3.2 1.4M17.6 3.4v2.2M20.6 6.4h-2.2" />
            <circle {...DOT} cx="15.6" cy="8.4" r="1" />
            <circle {...DOT} cx="20.4" cy="15.2" r="1" />
            <circle {...DOT} cx="9.6" cy="3.4" r="1" />
        </>
    ),
    // 👋
    wave: (
        <>
            <path d="M8.4 12.6 6.1 10.3a1.6 1.6 0 0 0-2.3 2.3l4.7 5c1.6 1.7 3.5 2.6 5.9 2.6h.5c3.7 0 6.6-3 6.6-6.6V9.2a1.5 1.5 0 0 0-3 0v2.6" />
            <path d="M17.5 11.8V6.6a1.5 1.5 0 0 0-3 0v5" />
            <path d="M14.5 11.4V5a1.5 1.5 0 0 0-3 0v6.4" />
            <path d="M11.5 11.6V6.9a1.5 1.5 0 0 0-3 0v6.6" />
            <path d="M3.4 7.4c.4-1.6 1.4-2.8 2.8-3.5M21.6 20.2c-.6 1-1.5 1.7-2.6 2.1" />
        </>
    ),
    // 💡
    bulb: (
        <>
            <path d="M9 15.6c-2-1.2-3.4-3.4-3.4-5.9a6.4 6.4 0 1 1 12.8 0c0 2.5-1.4 4.7-3.4 5.9v1.7H9z" />
            <path d="M9.6 20.3h4.8M10.8 22.4h2.4M10.3 13.2l1.7-2.4 1.7 2.4" />
        </>
    ),
    // 🤔
    thought: (
        <>
            <path d="M12.4 3.4c4.7 0 8.4 2.9 8.4 6.6s-3.7 6.6-8.4 6.6S4 13.7 4 10s3.7-6.6 8.4-6.6z" />
            <circle cx="6.2" cy="18.8" r="1.4" />
            <circle cx="3.6" cy="21.3" r=".8" />
            <path d="M10.4 8.6a2.1 2.1 0 0 1 4 .7c0 1.4-2 1.6-2 2.8" />
            <circle {...DOT} cx="12.4" cy="14" r=".95" />
        </>
    ),
    // 🏆
    trophy: (
        <>
            <path d="M7.5 4.5h9v4.8a4.5 4.5 0 0 1-9 0z" />
            <path d="M7.5 6.4H4.8v.8a3 3 0 0 0 2.9 3M16.5 6.4h2.7v.8a3 3 0 0 1-2.9 3M12 13.8v3.2" />
            <path d="M8.4 20.2h7.2l-.9-3.2H9.3z" />
        </>
    ),
    // 🏁
    flag: (
        <>
            <path d="M5.5 21V3.8M5.5 4.5h13v9h-13" />
            <path
                {...DOT}
                d="M5.5 4.5h3.25v3H5.5zM12 4.5h3.25v3H12zM8.75 7.5H12v3H8.75zM15.25 7.5h3.25v3h-3.25zM5.5 10.5h3.25v3H5.5zM12 10.5h3.25v3H12z"
            />
        </>
    ),
    // ⓘ
    info: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5.2" />
            <circle {...DOT} cx="12" cy="7.8" r="1.05" />
        </>
    ),
    alert: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.4v5.4" />
            <circle {...DOT} cx="12" cy="16.3" r="1.05" />
        </>
    ),
    checkCircle: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.3l2.8 2.8 5.4-5.6" />
        </>
    ),
    sparkle: <path d="M12 3.5c.7 4.6 3.4 7.3 8 8-4.6.7-7.3 3.4-8 8-.7-4.6-3.4-7.3-8-8 4.6-.7 7.3-3.4 8-8z" />,
    key: (
        <>
            <circle cx="8" cy="15.6" r="4" />
            <path d="M10.9 12.7 19.5 4.1M16.3 7.3l2.4 2.4M14.1 9.5l1.8 1.8" />
        </>
    ),
    pen: <path d="M15.4 4.9l3.7 3.7L8.6 19.1l-4.4.8.8-4.4zM13.2 7.1l3.7 3.7" />,
    book: <path d="M12 6.6C10.2 5.2 7.6 4.6 4 4.8v13.4c3.6-.2 6.2.4 8 1.8 1.8-1.4 4.4-2 8-1.8V4.8c-3.6-.2-6.2.4-8 1.8zM12 6.6V20" />,
    dice: (
        <>
            <rect x="4" y="4" width="16" height="16" rx="3.6" />
            <circle {...DOT} cx="8.6" cy="8.6" r="1.3" />
            <circle {...DOT} cx="12" cy="12" r="1.3" />
            <circle {...DOT} cx="15.4" cy="15.4" r="1.3" />
        </>
    ),
    shuffle: <path d="M3.5 7.5h2.8c2 0 3.6 1 4.6 2.7l2.2 3.6c1 1.7 2.6 2.7 4.6 2.7h2.8M17.6 13.8l2.9 2.7-2.9 2.7M3.5 16.5h2.8c1.3 0 2.4-.4 3.3-1.1M14.4 8.6c.9-.7 2-1.1 3.3-1.1h2.8M17.6 4.8l2.9 2.7-2.9 2.7" />,
    timer: (
        <>
            <circle cx="12" cy="13.5" r="7" />
            <path d="M12 10v3.5l2.2 1.6M9.5 3.4h5M12 3.4v3.1M18.4 7.1l1.3-1.3" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
        </>
    ),
    chart: <path d="M4.5 20h15M7.5 16.5v-5M12 16.5V7M16.5 16.5v-8.5" />,
    target: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="4.8" />
            <circle {...DOT} cx="12" cy="12" r="1.4" />
        </>
    ),
    flame: <path d="M12 21.2c3.7 0 6.3-2.6 6.3-6.2 0-3.4-2.2-5.4-3.6-8-.4 1.9-1.2 3-2.3 3.7.1-3.1-1.3-5.8-4-7.6.4 3-.8 4.7-2 6.4-.9 1.3-1.8 2.8-1.8 5.1 0 3.8 3.2 6.6 7.4 6.6z" />,
    quote: (
        <path
            {...DOT}
            d="M10.2 6.2C6.7 7.2 4.5 9.8 4.5 13.6V18h5.6v-5.6H7.3c.1-2.1 1.3-3.5 3.5-4.2zM19.7 6.2c-3.5 1-5.7 3.6-5.7 7.4V18h5.6v-5.6h-2.8c.1-2.1 1.3-3.5 3.5-4.2z"
        />
    ),
    external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 13.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18V7a1.5 1.5 0 0 1 1.5-1.5H10" />,
    user: (
        <>
            <circle cx="12" cy="8.5" r="3.8" />
            <path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
        </>
    ),
    logout: <path d="M9.5 4.5h-3a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3M14 8l4 4-4 4M18 12H8.5" />,
    refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
    list: (
        <>
            <path d="M9 6.5h11M9 12h11M9 17.5h11" />
            <circle {...DOT} cx="4.8" cy="6.5" r="1.2" />
            <circle {...DOT} cx="4.8" cy="12" r="1.2" />
            <circle {...DOT} cx="4.8" cy="17.5" r="1.2" />
        </>
    ),
};

export default function Icon({ name, size = 20, strokeWidth = 1.8, label, className = "" }) {
    const shape = ICONS[name];
    if (!shape) return null;
    const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
    return (
        <svg
            className={`somethink-icon ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
            {...a11y}
        >
            {shape}
        </svg>
    );
}
