import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import LoginRequired from "../components/LoginRequired";
import { useAuth } from "../lib/auth";
import { daysBetween, formatDateTime, formatDuration, toDateKey, useTodayKey } from "../lib/date";
import { signOut } from "../lib/session";
import { summarizeStudy } from "../lib/stats";
import {
    AVATAR_COLORS,
    PROFILE_LIMITS,
    getAvatarColor,
    getDisplayName,
    saveProfile,
    useProfile,
    useStudy,
} from "../lib/store";
import { THEORY_CATEGORIES } from "../lib/theory";
import { showToast } from "../lib/toast";
import ui from "../styles/ui.module.css";
import styles from "./profile.module.css";

const GOAL_MIN = PROFILE_LIMITS.dailyGoalMin;
const GOAL_MAX = PROFILE_LIMITS.dailyGoalMax;

// 공백 없이 "무엇@도메인.최상위도메인(2글자 이상)" 이면 통과. 너무 엄격하면 멀쩡한 주소까지 막혀요.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

// 스크린리더가 읽어줄 색 이름. AVATAR_COLORS 가 바뀌어 이름이 없으면 "색상 n" 으로 읽어요.
const COLOR_NAMES = {
    "#111111": "검정",
    "#007a72": "청록",
    "#2563c9": "파랑",
    "#c2410c": "주황",
    "#6d4ae0": "보라",
    "#be3a34": "빨강",
    "#0f7b5f": "초록",
    "#8a5a00": "갈색",
};

const ICON_PATHS = {
    check: "M5 12.5l4.5 4.5L19 7.5",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
};

function isValidEmail(email) {
    return email === "" || EMAIL_PATTERN.test(email);
}

/** 하루 목표 입력값을 범위 안의 정수로 맞춥니다. 비었거나 숫자가 아니면 fallback */
function clampGoal(value, fallback) {
    const text = String(value).trim();
    const number = Math.round(Number(text));
    if (text === "" || !Number.isFinite(number)) return fallback;
    return Math.min(GOAL_MAX, Math.max(GOAL_MIN, number));
}

/** 저장된 프로필 → 폼 입력값 */
function toDraft(profile) {
    return {
        name: profile.name,
        email: profile.email,
        bio: profile.bio,
        interests: [...profile.interests],
        dailyGoal: String(profile.dailyGoal),
        avatarColor: profile.avatarColor,
    };
}

/**
 * 저장할 값. 변경 여부를 비교할 때도 같은 방식으로 정리해야
 * 앞뒤 공백만 다른 입력을 "바뀐 것" 으로 착각하지 않아요.
 */
function toPatch(values, fallbackGoal) {
    return {
        name: values.name.trim(),
        email: values.email.trim(),
        bio: values.bio.trim(),
        interests: values.interests,
        dailyGoal: clampGoal(values.dailyGoal, fallbackGoal),
        avatarColor: values.avatarColor,
    };
}

function isSamePatch(a, b) {
    return (
        a.name === b.name &&
        a.email === b.email &&
        a.bio === b.bio &&
        a.dailyGoal === b.dailyGoal &&
        a.avatarColor === b.avatarColor &&
        a.interests.length === b.interests.length &&
        a.interests.every((interest) => b.interests.includes(interest))
    );
}

function Icon({ name, size = 16 }) {
    return (
        <svg className={styles.icon} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
                d={ICON_PATHS[name]}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** "1시간 5분" 처럼 숫자는 크게, 단위는 작게 보여줍니다. */
function StatValue({ text }) {
    return text
        .split(/(\d+)/)
        .filter(Boolean)
        .map((part, index) =>
            /^\d+$/.test(part) ? (
                <span key={index}>{part}</span>
            ) : (
                <span key={index} className={styles.statUnit}>
                    {part}
                </span>
            ),
        );
}

/** 저장된 프로필을 보여주는 카드 (폼에서 고치는 중인 값은 저장하기 전까지 반영하지 않아요) */
function ProfileCard({ userId, profile }) {
    const navigate = useNavigate();
    const todayKey = useTodayKey();
    const study = useStudy(userId);
    const summary = useMemo(() => summarizeStudy(study, todayKey), [study, todayKey]);
    const headingId = useId();

    const name = getDisplayName(profile, userId);
    const email = profile.email.trim();
    const bio = profile.bio.trim();
    // createdAt 은 저장된 시각(데이터)이라 렌더 중에 써도 결과가 매번 같아요.
    const joinedDays =
        profile.createdAt === null
            ? null
            : Math.max(1, daysBetween(toDateKey(new Date(profile.createdAt)), todayKey) + 1);

    const stats = [
        { label: "총 공부한 이론", value: `${summary.totalTheories}개` },
        { label: "총 공부 시간", value: formatDuration(summary.totalSeconds) },
        { label: "연속 공부", value: `${summary.currentStreak}일` },
    ];

    const handleLogout = () => {
        signOut();
        showToast("로그아웃했어요.");
        navigate("/main");
    };

    return (
        <section className={`${ui.card} ${styles.card} ${styles.profileCard}`} aria-labelledby={headingId}>
            <div className={styles.identity}>
                <Avatar
                    name={name}
                    color={getAvatarColor(profile, userId)}
                    size={96}
                    className={styles.bigAvatar}
                />
                <div className={styles.identityText}>
                    <h2 id={headingId} className={styles.displayName}>
                        {name}
                    </h2>
                    <p className={styles.handle}>@{userId}</p>
                    {email !== "" &&
                        (isValidEmail(email) ? (
                            <a className={`${styles.email} ${styles.emailLink}`} href={`mailto:${email}`}>
                                {email}
                            </a>
                        ) : (
                            <span className={styles.email}>{email}</span>
                        ))}
                    {joinedDays !== null && (
                        <p className={styles.since}>
                            SOMETHINK와 함께한 지 <span className={styles.sinceDays}>{joinedDays}일째</span>
                        </p>
                    )}
                </div>
            </div>

            <div className={styles.details}>
                <div className={styles.detail}>
                    <h3 className={styles.subheading}>나의 설명</h3>
                    {bio ? (
                        <p className={styles.bio}>{bio}</p>
                    ) : (
                        <p className={`${styles.bio} ${ui.muted}`}>아직 자기소개가 없어요</p>
                    )}
                </div>

                {profile.interests.length > 0 && (
                    <div className={styles.detail}>
                        <h3 className={styles.subheading}>관심 분야</h3>
                        <ul className={styles.tags} role="list">
                            {profile.interests.map((interest) => (
                                <li key={interest} className={`${ui.tag} ${styles.tag}`}>
                                    {interest}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <dl className={styles.stats}>
                {stats.map((stat) => (
                    <div key={stat.label} className={styles.stat}>
                        <dt className={styles.statLabel}>{stat.label}</dt>
                        <dd className={styles.statValue}>
                            <StatValue text={stat.value} />
                        </dd>
                    </div>
                ))}
            </dl>

            <button type="button" className={`${ui.btn} ${ui.btnDanger} ${styles.logout}`} onClick={handleLogout}>
                로그아웃
            </button>
        </section>
    );
}

function ProfileForm({ userId, profile }) {
    const id = useId();
    const emailRef = useRef(null);
    const [form, setForm] = useState(() => toDraft(profile));
    const [emailChecked, setEmailChecked] = useState(false);
    const [goalMessage, setGoalMessage] = useState("");

    // 다른 탭에서 프로필이 저장되면, 아직 손대지 않은 폼은 새 값을 따라가게 합니다.
    // effect 로 맞추면 옛 값이 한 번 그려지므로 렌더 중에 조정해요 (React 문서의 "prop 이 바뀔 때 state 조정" 방식).
    const [baseProfile, setBaseProfile] = useState(profile);
    if (baseProfile !== profile) {
        setBaseProfile(profile);
        if (isSamePatch(toPatch(form, baseProfile.dailyGoal), toPatch(baseProfile, baseProfile.dailyGoal))) {
            setForm(toDraft(profile));
        }
    }

    const patch = toPatch(form, profile.dailyGoal);
    const dirty = !isSamePatch(patch, toPatch(profile, profile.dailyGoal));
    const showEmailError = emailChecked && !isValidEmail(patch.email);
    const goal = patch.dailyGoal;
    const bioLength = form.bio.length;

    // 지금 카테고리 목록에 없는 예전 관심 분야도 칩으로 보여줘야 해제할 수 있어요.
    const interestOptions = [
        ...THEORY_CATEGORIES,
        ...profile.interests.filter((interest) => !THEORY_CATEGORIES.includes(interest)),
    ];

    const colorOptions = [
        { key: "auto", value: null, color: getAvatarColor(null, userId), label: "자동" },
        ...AVATAR_COLORS.map((color, index) => ({
            key: color,
            value: color,
            color,
            label: COLOR_NAMES[color] ?? `색상 ${index + 1}`,
        })),
    ];

    const ids = {
        title: `${id}-title`,
        userId: `${id}-user-id`,
        userIdHelp: `${id}-user-id-help`,
        name: `${id}-name`,
        nameHelp: `${id}-name-help`,
        email: `${id}-email`,
        emailMessage: `${id}-email-message`,
        bio: `${id}-bio`,
        bioHelp: `${id}-bio-help`,
        bioCount: `${id}-bio-count`,
        interestsHelp: `${id}-interests-help`,
        goal: `${id}-goal`,
        goalHelp: `${id}-goal-help`,
        colorGroup: `${id}-color`,
        colorHelp: `${id}-color-help`,
    };

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const toggleInterest = (interest) => {
        setForm((current) => {
            const selected = current.interests.includes(interest)
                ? current.interests.filter((item) => item !== interest)
                : [...current.interests, interest];
            // 누른 순서와 상관없이 칩 순서대로 저장해요
            return { ...current, interests: interestOptions.filter((option) => selected.includes(option)) };
        });
    };

    const stepGoal = (amount) => {
        const next = Math.min(GOAL_MAX, Math.max(GOAL_MIN, goal + amount));
        if (next === goal) return;
        updateField("dailyGoal", String(next));
        // 버튼에 포커스가 있으면 바뀐 숫자를 읽어주지 않아서 따로 알려줘요
        setGoalMessage(`하루 목표 이론 ${next}개`);
    };

    const handleGoalBlur = () => {
        setForm((current) => {
            const dailyGoal = String(clampGoal(current.dailyGoal, profile.dailyGoal));
            return dailyGoal === current.dailyGoal ? current : { ...current, dailyGoal };
        });
    };

    const handleRevert = () => {
        setForm(toDraft(profile));
        setEmailChecked(false);
        setGoalMessage("");
        showToast("저장된 내용으로 되돌렸어요");
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!isValidEmail(patch.email)) {
            setEmailChecked(true);
            emailRef.current?.focus();
            return;
        }
        if (!dirty) return;
        const saved = saveProfile(userId, patch);
        setForm(toDraft(saved));
        setEmailChecked(false);
        setGoalMessage("");
        showToast("프로필을 저장했어요", { tone: "success" });
    };

    return (
        <form
            className={`${ui.card} ${styles.card} ${styles.form}`}
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby={ids.title}
        >
            <div className={styles.formHeader}>
                <h2 id={ids.title} className={ui.cardTitle}>
                    프로필 수정
                </h2>
                <p className={ui.cardDesc}>바꾼 내용은 ‘저장’을 눌러야 프로필에 반영돼요</p>
            </div>

            <div className={styles.fieldPair}>
                <div className={ui.field}>
                    <label htmlFor={ids.userId} className={ui.label}>
                        아이디
                    </label>
                    <input
                        id={ids.userId}
                        className={ui.input}
                        type="text"
                        value={userId}
                        disabled
                        aria-describedby={ids.userIdHelp}
                    />
                    <p id={ids.userIdHelp} className={`${ui.help} ${styles.message}`}>
                        아이디는 바꿀 수 없어요
                    </p>
                </div>

                <div className={ui.field}>
                    <label htmlFor={ids.name} className={ui.label}>
                        이름
                    </label>
                    <input
                        id={ids.name}
                        className={ui.input}
                        type="text"
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        maxLength={PROFILE_LIMITS.name}
                        placeholder={userId}
                        autoComplete="nickname"
                        aria-describedby={ids.nameHelp}
                    />
                    <p id={ids.nameHelp} className={`${ui.help} ${styles.message}`}>
                        비워두면 아이디가 대신 표시돼요
                    </p>
                </div>
            </div>

            <div className={ui.field}>
                <label htmlFor={ids.email} className={ui.label}>
                    이메일 <span className={styles.optional}>(선택)</span>
                </label>
                <input
                    ref={emailRef}
                    id={ids.email}
                    className={`${ui.input} ${showEmailError ? ui.inputInvalid : ""}`}
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    onBlur={() => setEmailChecked(true)}
                    maxLength={PROFILE_LIMITS.email}
                    placeholder="name@example.com"
                    autoComplete="email"
                    spellCheck={false}
                    aria-invalid={showEmailError}
                    aria-describedby={ids.emailMessage}
                />
                <p
                    id={ids.emailMessage}
                    className={`${showEmailError ? ui.error : ui.help} ${styles.message}`}
                    aria-live="polite"
                >
                    {showEmailError
                        ? "이메일 형식을 확인해 주세요. 예: name@example.com"
                        : "적어두면 프로필 카드에 함께 보여요"}
                </p>
            </div>

            <div className={ui.field}>
                <label htmlFor={ids.bio} className={ui.label}>
                    나의 설명
                </label>
                <textarea
                    id={ids.bio}
                    className={ui.textarea}
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    maxLength={PROFILE_LIMITS.bio}
                    rows={4}
                    placeholder="예: 매일 이론 하나씩 꾸준히 공부하고 있어요"
                    aria-describedby={`${ids.bioHelp} ${ids.bioCount}`}
                />
                <div className={styles.helpRow}>
                    <p id={ids.bioHelp} className={`${ui.help} ${styles.message}`}>
                        요즘 공부하는 것이나 관심사를 자유롭게 적어보세요
                    </p>
                    <span
                        id={ids.bioCount}
                        className={`${styles.counter} ${bioLength >= PROFILE_LIMITS.bio ? styles.counterFull : ""}`}
                    >
                        {bioLength}/{PROFILE_LIMITS.bio}
                    </span>
                </div>
            </div>

            <fieldset className={styles.fieldset} aria-describedby={ids.interestsHelp}>
                <legend className={`${ui.label} ${styles.legend}`}>관심 분야</legend>
                <div className={styles.chips}>
                    {interestOptions.map((interest) => {
                        const selected = form.interests.includes(interest);
                        return (
                            <button
                                key={interest}
                                type="button"
                                className={`${ui.chip} ${selected ? ui.chipActive : ""} ${styles.chip}`}
                                aria-pressed={selected}
                                onClick={() => toggleInterest(interest)}
                            >
                                <Icon name={selected ? "check" : "plus"} size={14} />
                                {interest}
                            </button>
                        );
                    })}
                </div>
                <p id={ids.interestsHelp} className={`${ui.help} ${styles.message}`}>
                    여러 개 고를 수 있어요
                    {form.interests.length > 0 && ` · ${form.interests.length}개 골랐어요`}
                </p>
            </fieldset>

            <div className={ui.field}>
                <label htmlFor={ids.goal} className={ui.label}>
                    하루 목표<span className={ui.srOnly}> (공부할 이론 개수)</span>
                </label>
                <div className={styles.stepper}>
                    <button
                        type="button"
                        className={styles.stepButton}
                        onClick={() => stepGoal(-1)}
                        aria-label="하루 목표 줄이기"
                        aria-controls={ids.goal}
                        aria-disabled={goal <= GOAL_MIN}
                    >
                        <Icon name="minus" size={18} />
                    </button>
                    <div className={styles.goalBox}>
                        <span aria-hidden="true">이론</span>
                        <input
                            id={ids.goal}
                            className={styles.goalInput}
                            type="number"
                            inputMode="numeric"
                            min={GOAL_MIN}
                            max={GOAL_MAX}
                            step={1}
                            value={form.dailyGoal}
                            onChange={(event) => updateField("dailyGoal", event.target.value)}
                            onBlur={handleGoalBlur}
                            aria-describedby={ids.goalHelp}
                        />
                        <span aria-hidden="true">개</span>
                    </div>
                    <button
                        type="button"
                        className={styles.stepButton}
                        onClick={() => stepGoal(1)}
                        aria-label="하루 목표 늘리기"
                        aria-controls={ids.goal}
                        aria-disabled={goal >= GOAL_MAX}
                    >
                        <Icon name="plus" size={18} />
                    </button>
                </div>
                <p id={ids.goalHelp} className={`${ui.help} ${styles.message}`}>
                    대시보드의 ‘오늘의 공부’ 목표로 쓰여요
                </p>
                <span className={ui.srOnly} aria-live="polite">
                    {goalMessage}
                </span>
            </div>

            <fieldset className={styles.fieldset} aria-describedby={ids.colorHelp}>
                <legend className={`${ui.label} ${styles.legend}`}>아바타 색상</legend>
                <div className={styles.colorRow}>
                    <div className={styles.preview} aria-hidden="true">
                        <Avatar name={getDisplayName(form, userId)} color={getAvatarColor(form, userId)} size={52} />
                        <span className={styles.previewLabel}>미리보기</span>
                    </div>
                    <div className={styles.swatches}>
                        {colorOptions.map((option) => {
                            const checked = form.avatarColor === option.value;
                            const isAuto = option.value === null;
                            return (
                                <label
                                    key={option.key}
                                    className={styles.swatch}
                                    title={isAuto ? undefined : option.label}
                                >
                                    <input
                                        type="radio"
                                        name={ids.colorGroup}
                                        value={option.key}
                                        checked={checked}
                                        onChange={() => updateField("avatarColor", option.value)}
                                        className={styles.swatchInput}
                                        aria-label={option.label}
                                    />
                                    {isAuto ? (
                                        <span className={`${styles.swatchFace} ${styles.swatchAuto}`}>
                                            <span className={styles.swatchDot} style={{ background: option.color }}>
                                                {checked && <Icon name="check" size={14} />}
                                            </span>
                                            자동
                                        </span>
                                    ) : (
                                        <span className={styles.swatchFace} style={{ background: option.color }}>
                                            {checked && <Icon name="check" size={18} />}
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>
                <p id={ids.colorHelp} className={`${ui.help} ${styles.message}`}>
                    ‘자동’을 고르면 아이디에 맞춰 색이 정해져요
                </p>
            </fieldset>

            <div className={styles.footer}>
                <div className={styles.status}>
                    <p className={styles.dirtyHint} role="status">
                        {dirty && (
                            <>
                                <span className={styles.dirtyDot} aria-hidden="true" />
                                저장되지 않은 변경사항이 있어요
                            </>
                        )}
                    </p>
                    {!dirty && profile.updatedAt !== null && (
                        <p className={`${ui.help} ${styles.message}`}>
                            {formatDateTime(profile.updatedAt)}에 저장했어요
                        </p>
                    )}
                </div>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={`${ui.btn} ${ui.btnGhost} ${styles.action}`}
                        onClick={handleRevert}
                        disabled={!dirty}
                    >
                        되돌리기
                    </button>
                    <button
                        type="submit"
                        className={`${ui.btn} ${ui.btnPrimary} ${styles.action}`}
                        disabled={!dirty || showEmailError}
                    >
                        저장
                    </button>
                </div>
            </div>

            <p className={styles.note}>프로필은 현재 이 브라우저에만 저장돼요.</p>
        </form>
    );
}

function Profile() {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const profile = useProfile(userId);

    // RequireAuth 안에서만 쓰이지만, 혹시 밖에서 렌더링돼도 깨지지 않게
    if (!userId) return <LoginRequired description="로그인하면 나의 프로필을 꾸밀 수 있어요." />;

    return (
        <div className={ui.page}>
            <header className={ui.pageHeader}>
                <div>
                    <p className={ui.eyebrow}>Profile</p>
                    <h1 className={ui.pageTitle}>프로필</h1>
                    <p className={ui.pageDesc}>나를 소개하고 하루 공부 목표를 정해보세요</p>
                </div>
            </header>

            <div className={styles.layout}>
                <ProfileCard userId={userId} profile={profile} />
                {/* 계정이 바뀌면 입력 중이던 폼을 새로 시작해요 */}
                <ProfileForm key={userId} userId={userId} profile={profile} />
            </div>
        </div>
    );
}

export default Profile;
