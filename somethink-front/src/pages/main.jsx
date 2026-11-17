import { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import CategoryEmblem from "../components/CategoryEmblem";
import Icon from "../components/Icon";
import Portrait from "../components/Portrait";
import { useAuth } from "../lib/auth";
import { openAuthModal } from "../lib/authModal";
import { formatClock, formatDuration, longDateLabel, toDateKey, useTodayKey } from "../lib/date";
import { getPortrait, getTheoryPortrait } from "../lib/portrait";
import { summarizeStudy } from "../lib/stats";
import {
    DEFAULT_DAILY_GOAL,
    getDisplayName,
    markTheoryStudied,
    unmarkTheoryStudied,
    useProfile,
    useStudy,
} from "../lib/store";
import {
    ALL_CATEGORY,
    CATEGORY_ENGLISH,
    THEORY_CATEGORIES,
    THEORY_COUNT,
    countTheoriesInCategory,
    drawTheory,
    getRelatedTheories,
    getTheoryById,
    randomTheoryTitle,
} from "../lib/theory";
import {
    TIMER_LIMITS,
    TIMER_PRESETS,
    getRemainingSeconds,
    getTimerProgress,
    pauseTimer,
    resetTimer,
    setTimerMinutes,
    startTimer,
    useTimer,
} from "../lib/timer";
import { showToast } from "../lib/toast";
import ui from "../styles/ui.module.css";
import styles from "./main.module.css";

// 다른 화면에 다녀와도 뽑아 둔 이론이 남아 있도록 탭(sessionStorage) 단위로 기억합니다.
const SELECTION_KEY = "somethink:dashboard";
const CATEGORY_OPTIONS = [ALL_CATEGORY, ...THEORY_CATEGORIES];
const SHUFFLE_MS = 700;
const SHUFFLE_TICK_MS = 70;
const RING_RADIUS = 53;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TOGGLE_LABELS = {
    idle: "시작",
    running: "일시정지",
    paused: "이어하기",
    finished: "다시 시작",
};
// 이론이 아직 없을 때 보여주는 '생각의 거인들' 액자 (카테고리 순서)
const GALLERY = [
    "adam-smith",
    "edward-thorndike",
    "albert-einstein",
    "plato",
    "vilfredo-pareto",
    "alan-turing",
    "hermann-ebbinghaus",
];

function cx(...classNames) {
    return classNames.filter(Boolean).join(" ");
}

function readSelection() {
    const fallback = { category: ALL_CATEGORY, theoryId: null };
    try {
        const saved = JSON.parse(sessionStorage.getItem(SELECTION_KEY));
        if (!saved || typeof saved !== "object") return fallback;
        return {
            category: CATEGORY_OPTIONS.includes(saved.category) ? saved.category : ALL_CATEGORY,
            theoryId: getTheoryById(saved.theoryId) ? saved.theoryId : null,
        };
    } catch {
        return fallback;
    }
}

/** 첫 화면의 링크(/main?theory=… · /main?category=…)로 들어오면 그 이론/분야를 먼저 보여줍니다. */
function initialSelection(searchParams) {
    const theory = getTheoryById(searchParams.get("theory"));
    if (theory) return { category: ALL_CATEGORY, theoryId: theory.id };
    const category = searchParams.get("category");
    if (CATEGORY_OPTIONS.includes(category)) return { category, theoryId: null };
    return readSelection();
}

function saveSelection(selection) {
    try {
        sessionStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
    } catch {
        // 저장하지 못해도 뽑기는 그대로 동작합니다.
    }
}

function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** 타임스탬프(ms) → "14:05" */
function formatTime(ms) {
    const date = new Date(ms);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

/** 초 → "24분 13초" (화면 읽기 프로그램에 들려줄 남은 시간) */
function spokenDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const parts = [];
    if (s >= 3600) parts.push(`${Math.floor(s / 3600)}시간`);
    if (s % 3600 >= 60) parts.push(`${Math.floor((s % 3600) / 60)}분`);
    if (s % 60 > 0 || parts.length === 0) parts.push(`${s % 60}초`);
    return parts.join(" ");
}

function timerStatusText({ status, duration, ownerId }) {
    if (status === "running") {
        return ownerId ? "기록 중 · 오늘 공부 시간에 자동으로 더해져요" : "로그인하면 공부 시간이 기록돼요";
    }
    if (status === "paused") return "일시정지됨";
    if (status === "finished") return "완료! 수고했어요";
    return `${Math.round(duration / 60)}분 집중해볼까요?`;
}

function Greeting({ isLoggedIn, name, todayKey }) {
    return (
        <header className={styles.greeting}>
            <p className={ui.eyebrow}>
                <span lang="en">Dashboard</span>
                <span className={styles.eyebrowDate}>{longDateLabel(todayKey)}</span>
            </p>
            {isLoggedIn ? (
                <>
                    <h1 className={styles.greetingTitle}>
                        안녕하세요, {name}님
                        <Icon name="wave" size={38} strokeWidth={1.6} className={styles.waveIcon} />
                    </h1>
                    <p className={styles.greetingSub}>오늘도 하나씩 생각해볼까요?</p>
                </>
            ) : (
                <>
                    <h1 className={styles.greetingTitle}>오늘의 이론을 만나보세요</h1>
                    <p className={styles.greetingSub}>
                        카테고리를 고르고 버튼을 누르면 오늘 생각해볼 이론이 나타나요.
                    </p>
                </>
            )}
        </header>
    );
}

function TodayCard({ summary, dailyGoal, isLoggedIn, todayKey }) {
    const titleId = useId();
    const goalLabelId = useId();
    const { todayTheories, todaySeconds, currentStreak } = summary;
    const remaining = Math.max(dailyGoal - todayTheories, 0);
    const percent = Math.min(todayTheories / dailyGoal, 1) * 100;

    return (
        <section className={cx(ui.card, styles.panel, styles.todayCard)} aria-labelledby={titleId}>
            <div className={styles.cardHead}>
                <div className={styles.cardTitleRow}>
                    <span className={styles.cardIcon} aria-hidden="true">
                        <Icon name="target" size={20} />
                    </span>
                    <h2 id={titleId} className={ui.cardTitle}>
                        오늘의 공부
                    </h2>
                </div>
                <span className={styles.pill}>{longDateLabel(todayKey)}</span>
            </div>

            <div className={styles.todayBody}>
                <div className={styles.todayFigure}>
                    <span className={ui.statLabel}>오늘 공부한 이론</span>
                    <p className={styles.figure}>
                        <span className={styles.figureNumber}>{todayTheories}</span>
                        <span className={styles.figureUnit}>개</span>
                    </p>
                </div>

                <div className={styles.todayDetails}>
                    <div className={styles.goal}>
                        <div className={styles.goalHead}>
                            <span id={goalLabelId} className={styles.goalLabel}>
                                오늘 목표
                            </span>
                            <span className={styles.goalCount}>
                                {todayTheories} / {dailyGoal}개
                            </span>
                        </div>
                        <div
                            className={ui.progress}
                            role="progressbar"
                            aria-labelledby={goalLabelId}
                            aria-valuemin={0}
                            aria-valuemax={dailyGoal}
                            aria-valuenow={Math.min(todayTheories, dailyGoal)}
                            aria-valuetext={`${dailyGoal}개 중 ${todayTheories}개`}
                        >
                            <div className={ui.progressBar} style={{ width: `${percent}%` }} />
                        </div>
                        <div className={styles.goalFoot}>
                            {remaining > 0 ? (
                                <p className={styles.goalText}>목표까지 {remaining}개 남았어요</p>
                            ) : (
                                <p className={cx(styles.goalText, styles.goalDone)}>
                                    <Icon name="party" size={18} />
                                    오늘 목표 달성!
                                </p>
                            )}
                            {isLoggedIn && (
                                <Link to="/profile" className={styles.textLink}>
                                    목표 바꾸기
                                </Link>
                            )}
                        </div>
                    </div>

                    <dl className={styles.miniStats}>
                        <div className={styles.miniStat}>
                            <dt className={styles.miniLabel}>
                                <Icon name="clock" size={16} />
                                오늘 공부 시간
                            </dt>
                            <dd className={styles.miniValue}>{formatDuration(todaySeconds)}</dd>
                        </div>
                        <div className={styles.miniStat}>
                            <dt className={styles.miniLabel}>
                                <Icon name="flame" size={16} />
                                연속 공부
                            </dt>
                            <dd className={styles.miniValue}>{currentStreak}일</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>
    );
}

/** 초상이 있으면 초상, 없으면 카테고리 그림 */
function TheoryFigure({ theory, portrait }) {
    if (portrait) {
        return (
            <figure className={styles.figureBox}>
                <div className={styles.portraitFrame}>
                    <Portrait
                        key={portrait.file}
                        portrait={portrait}
                        width={500}
                        sizes="(min-width: 1080px) 300px, 160px"
                        className={styles.portraitImage}
                    />
                </div>
                <figcaption className={styles.portraitCaption}>
                    <span className={styles.portraitName}>{portrait.name}</span>
                    <span className={styles.portraitMeta} lang="en">
                        {portrait.english} · {portrait.years}
                    </span>
                </figcaption>
            </figure>
        );
    }
    return (
        <figure className={styles.figureBox}>
            <div className={cx(styles.portraitFrame, styles.emblemFrame)}>
                <CategoryEmblem category={theory.category} size={88} strokeWidth={1.3} />
                <span className={styles.emblemLabel} lang="en">
                    {CATEGORY_ENGLISH[theory.category] ?? theory.category}
                </span>
            </div>
            <figcaption className={styles.portraitCaption}>
                <span className={styles.portraitName}>{theory.origin}</span>
            </figcaption>
        </figure>
    );
}

/** 나무위키 문서처럼 목차와 번호 붙은 문단으로 이론을 보여줍니다. */
function TheoryArticle({ theory, titleRef, actions, onShowTheory }) {
    const baseId = useId();
    const portrait = getTheoryPortrait(theory.id);
    const related = getRelatedTheories(theory);

    const sections = [
        theory.summary && {
            key: "overview",
            title: "개요",
            body: <p className={styles.docText}>{theory.summary}</p>,
        },
        theory.background && {
            key: "background",
            title: "배경",
            body: <p className={styles.docText}>{theory.background}</p>,
        },
        theory.points?.length > 0 && {
            key: "points",
            title: "핵심 내용",
            subs: theory.points,
        },
        theory.example && {
            key: "example",
            title: "예시",
            body: (
                <div className={styles.callout}>
                    <span className={styles.calloutIcon} aria-hidden="true">
                        <Icon name="bulb" size={22} strokeWidth={1.6} />
                    </span>
                    <p className={styles.calloutText}>{theory.example}</p>
                </div>
            ),
        },
        theory.criticism && {
            key: "criticism",
            title: "비판과 한계",
            body: <p className={styles.docText}>{theory.criticism}</p>,
        },
        theory.trivia && {
            key: "trivia",
            title: "여담",
            body: <p className={styles.docText}>{theory.trivia}</p>,
        },
        theory.question && {
            key: "question",
            title: "생각해보기",
            body: (
                <div className={cx(styles.callout, styles.calloutQuestion)}>
                    <span className={styles.calloutIcon} aria-hidden="true">
                        <Icon name="thought" size={22} strokeWidth={1.6} />
                    </span>
                    <p className={cx(styles.calloutText, styles.questionText)}>{theory.question}</p>
                </div>
            ),
        },
        related.length > 0 && {
            key: "related",
            title: "관련 이론",
            body: (
                <ul className={styles.relatedList} role="list">
                    {related.map((item) => (
                        <li key={item.id}>
                            <button type="button" className={styles.relatedItem} onClick={() => onShowTheory(item.id)}>
                                <span className={styles.relatedMeta}>{item.category}</span>
                                <span className={styles.relatedTitle}>{item.title}</span>
                                <span className={styles.relatedEnglish} lang="en">
                                    {item.english}
                                </span>
                                <Icon name="arrowRight" size={18} className={styles.relatedArrow} />
                            </button>
                        </li>
                    ))}
                </ul>
            ),
        },
    ].filter(Boolean);

    const sectionId = (index, subIndex) =>
        subIndex === undefined ? `${baseId}-s${index + 1}` : `${baseId}-s${index + 1}-${subIndex + 1}`;

    // 목차를 누르면 주소는 그대로 두고 해당 문단으로 부드럽게 이동합니다.
    const jumpTo = (id) => (event) => {
        event.preventDefault();
        const target = document.getElementById(id);
        if (!target) return;
        target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        target.focus({ preventScroll: true });
    };

    return (
        <article className={styles.theory}>
            <header className={styles.theoryHead}>
                <p className={styles.theoryKicker}>
                    <span className={ui.tag}>{theory.category}</span>
                    <span className={styles.theoryOrigin}>{theory.origin}</span>
                </p>
                <h3 ref={titleRef} className={styles.theoryTitle} tabIndex={-1}>
                    {theory.title}
                </h3>
                {theory.english && (
                    <p className={styles.theoryEnglish} lang="en">
                        {theory.english}
                    </p>
                )}
            </header>

            <div className={styles.theoryLayout}>
                <aside className={styles.theoryAside} aria-label="이론 정보">
                    <TheoryFigure theory={theory} portrait={portrait} />
                    {/* 나무위키의 정보 상자처럼 */}
                    <div className={styles.infobox}>
                        <table className={styles.infoTable}>
                            <caption className={styles.infoCaption}>{theory.title}</caption>
                            <tbody>
                                <tr>
                                    <th scope="row">분야</th>
                                    <td>{theory.category}</td>
                                </tr>
                                {theory.english && (
                                    <tr>
                                        <th scope="row">원어</th>
                                        <td lang="en">{theory.english}</td>
                                    </tr>
                                )}
                                <tr>
                                    <th scope="row">제안</th>
                                    <td>{theory.origin}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {actions}
                </aside>

                <nav className={styles.toc} aria-labelledby={`${baseId}-toc`}>
                    <p id={`${baseId}-toc`} className={styles.tocTitle}>
                        <Icon name="list" size={18} />
                        목차
                    </p>
                    <ol className={styles.tocList} role="list">
                        {sections.map((section, index) => (
                            <li key={section.key}>
                                <a
                                    href={`#${sectionId(index)}`}
                                    className={styles.tocLink}
                                    onClick={jumpTo(sectionId(index))}
                                >
                                    <span className={styles.tocNum}>{index + 1}.</span>
                                    {section.title}
                                </a>
                                {section.subs && (
                                    <ol className={styles.tocSubList} role="list">
                                        {section.subs.map((sub, subIndex) => (
                                            <li key={sub.term}>
                                                <a
                                                    href={`#${sectionId(index, subIndex)}`}
                                                    className={styles.tocLink}
                                                    onClick={jumpTo(sectionId(index, subIndex))}
                                                >
                                                    <span className={styles.tocNum}>
                                                        {index + 1}.{subIndex + 1}.
                                                    </span>
                                                    {sub.term}
                                                </a>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className={styles.doc}>
                    {sections.map((section, index) => (
                        <section key={section.key} className={styles.docSection}>
                            <h4 id={sectionId(index)} className={styles.docHeading} tabIndex={-1}>
                                <span className={styles.docNum}>{index + 1}.</span>
                                {section.title}
                            </h4>
                            {section.body}
                            {section.subs?.map((sub, subIndex) => (
                                <div key={sub.term} className={styles.subSection}>
                                    <h5 id={sectionId(index, subIndex)} className={styles.subHeading} tabIndex={-1}>
                                        <span className={styles.docNum}>
                                            {index + 1}.{subIndex + 1}.
                                        </span>
                                        {sub.term}
                                    </h5>
                                    <p className={styles.docText}>{sub.text}</p>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            </div>
        </article>
    );
}

function EmptyStage() {
    return (
        <div className={styles.emptyState}>
            <ul className={styles.gallery} role="list" aria-hidden="true">
                {GALLERY.map((key) => (
                    <li key={key} className={styles.galleryItem}>
                        <Portrait portrait={getPortrait(key)} width={330} sizes="120px" decorative />
                    </li>
                ))}
            </ul>
            <p className={styles.emptyLead}>지금 바로 버튼 하나로 시작하세요</p>
            <p className={styles.emptySub}>생각의 거인들이 남긴 이론 가운데 하나가 이곳에 표시됩니다</p>
        </div>
    );
}

function TimerCard({ userId }) {
    const timer = useTimer();
    const titleId = useId();
    const inputId = useId();
    const errorId = useId();
    const toggleRef = useRef(null);
    const [customMinutes, setCustomMinutes] = useState("");
    const [customError, setCustomError] = useState("");

    const { status, duration } = timer;
    const running = status === "running";
    const remaining = getRemainingSeconds(timer);
    const clock = formatClock(remaining);
    const progress = getTimerProgress(timer);
    const recording = running && Boolean(timer.ownerId);

    const handleToggle = () => {
        if (running) pauseTimer();
        else startTimer(userId);
    };

    // 초기화하면 이 버튼이 비활성화되므로, 키보드 초점을 시작 버튼으로 옮겨 둡니다.
    const handleReset = () => {
        resetTimer();
        toggleRef.current?.focus();
    };

    const handleCustomSubmit = (event) => {
        event.preventDefault();
        const text = customMinutes.trim();
        const minutes = Math.round(Number(text));
        if (text === "") {
            setCustomError("몇 분으로 맞출지 입력해 주세요.");
            return;
        }
        if (!Number.isFinite(minutes) || minutes < TIMER_LIMITS.min || minutes > TIMER_LIMITS.max) {
            setCustomError(`${TIMER_LIMITS.min}분에서 ${TIMER_LIMITS.max}분 사이로 입력해 주세요.`);
            return;
        }
        setTimerMinutes(minutes);
        setCustomMinutes("");
        setCustomError("");
    };

    return (
        <section className={cx(ui.card, styles.panel, styles.timerCard)} aria-labelledby={titleId}>
            <div className={styles.cardHead}>
                <div className={styles.cardTitleRow}>
                    <span className={styles.cardIcon} aria-hidden="true">
                        <Icon name="timer" size={20} />
                    </span>
                    <h2 id={titleId} className={ui.cardTitle}>
                        공부 타이머
                    </h2>
                </div>
            </div>

            <div className={styles.timerBody}>
                <div className={styles.dial}>
                    <div className={styles.ring}>
                        <svg className={styles.ringSvg} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
                            <circle className={styles.ringTrack} cx="60" cy="60" r={RING_RADIUS} />
                            {progress > 0 && (
                                <circle
                                    className={styles.ringValue}
                                    cx="60"
                                    cy="60"
                                    r={RING_RADIUS}
                                    style={{
                                        strokeDasharray: RING_CIRCUMFERENCE,
                                        strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress),
                                    }}
                                />
                            )}
                        </svg>
                        <p className={cx(styles.clock, clock.length > 5 && styles.clockLong)} role="timer">
                            <span aria-hidden="true">{clock}</span>
                            <span className={ui.srOnly}>남은 시간 {spokenDuration(remaining)}</span>
                        </p>
                    </div>
                    <p className={cx(styles.timerStatus, recording && styles.timerStatusRecording)} aria-live="polite">
                        {recording && <span className={styles.recordDot} aria-hidden="true" />}
                        {status === "finished" && <Icon name="party" size={18} />}
                        {timerStatusText(timer)}
                    </p>
                </div>

                <div className={styles.timerPanel}>
                    <div className={styles.presets} role="group" aria-label="빠른 시간 선택">
                        {TIMER_PRESETS.map((minutes) => {
                            const active = duration === minutes * 60;
                            return (
                                <button
                                    key={minutes}
                                    type="button"
                                    className={cx(ui.chip, active && ui.chipActive)}
                                    aria-pressed={active}
                                    disabled={running}
                                    onClick={() => setTimerMinutes(minutes)}
                                >
                                    {minutes}분
                                </button>
                            );
                        })}
                    </div>

                    <form className={styles.customForm} onSubmit={handleCustomSubmit} noValidate>
                        <div className={styles.customRow}>
                            <label htmlFor={inputId} className={styles.customLabel}>
                                직접 입력<span className={ui.srOnly}> (분 단위)</span>
                            </label>
                            <input
                                id={inputId}
                                type="number"
                                inputMode="numeric"
                                min={TIMER_LIMITS.min}
                                max={TIMER_LIMITS.max}
                                step={1}
                                className={cx(ui.input, styles.customInput, customError && ui.inputInvalid)}
                                placeholder={`${TIMER_LIMITS.min}~${TIMER_LIMITS.max}`}
                                value={customMinutes}
                                onChange={(event) => {
                                    setCustomMinutes(event.target.value);
                                    setCustomError("");
                                }}
                                disabled={running}
                                aria-invalid={customError ? true : undefined}
                                aria-describedby={customError ? errorId : undefined}
                            />
                            <span className={styles.customUnit} aria-hidden="true">
                                분
                            </span>
                            <button type="submit" className={cx(ui.btn, styles.customSubmit)} disabled={running}>
                                설정
                            </button>
                        </div>
                        {customError && (
                            <p id={errorId} className={cx(ui.error, styles.customError)} role="alert">
                                {customError}
                            </p>
                        )}
                    </form>

                    <div className={styles.controls}>
                        <button
                            ref={toggleRef}
                            type="button"
                            className={cx(ui.btn, ui.btnPrimary, ui.btnLg, styles.toggleButton)}
                            onClick={handleToggle}
                        >
                            <Icon name={running ? "pause" : "play"} size={18} />
                            {TOGGLE_LABELS[status]}
                        </button>
                        <button
                            type="button"
                            className={cx(ui.btn, ui.btnLg)}
                            onClick={handleReset}
                            disabled={status === "idle"}
                        >
                            초기화
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

function TodayList({ items, isLoggedIn, activeId, onSelect }) {
    const titleId = useId();

    let content;
    if (!isLoggedIn) {
        content = (
            <div className={cx(ui.empty, styles.listEmpty)}>
                <p className={styles.listEmptyText}>로그인하면 오늘 공부한 이론이 이곳에 차곡차곡 쌓여요.</p>
                <button type="button" className={cx(ui.btn, ui.btnSm)} onClick={() => openAuthModal("login")}>
                    로그인하기
                </button>
            </div>
        );
    } else if (items.length === 0) {
        content = (
            <p className={cx(ui.empty, styles.listEmptyText)}>
                아직 오늘 공부한 이론이 없어요. 위에서 이론을 뽑아보세요!
            </p>
        );
    } else {
        content = (
            <ol className={styles.todayList} role="list">
                {items.map(({ theory, at }, index) => {
                    const active = theory.id === activeId;
                    return (
                        <li key={theory.id} className={styles.todayItem}>
                            <button
                                type="button"
                                className={cx(styles.todayRow, active && styles.todayRowActive)}
                                onClick={() => onSelect(theory.id)}
                                aria-current={active ? "true" : undefined}
                            >
                                <span className={styles.rowIndex} aria-hidden="true">
                                    {index + 1}
                                </span>
                                <span className={styles.rowMain}>
                                    <span className={styles.rowTitle}>{theory.title}</span>
                                    <span className={styles.rowMeta}>
                                        <span className={ui.tag}>{theory.category}</span>
                                        {at !== null && <span className={styles.rowTime}>{formatTime(at)}</span>}
                                    </span>
                                </span>
                                <span className={styles.rowAction}>
                                    {active ? "보는 중" : <Icon name="arrowRight" size={18} />}
                                    {!active && <span className={ui.srOnly}>다시 보기</span>}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        );
    }

    return (
        <section className={cx(ui.card, styles.panel, styles.listCard)} aria-labelledby={titleId}>
            <div className={styles.cardHead}>
                <div className={styles.cardTitleRow}>
                    <span className={styles.cardIcon} aria-hidden="true">
                        <Icon name="book" size={20} />
                    </span>
                    <h2 id={titleId} className={ui.cardTitle}>
                        오늘 공부한 이론
                    </h2>
                </div>
                {isLoggedIn && items.length > 0 && <span className={styles.pill}>{items.length}개</span>}
            </div>
            {content}
        </section>
    );
}

function Main() {
    const { user, isLoggedIn } = useAuth();
    const userId = user?.id ?? null;
    const todayKey = useTodayKey();
    const study = useStudy(userId);
    const profile = useProfile(userId);
    const summary = useMemo(() => summarizeStudy(study, todayKey), [study, todayKey]);
    const dailyGoal = Math.max(1, profile.dailyGoal || DEFAULT_DAILY_GOAL);
    const drawTitleId = useId();
    const drawHintId = useId();
    const [searchParams, setSearchParams] = useSearchParams();

    const [selection, setSelection] = useState(() => initialSelection(searchParams));
    const [shuffleTitle, setShuffleTitle] = useState(null);
    const shuffleTimers = useRef({ intervalId: null, timeoutId: null });
    const drawCardRef = useRef(null);
    const titleRef = useRef(null);
    const completeRef = useRef(null);

    const theory = selection.theoryId ? getTheoryById(selection.theoryId) : null;
    const shuffling = shuffleTitle !== null;
    const isDone = theory !== null && summary.todayTheoryIds.includes(theory.id);
    const poolSize = countTheoriesInCategory(selection.category);
    // 고른 카테고리에 이론이 지금 보이는 것 하나뿐이면 다시 뽑아도 같은 이론만 나옵니다.
    const onlyCurrentLeft =
        poolSize === 1 &&
        theory !== null &&
        (selection.category === ALL_CATEGORY || theory.category === selection.category);
    const drawBlocked = poolSize === 0 || onlyCurrentLeft;

    let drawHint = "";
    if (poolSize === 0) {
        drawHint = "이 카테고리의 이론은 아직 준비 중이에요. 다른 카테고리를 골라보세요.";
    } else if (onlyCurrentLeft) {
        drawHint =
            selection.category === ALL_CATEGORY
                ? "지금은 뽑을 수 있는 이론이 이것 하나뿐이에요."
                : `'${selection.category}' 카테고리에는 아직 이 이론 하나뿐이에요. 다른 카테고리도 골라보세요.`;
    }

    const todayItems = useMemo(() => {
        const studiedAt = new Map();
        for (const item of study.history) {
            if (!studiedAt.has(item.theoryId) && toDateKey(new Date(item.at)) === todayKey) {
                studiedAt.set(item.theoryId, item.at);
            }
        }
        return summary.todayTheoryIds
            .map((id) => getTheoryById(id))
            .filter(Boolean)
            .map((item) => ({ theory: item, at: studiedAt.get(item.id) ?? null }));
    }, [study.history, summary.todayTheoryIds, todayKey]);

    // 뽑아 둔 이론과 카테고리를 탭 단위로 기억합니다 (첫 화면 링크로 들어온 경우 포함).
    useEffect(() => {
        saveSelection(selection);
    }, [selection]);

    // 첫 화면 링크의 ?theory= · ?category= 는 한 번 읽었으면 주소에서 지웁니다.
    useEffect(() => {
        if (searchParams.has("theory") || searchParams.has("category")) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // 뽑기 연출 중에 다른 화면으로 이동하면 남은 타이머를 정리합니다.
    useEffect(() => {
        const timers = shuffleTimers.current;
        return () => {
            clearInterval(timers.intervalId);
            clearTimeout(timers.timeoutId);
        };
    }, []);

    const stopShuffle = () => {
        const timers = shuffleTimers.current;
        clearInterval(timers.intervalId);
        clearTimeout(timers.timeoutId);
        timers.intervalId = null;
        timers.timeoutId = null;
    };

    const handleCategoryChange = (category) => {
        if (category !== selection.category) setSelection({ ...selection, category });
    };

    const handleDraw = () => {
        if (shuffling || drawBlocked) return;
        const { category } = selection;
        const next = drawTheory({
            category,
            excludeId: theory?.id ?? null,
            avoidIds: summary.todayTheoryIds,
        });
        if (!next) {
            showToast("이 카테고리에는 아직 이론이 없어요.", { tone: "error" });
            return;
        }
        const nextSelection = { category, theoryId: next.id };
        // 섞을 후보가 하나뿐이거나 '동작 줄이기' 설정이면 연출 없이 바로 보여줍니다.
        if (poolSize < 2 || prefersReducedMotion()) {
            setSelection(nextSelection);
            return;
        }

        let lastTitle = theory?.title ?? "";
        const roll = () => {
            let title = randomTheoryTitle(category);
            for (let retry = 0; retry < 3 && title === lastTitle; retry += 1) {
                title = randomTheoryTitle(category);
            }
            lastTitle = title;
            setShuffleTitle(title);
        };
        roll();
        const timers = shuffleTimers.current;
        timers.intervalId = setInterval(roll, SHUFFLE_TICK_MS);
        timers.timeoutId = setTimeout(() => {
            stopShuffle();
            setShuffleTitle(null);
            setSelection(nextSelection);
        }, SHUFFLE_MS);
    };

    const handleComplete = () => {
        if (!userId || !theory) return;
        if (!markTheoryStudied(userId, theory)) {
            showToast("오늘 이미 공부한 이론이에요.");
            return;
        }
        const count = summary.todayTheories + 1;
        if (count === dailyGoal) {
            showToast(`오늘 목표 ${dailyGoal}개 달성!`, { tone: "success", icon: "party" });
        } else {
            showToast(`'${theory.title}' 공부 완료! 오늘 ${count}개째예요`, { tone: "success" });
        }
    };

    // '완료 취소' 버튼은 누르면 사라지므로 초점을 '공부 완료' 버튼으로 돌려줍니다.
    const handleUndo = () => {
        if (!userId || !theory) return;
        if (unmarkTheoryStudied(userId, theory.id)) showToast("공부 완료를 취소했어요.");
        completeRef.current?.focus();
    };

    const handleShowTheory = (theoryId) => {
        stopShuffle();
        // 제목에 초점을 옮기려면 새 이론이 먼저 화면에 그려져 있어야 합니다.
        flushSync(() => {
            setShuffleTitle(null);
            setSelection({ ...selection, theoryId });
        });
        titleRef.current?.focus({ preventScroll: true });
        drawCardRef.current?.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            block: "start",
        });
    };

    let drawLabel = "이론 뽑기";
    if (shuffling) drawLabel = "뽑는 중…";
    else if (theory) drawLabel = "다른 이론 뽑기";

    const theoryActions = (
        <div className={styles.theoryActions}>
            {isLoggedIn ? (
                <>
                    {/* 같은 버튼을 '완료됨' 상태로 바꿔서 키보드 초점이 사라지지 않게 합니다. */}
                    <button
                        ref={completeRef}
                        type="button"
                        className={isDone ? styles.doneButton : cx(ui.btn, ui.btnAccent, ui.btnLg, styles.completeButton)}
                        aria-disabled={isDone || undefined}
                        onClick={isDone ? undefined : handleComplete}
                    >
                        <Icon name={isDone ? "checkCircle" : "check"} size={20} />
                        {isDone ? "오늘 공부 완료" : "공부 완료"}
                    </button>
                    {isDone && (
                        <button type="button" className={cx(ui.btn, ui.btnGhost, ui.btnSm)} onClick={handleUndo}>
                            완료 취소
                        </button>
                    )}
                </>
            ) : (
                <button
                    type="button"
                    className={cx(ui.btn, ui.btnAccent, ui.btnLg, styles.completeButton)}
                    onClick={() => openAuthModal("login")}
                >
                    로그인하고 기록하기
                </button>
            )}
        </div>
    );

    return (
        <div className={styles.dashboard}>
            <div className={styles.container}>
                <Greeting isLoggedIn={isLoggedIn} name={getDisplayName(profile, userId)} todayKey={todayKey} />
            </div>

            {/* 이론 뽑기 — 화면 가로 전체를 쓰는 띠 */}
            <section ref={drawCardRef} className={styles.drawBand} aria-labelledby={drawTitleId}>
                <div className={styles.container}>
                    <div className={styles.bandHead}>
                        <div className={styles.bandIntro}>
                            <p className={ui.eyebrow}>Theory Draw</p>
                            <h2 id={drawTitleId} className={styles.bandTitle}>
                                이론 뽑기
                            </h2>
                            <p className={styles.bandDesc}>
                                {THEORY_CATEGORIES.length}개 분야 {THEORY_COUNT}가지 이론 가운데 오늘 생각해볼 이론을
                                만나보세요.
                            </p>
                        </div>
                        <div className={styles.drawControl}>
                            <button
                                type="button"
                                className={cx(styles.drawButton, shuffling && styles.drawButtonBusy)}
                                onClick={handleDraw}
                                aria-disabled={shuffling || drawBlocked || undefined}
                                aria-describedby={drawHint ? drawHintId : undefined}
                            >
                                <Icon name="shuffle" size={24} strokeWidth={2} className={styles.drawIcon} />
                                {drawLabel}
                            </button>
                            {drawHint && (
                                <p id={drawHintId} className={styles.drawHint}>
                                    {drawHint}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className={styles.chips} role="group" aria-label="카테고리">
                        {CATEGORY_OPTIONS.map((option) => {
                            const active = option === selection.category;
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    className={cx(ui.chip, styles.categoryChip, active && ui.chipActive)}
                                    aria-pressed={active}
                                    disabled={shuffling}
                                    onClick={() => handleCategoryChange(option)}
                                >
                                    {option}
                                    <span className={styles.chipCount}>{countTheoriesInCategory(option)}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className={cx(styles.stage, (shuffling || theory) && styles.stageFilled)}>
                        <div className={styles.stageLive} aria-live="polite" aria-busy={shuffling}>
                            {shuffling && (
                                <div className={styles.shuffle} aria-hidden="true">
                                    <p className={styles.shuffleLabel}>어떤 이론이 나올까요?</p>
                                    <p className={styles.shuffleTitle}>
                                        <span key={shuffleTitle} className={styles.shuffleText}>
                                            {shuffleTitle}
                                        </span>
                                    </p>
                                </div>
                            )}
                            {!shuffling && theory && (
                                <TheoryArticle
                                    key={theory.id}
                                    theory={theory}
                                    titleRef={titleRef}
                                    actions={theoryActions}
                                    onShowTheory={handleShowTheory}
                                />
                            )}
                            {!shuffling && !theory && <EmptyStage />}
                        </div>
                    </div>
                </div>
            </section>

            <div className={styles.container}>
                <div className={styles.lower}>
                    <div className={styles.row}>
                        <TodayCard
                            summary={summary}
                            dailyGoal={dailyGoal}
                            isLoggedIn={isLoggedIn}
                            todayKey={todayKey}
                        />
                        <TimerCard userId={userId} />
                    </div>

                    <TodayList
                        items={todayItems}
                        isLoggedIn={isLoggedIn}
                        activeId={shuffling ? null : (theory?.id ?? null)}
                        onSelect={handleShowTheory}
                    />
                </div>
            </div>
        </div>
    );
}

export default Main;
