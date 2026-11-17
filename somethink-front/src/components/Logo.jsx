import styles from "./Logo.module.css";

/**
 * SOMETHINK 심볼 — 먹색 타일 위의 생각 말풍선(think)과 그 안의 반짝임(something).
 * 타일은 글자색(currentColor)을 따라가고, 말풍선은 --logo-cut, 반짝임은 --logo-spark 색을 씁니다.
 */
export function LogoMark({ size = 36, className = "" }) {
    return (
        <svg
            className={`${styles.mark} ${className}`}
            width={size}
            height={size}
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
        >
            <rect width="48" height="48" rx="13" fill="currentColor" />
            <circle cx="27.5" cy="20" r="11.2" fill="none" stroke="var(--logo-cut, #fff)" strokeWidth="3.4" />
            <circle cx="14.6" cy="34.2" r="3.3" fill="var(--logo-cut, #fff)" />
            <circle cx="9.4" cy="40.2" r="2" fill="var(--logo-cut, #fff)" />
            <path
                d="M27.5 13.2c.55 3.9 2.4 5.75 6.3 6.3-3.9.55-5.75 2.4-6.3 6.3-.55-3.9-2.4-5.75-6.3-6.3 3.9-.55 5.75-2.4 6.3-6.3z"
                fill="var(--logo-spark, #3cc4b8)"
            />
        </svg>
    );
}

/** 심볼 + 글자 로고. tone="light" 는 어두운 배경 위에서 씁니다. */
export default function Logo({ size = 34, tone = "dark", showTagline = false, className = "" }) {
    return (
        <span className={`${styles.logo} ${tone === "light" ? styles.light : ""} ${className}`}>
            <LogoMark size={size} />
            <span className={styles.text}>
                {/* 두 span 사이에 공백이 없어서 스크린 리더는 한 단어(SOMETHINK)로 읽습니다. */}
                <span className={styles.word}>
                    <span className={styles.some}>SOME</span>
                    <span className={styles.think}>THINK</span>
                </span>
                {showTagline && <span className={styles.tagline}>Think-Something</span>}
            </span>
        </span>
    );
}
