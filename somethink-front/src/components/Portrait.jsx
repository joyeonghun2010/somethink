import { useState } from "react";
import { portraitSrcSet, portraitUrl } from "../lib/portrait";
import styles from "./Portrait.module.css";

/**
 * 이론가 초상 이미지. 위키미디어에서 불러오지 못하면 이름 머리글자로 대신합니다.
 * 부모가 크기를 정하고, 이미지는 그 상자를 object-fit: cover 로 채웁니다.
 */
export default function Portrait({
    portrait,
    sizes = "(min-width: 960px) 360px, 70vw",
    width = 960,
    loading = "lazy",
    decorative = false,
    className = "",
}) {
    // 다른 초상으로 바뀌면 실패 표시도 자연스럽게 풀리도록 '실패한 파일'을 기억합니다.
    const [failedFile, setFailedFile] = useState(null);

    if (!portrait || failedFile === portrait.file) {
        const initials = (portrait?.english ?? "?")
            .split(/\s+/)
            .filter((word) => /^[A-Z]/.test(word))
            .map((word) => word[0])
            .slice(0, 2)
            .join("");
        return (
            <span
                className={`${styles.fallback} ${className}`}
                role={decorative || !portrait ? undefined : "img"}
                aria-label={decorative || !portrait ? undefined : `${portrait.name} 초상`}
                aria-hidden={decorative || !portrait ? true : undefined}
            >
                {initials || "?"}
            </span>
        );
    }

    return (
        <img
            className={`${styles.image} ${className}`}
            src={portraitUrl(portrait, width)}
            srcSet={portraitSrcSet(portrait)}
            sizes={sizes}
            alt={decorative ? "" : `${portrait.name} 초상`}
            loading={loading}
            decoding="async"
            draggable={false}
            style={{ objectPosition: portrait.focus }}
            onError={() => setFailedFile(portrait.file)}
        />
    );
}
