import styles from "./Avatar.module.css";

/** 이름의 첫 글자를 보여주는 동그란 아바타 */
export default function Avatar({ name, color, size = 40, className = "" }) {
    const initial = Array.from((name ?? "").trim())[0]?.toUpperCase() ?? "?";
    return (
        <span
            className={`${styles.avatar} ${className}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: color }}
            aria-hidden="true"
        >
            {initial}
        </span>
    );
}
