import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import Portrait from "../components/Portrait";
import { useAuth } from "../lib/auth";
import { openAuthModal } from "../lib/authModal";
import { getPortrait } from "../lib/portrait";
import { THEORY_CATEGORIES, THEORY_COUNT, countTheoriesInCategory, getTheoryById } from "../lib/theory";
import ui from "../styles/ui.module.css";
import styles from "./home.module.css";

// 첫 화면(/) — 사이트 소개 슬라이드 · 분야 · 이론가 · 이용 방법 · 자주 묻는 질문

const SLIDE_MS = 6500;

const SLIDES = [
    {
        label: "생각의 시작",
        title: ["여러분이 원하는 모든 이론,", "바로 이곳에."],
        desc: ["경제부터 철학, 수학·컴퓨터까지.", "오늘 생각해볼 이론 하나가 버튼 하나로 찾아와요."],
        portrait: "albert-einstein",
        caption: "상대성 이론, 1905",
    },
    {
        label: "이론 뽑기",
        title: ["버튼 하나로", "오늘의 이론을 만나요."],
        desc: [
            `${THEORY_CATEGORIES.length}개 분야, ${THEORY_COUNT}가지 이론 가운데 하나를 무작위로 뽑아요.`,
            "오늘 이미 공부한 이론은 되도록 다시 나오지 않아요.",
        ],
        portrait: "adam-smith",
        caption: "보이지 않는 손, 1776",
        extra: "categories",
    },
    {
        label: "깊이 읽기",
        title: ["개요부터 비판까지,", "백과사전처럼 깊게."],
        desc: ["이론이 태어난 배경과 핵심 개념, 비판과 여담까지.", "한 화면에서 차근차근 읽어 내려가요."],
        portrait: "plato",
        caption: "동굴의 비유, 기원전 4세기",
        extra: "points",
    },
    {
        label: "꾸준한 기록",
        title: ["기록이 쌓이면,", "생각이 자라요."],
        desc: ["공부 타이머로 집중한 시간을 재고 하루 목표를 채워 보세요.", "함께 공부하는 사람들과 순위를 겨룰 수도 있어요."],
        portrait: "charles-darwin",
        caption: "자연선택설, 1858",
        extra: "boxes",
    },
];

const READ_POINTS = [
    { title: "배경", text: "이론이 태어난 순간" },
    { title: "핵심 내용", text: "꼭 알아야 할 개념" },
    { title: "비판과 한계", text: "다른 시각까지 함께" },
];

const RECORD_BOXES = [
    { key: "Timer", title: "공부 타이머", text: "집중한 시간을 자동으로 기록" },
    { key: "Goal", title: "하루 목표", text: "목표 개수를 채우는 재미" },
    { key: "Rank", title: "리더보드", text: "함께 공부하는 사람들과" },
];

const CATEGORY_CARDS = [
    { category: "경제", english: "Economics", portrait: "david-ricardo" },
    { category: "심리", english: "Psychology", portrait: "edward-thorndike" },
    { category: "과학", english: "Science", portrait: "louis-pasteur" },
    { category: "철학", english: "Philosophy", portrait: "mencius" },
    { category: "사회", english: "Society", portrait: "vilfredo-pareto" },
    { category: "수학·컴퓨터", english: "Math & Computing", portrait: "alan-turing" },
    { category: "학습", english: "Learning", portrait: "hermann-ebbinghaus" },
];

const THINKERS = [
    { portrait: "jeremy-bentham", theoryId: "utilitarianism" },
    { portrait: "rudolf-clausius", theoryId: "second-law-of-thermodynamics" },
    { portrait: "garrett-hardin", theoryId: "tragedy-of-the-commons" },
    { portrait: "jacob-bernoulli", theoryId: "law-of-large-numbers" },
    { portrait: "claude-shannon", theoryId: "information-theory" },
    { portrait: "john-rawls", theoryId: "veil-of-ignorance" },
    { portrait: "werner-heisenberg", theoryId: "uncertainty-principle" },
    { portrait: "stanley-milgram", theoryId: "six-degrees-of-separation" },
];

const STEPS = [
    {
        icon: "dice",
        title: "이론 뽑기",
        text: "관심 있는 분야를 고르고 버튼을 누르세요. 오늘 생각해볼 이론이 무작위로 찾아와요.",
    },
    {
        icon: "book",
        title: "깊이 읽기",
        text: "개요와 배경, 핵심 내용, 비판과 한계, 여담까지. 백과사전처럼 정리된 설명을 읽고 질문에 답해 보세요.",
    },
    {
        icon: "chart",
        title: "기록하고 겨루기",
        text: "‘공부 완료’와 타이머로 기록을 쌓고, 통계와 리더보드에서 나의 꾸준함을 확인해요.",
    },
];

const FAQS = [
    {
        q: "로그인하지 않아도 쓸 수 있나요?",
        a: "네. 이론 뽑기와 공부 타이머는 로그인 없이 바로 쓸 수 있어요. ‘공부 완료’ 기록과 통계, 프로필, 리더보드 순위는 로그인한 뒤부터 쌓여요.",
    },
    {
        q: "어떤 이론들이 있나요?",
        a: `${THEORY_CATEGORIES.join("·")} ${THEORY_CATEGORIES.length}개 분야에서 고른 ${THEORY_COUNT}가지 이론이 있어요. 분야를 골라서 뽑을 수도 있고, 그날 이미 공부한 이론은 되도록 다시 나오지 않아요.`,
    },
    {
        q: "이론 설명은 어떻게 구성되어 있나요?",
        a: "백과사전처럼 개요, 등장 배경, 핵심 내용, 예시, 비판과 한계, 여담 순서로 정리했어요. 마지막의 ‘생각해보기’ 질문과 관련 이론으로 생각을 한 걸음 더 넓혀 보세요.",
    },
    {
        q: "공부 시간은 어떻게 기록되나요?",
        a: "로그인한 상태에서 공부 타이머를 켜 두면 흐른 시간이 오늘의 공부 시간에 자동으로 더해져요. 다른 화면으로 이동해도 타이머는 계속 흐르고, 상단 메뉴에서 남은 시간을 볼 수 있어요.",
    },
    {
        q: "리더보드 순위는 어떻게 정해지나요?",
        a: "오늘·이번 주·전체 기간마다 공부한 이론 수나 공부 시간을 기준으로 순위를 매겨요. 지금은 이 브라우저에 저장된 기록으로 순위를 보여줘요.",
    },
    {
        q: "하루 목표는 바꿀 수 있나요?",
        a: "프로필에서 하루에 공부할 이론 개수를 1개부터 20개까지 정할 수 있어요. 대시보드의 ‘오늘의 공부’에서 목표까지 남은 개수를 확인해 보세요.",
    },
];

function cx(...classNames) {
    return classNames.filter(Boolean).join(" ");
}

function pad(number) {
    return String(number).padStart(2, "0");
}

function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** 대시보드에서 특정 분야/이론을 바로 열어 주는 주소 */
function dashboardLink(params) {
    return `/main?${new URLSearchParams(params).toString()}`;
}

function SlideExtra({ type }) {
    if (type === "categories") {
        return (
            <ul className={styles.slideChips} role="list">
                {THEORY_CATEGORIES.map((category) => (
                    <li key={category} className={styles.slideChip}>
                        {category}
                    </li>
                ))}
            </ul>
        );
    }
    if (type === "points") {
        return (
            <ol className={styles.slidePoints} role="list">
                {READ_POINTS.map((point, index) => (
                    <li key={point.title} className={styles.slidePoint}>
                        <span className={styles.slidePointNum}>{pad(index + 1)}</span>
                        <strong>{point.title}</strong>
                        <span>{point.text}</span>
                    </li>
                ))}
            </ol>
        );
    }
    if (type === "boxes") {
        return (
            <ul className={styles.slideBoxes} role="list">
                {RECORD_BOXES.map((box) => (
                    <li key={box.key} className={styles.slideBox}>
                        <span className={styles.slideBoxKey} lang="en">
                            {box.key}
                        </span>
                        <strong>{box.title}</strong>
                        <span>{box.text}</span>
                    </li>
                ))}
            </ul>
        );
    }
    return null;
}

function Hero() {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(() => !prefersReducedMotion());
    const count = SLIDES.length;

    // 재생 중이면 SLIDE_MS 마다 다음 슬라이드로. 직접 넘기면 시간도 처음부터 다시 셉니다.
    useEffect(() => {
        if (!playing) return undefined;
        const timeoutId = setTimeout(() => setIndex((current) => (current + 1) % count), SLIDE_MS);
        return () => clearTimeout(timeoutId);
    }, [playing, index, count]);

    const goTo = (next) => setIndex((next + count) % count);

    return (
        <section className={styles.hero} aria-roledescription="carousel" aria-label="SOMETHINK 소개">
            <div className={styles.slides}>
                {SLIDES.map((slide, slideIndex) => {
                    const active = slideIndex === index;
                    const portrait = getPortrait(slide.portrait);
                    return (
                        <div
                            key={slide.label}
                            className={cx(styles.slide, active && styles.slideActive)}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${slideIndex + 1} / ${count}`}
                            aria-hidden={!active}
                            inert={!active}
                        >
                            <div className={styles.slideMedia}>
                                <Portrait
                                    portrait={portrait}
                                    width={1280}
                                    sizes="(min-width: 900px) 62vw, 100vw"
                                    loading={slideIndex === 0 ? "eager" : "lazy"}
                                    decorative
                                    className={styles.slideImage}
                                />
                                <span className={styles.slideShade} aria-hidden="true" />
                                <p className={styles.caption}>
                                    <span lang="en">{portrait?.english}</span>
                                    <span className={styles.captionText}>{slide.caption}</span>
                                </p>
                            </div>
                            <div className={styles.slideBody}>
                                <p className={styles.slideLabel}>{slide.label}</p>
                                <h2 className={styles.slideTitle}>
                                    {slide.title.map((line) => (
                                        <span key={line} className={styles.line}>
                                            {line}
                                        </span>
                                    ))}
                                </h2>
                                <p className={styles.slideDesc}>
                                    {slide.desc.map((line) => (
                                        <span key={line} className={styles.line}>
                                            {line}
                                        </span>
                                    ))}
                                </p>
                                <SlideExtra type={slide.extra} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={styles.heroBar}>
                <div className={styles.heroBarInner}>
                    <div className={styles.heroControls}>
                        <p className={styles.counter} aria-hidden="true">
                            <strong>{pad(index + 1)}</strong> / {pad(count)}
                        </p>
                        <div className={styles.dots}>
                            {SLIDES.map((slide, slideIndex) => {
                                const active = slideIndex === index;
                                return (
                                    <button
                                        key={slide.label}
                                        type="button"
                                        className={cx(styles.dot, active && styles.dotActive)}
                                        onClick={() => goTo(slideIndex)}
                                        aria-label={`${slideIndex + 1}번 슬라이드: ${slide.title.join(" ")}`}
                                        aria-current={active ? "true" : undefined}
                                    >
                                        {active && (
                                            <span
                                                key={index}
                                                className={cx(styles.dotFill, playing && styles.dotFillPlaying)}
                                                style={{ animationDuration: `${SLIDE_MS}ms` }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.arrows}>
                            <button
                                type="button"
                                className={styles.roundButton}
                                onClick={() => goTo(index - 1)}
                                aria-label="이전 슬라이드"
                            >
                                <Icon name="chevronLeft" size={18} />
                            </button>
                            <button
                                type="button"
                                className={styles.roundButton}
                                onClick={() => setPlaying((value) => !value)}
                                aria-label={playing ? "슬라이드 자동 재생 멈춤" : "슬라이드 자동 재생 시작"}
                            >
                                <Icon name={playing ? "pause" : "play"} size={16} />
                            </button>
                            <button
                                type="button"
                                className={styles.roundButton}
                                onClick={() => goTo(index + 1)}
                                aria-label="다음 슬라이드"
                            >
                                <Icon name="chevronRight" size={18} />
                            </button>
                        </div>
                    </div>
                    <Link to="/main" className={styles.heroCta}>
                        이론 뽑으러 가기
                        <Icon name="arrowRight" size={18} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

function Disciplines() {
    const trackRef = useRef(null);
    const titleId = useId();

    const scrollByCards = (direction) => {
        const track = trackRef.current;
        if (!track) return;
        const card = track.querySelector("li");
        const step = card ? card.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
        track.scrollBy({ left: direction * step, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    };

    return (
        <section className={styles.intro} aria-labelledby={titleId}>
            <div className={styles.container}>
                <div className={styles.introHead}>
                    <div>
                        <p className={ui.eyebrow}>Think Something</p>
                        <h2 id={titleId} className={styles.sectionTitle}>
                            생각의 거인들이 남긴 이론,
                            <br />
                            하루에 하나씩.
                        </h2>
                    </div>
                    <div className={styles.introAside}>
                        <p className={styles.introText}>
                            교과서 속 낯선 이름들이 사실은 우리의 하루를 설명하고 있었어요. SOMETHINK는 2,400년에 걸친
                            생각의 역사에서 고른 이론을 하루 한 개씩, 깊이 있게 소개합니다.
                        </p>
                        <dl className={styles.figures}>
                            <div className={styles.figure}>
                                <dt>가지 이론</dt>
                                <dd>{THEORY_COUNT}</dd>
                            </div>
                            <div className={styles.figure}>
                                <dt>개 분야</dt>
                                <dd>{THEORY_CATEGORIES.length}</dd>
                            </div>
                            <div className={styles.figure}>
                                <dt>년에 걸친 생각</dt>
                                <dd>2,400</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <div className={styles.rowHead}>
                    <h3 className={styles.serifTitle}>
                        <span lang="en">Disciplines</span>
                        <span className={styles.serifSub}>{THEORY_CATEGORIES.length}개 분야</span>
                    </h3>
                    <div className={styles.rowNav}>
                        <button
                            type="button"
                            className={styles.outlineRound}
                            onClick={() => scrollByCards(-1)}
                            aria-label="이전 분야 보기"
                        >
                            <Icon name="arrowLeft" size={18} />
                        </button>
                        <button
                            type="button"
                            className={styles.outlineRound}
                            onClick={() => scrollByCards(1)}
                            aria-label="다음 분야 보기"
                        >
                            <Icon name="arrowRight" size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <ul ref={trackRef} className={styles.track} role="list">
                {CATEGORY_CARDS.map((card, cardIndex) => {
                    const portrait = getPortrait(card.portrait);
                    return (
                        <li key={card.category} className={styles.trackItem}>
                            <Link to={dashboardLink({ category: card.category })} className={styles.categoryCard}>
                                <Portrait
                                    portrait={portrait}
                                    width={500}
                                    sizes="(min-width: 900px) 300px, 70vw"
                                    decorative
                                    className={styles.categoryImage}
                                />
                                <span className={styles.categoryShade} aria-hidden="true" />
                                <span className={styles.categoryIndex} aria-hidden="true">
                                    {pad(cardIndex + 1)}
                                </span>
                                <span className={styles.categoryBody}>
                                    <span className={styles.categoryEnglish} lang="en">
                                        {card.english}
                                    </span>
                                    <span className={styles.categoryName}>{card.category}</span>
                                    <span className={styles.categoryMeta}>
                                        {portrait?.name} 외 · {countTheoriesInCategory(card.category)}개 이론
                                    </span>
                                </span>
                                <span className={styles.categoryArrow} aria-hidden="true">
                                    <Icon name="arrowUpRight" size={18} />
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function Thinkers() {
    const [active, setActive] = useState(0);
    const titleId = useId();
    const thinker = THINKERS[active];
    const portrait = getPortrait(thinker.portrait);
    const theory = getTheoryById(thinker.theoryId);

    return (
        <section className={styles.thinkers} aria-labelledby={titleId}>
            <div className={styles.thinkersMedia} aria-hidden="true">
                <Portrait
                    key={thinker.portrait}
                    portrait={portrait}
                    width={960}
                    sizes="(min-width: 900px) 45vw, 100vw"
                    decorative
                    className={styles.thinkersImage}
                />
                <span className={styles.thinkersShade} />
            </div>

            <div className={cx(styles.container, styles.thinkersGrid)}>
                <div className={styles.thinkersIntro}>
                    <h2 id={titleId} className={cx(styles.serifTitle, styles.serifTitleLight)}>
                        <span lang="en">Our Thinkers</span>
                        <span className={styles.serifSub}>생각의 거인들</span>
                    </h2>
                    <ul className={styles.thinkerList} role="list">
                        {THINKERS.map((item, itemIndex) => {
                            const person = getPortrait(item.portrait);
                            const selected = itemIndex === active;
                            return (
                                <li key={item.portrait}>
                                    <button
                                        type="button"
                                        className={cx(styles.thinkerName, selected && styles.thinkerNameActive)}
                                        aria-pressed={selected}
                                        onClick={() => setActive(itemIndex)}
                                        onMouseEnter={() => setActive(itemIndex)}
                                        onFocus={() => setActive(itemIndex)}
                                    >
                                        <span lang="en">{person?.english}</span>
                                        <Icon name="arrowRight" size={16} className={styles.thinkerArrow} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {theory && (
                    <article key={theory.id} className={styles.feature} aria-live="polite">
                        <p className={styles.featureMeta}>
                            <span>{theory.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{portrait?.name}</span>
                            <span className={styles.featureYears}>{portrait?.years}</span>
                        </p>
                        <h3 className={styles.featureTitle}>{theory.title}</h3>
                        <p className={styles.featureEnglish} lang="en">
                            {theory.english}
                        </p>
                        <p className={styles.featureSummary}>{theory.summary}</p>
                        <Link to={dashboardLink({ theory: theory.id })} className={styles.featureLink}>
                            이 이론 자세히 읽기
                            <Icon name="arrowRight" size={18} />
                        </Link>
                    </article>
                )}
            </div>
        </section>
    );
}

function HowItWorks() {
    const titleId = useId();
    return (
        <section className={styles.how} aria-labelledby={titleId}>
            <div className={styles.container}>
                <p className={ui.eyebrow}>How it works</p>
                <h2 id={titleId} className={styles.sectionTitle}>
                    하루 10분,
                    <br />
                    생각하는 습관을 만드는 세 단계.
                </h2>
                <ol className={styles.steps} role="list">
                    {STEPS.map((step, stepIndex) => (
                        <li key={step.title} className={styles.step}>
                            <div className={styles.stepTop}>
                                <span className={styles.stepNum}>{pad(stepIndex + 1)}</span>
                                <Icon name={step.icon} size={26} strokeWidth={1.6} className={styles.stepIcon} />
                            </div>
                            <h3 className={styles.stepTitle}>{step.title}</h3>
                            <p className={styles.stepText}>{step.text}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

function Faq() {
    const titleId = useId();
    return (
        <section className={cx(styles.container, styles.faq)} aria-labelledby={titleId}>
            <div className={styles.faqHead}>
                <p className={ui.eyebrow}>A little more clarity</p>
                <h2 id={titleId} className={styles.sectionTitle}>
                    시작하기 전
                    <br />
                    자주 묻는 질문
                </h2>
            </div>
            <div className={styles.faqList}>
                {FAQS.map((item) => (
                    <details key={item.q} className={styles.faqItem} name="somethink-faq">
                        <summary className={styles.faqQuestion}>
                            <span>{item.q}</span>
                            <span className={styles.faqIcon} aria-hidden="true">
                                <Icon name="plus" size={20} strokeWidth={1.6} />
                            </span>
                        </summary>
                        <p className={styles.faqAnswer}>{item.a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}

function ClosingCta() {
    const { isLoggedIn } = useAuth();
    const titleId = useId();
    const kant = getPortrait("immanuel-kant");
    return (
        <section className={cx(styles.container, styles.ctaWrap)} aria-labelledby={titleId}>
            <div className={styles.cta}>
                <div className={styles.ctaMedia} aria-hidden="true">
                    <Portrait
                        portrait={kant}
                        width={960}
                        sizes="(min-width: 900px) 40vw, 100vw"
                        decorative
                        className={styles.ctaImage}
                    />
                </div>
                <div className={styles.ctaBody}>
                    <Icon name="quote" size={40} className={styles.ctaQuoteMark} />
                    <h2 id={titleId} className={styles.ctaQuote}>
                        <span lang="la">Sapere aude.</span>
                        <span className={styles.ctaQuoteKo}>너 자신의 지성을 사용할 용기를 가져라.</span>
                    </h2>
                    <p className={styles.ctaSource}>— 이마누엘 칸트, 「계몽이란 무엇인가에 대한 답변」 (1784)</p>
                    <div className={styles.ctaActions}>
                        <Link to="/main" className={styles.ctaButton}>
                            오늘의 이론 뽑기
                            <Icon name="arrowRight" size={18} />
                        </Link>
                        {!isLoggedIn && (
                            <button type="button" className={styles.ctaGhost} onClick={() => openAuthModal("signup")}>
                                회원가입하고 기록하기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

function Home() {
    return (
        <div className={styles.home}>
            <Hero />
            <Disciplines />
            <Thinkers />
            <HowItWorks />
            <Faq />
            <ClosingCta />
        </div>
    );
}

export default Home;
