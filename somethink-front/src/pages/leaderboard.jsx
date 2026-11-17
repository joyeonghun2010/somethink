import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { useAuth } from "../lib/auth";
import { openAuthModal } from "../lib/authModal";
import { formatDuration, useTodayKey } from "../lib/date";
import { PERIODS, periodTotals } from "../lib/stats";
import { getAvatarColor, getDisplayName, useAllUsers } from "../lib/store";
import ui from "../styles/ui.module.css";
import styles from "./leaderboard.module.css";

const METRICS = [
    { value: "theories", label: "이론 수" },
    { value: "seconds", label: "공부 시간" },
];

// 제목에서는 "전체" 만으로 뜻이 모호해서 "전체 기간" 으로 풀어 씁니다.
const PERIOD_PHRASES = { today: "오늘", week: "이번 주", all: "전체 기간" };

const DEFAULT_FILTER = { period: "week", metric: "theories" };
const FILTER_STORAGE_KEY = "somethink:leaderboard-filter";
const EMPTY_TOTALS = { seconds: 0, theories: 0 };

// 시상대는 화면에 2위·1위·3위 순으로 놓지만 DOM 은 1·2·3위 순서라 스크린 리더는 순위대로 읽습니다.
// 자리(slot)는 목록 순서로, 높이·메달 색(place)은 실제 순위로 정해서 공동 순위면 높이도 같아집니다.
const SLOT_CLASSES = [styles.slotFirst, styles.slotSecond, styles.slotThird];
const PLACE_CLASSES = { 1: styles.place1, 2: styles.place2, 3: styles.place3 };
const MEDAL_CLASSES = { 1: styles.medalGold, 2: styles.medalSilver, 3: styles.medalBronze };

function cx(...classNames) {
    return classNames.filter(Boolean).join(" ");
}

/** 같은 탭에서 다시 들어오면 보던 기간·기준을 이어서 보여줍니다. */
function readSavedFilter() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(FILTER_STORAGE_KEY));
        return {
            period: PERIODS.some((item) => item.value === saved?.period) ? saved.period : DEFAULT_FILTER.period,
            metric: METRICS.some((item) => item.value === saved?.metric) ? saved.metric : DEFAULT_FILTER.metric,
        };
    } catch {
        return DEFAULT_FILTER;
    }
}

function saveFilter(filter) {
    try {
        sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
    } catch {
        // 저장하지 못해도 지금 화면은 그대로 동작합니다.
    }
}

function otherMetricOf(metric) {
    return metric === "theories" ? "seconds" : "theories";
}

function formatMetric(metric, value) {
    return metric === "theories" ? `${value}개` : formatDuration(value);
}

// 따라잡는 데 필요한 시간이라 1분이 넘으면 분 단위로 올림합니다 (12분 10초 → 13분).
function formatSecondsGap(seconds) {
    return formatDuration(seconds < 60 ? seconds : Math.ceil(seconds / 60) * 60);
}

/**
 * 기간·기준별 순위. 기준 값이 0 인 사용자는 빠지고, 기준 → 다른 기준 → 이름 순으로 정렬합니다.
 * 두 기준이 모두 같은 사용자끼리는 같은 순위를 받습니다 (1, 2, 2, 4).
 */
function buildRanking(users, period, metric, todayKey) {
    const other = otherMetricOf(metric);
    const rows = users
        .map(({ id, study, profile }) => ({
            id,
            name: getDisplayName(profile, id),
            color: getAvatarColor(profile, id),
            bio: (profile?.bio ?? "").trim(),
            ...periodTotals(study, period, todayKey),
        }))
        .filter((row) => row[metric] > 0)
        .sort(
            (a, b) =>
                b[metric] - a[metric] ||
                b[other] - a[other] ||
                a.name.localeCompare(b.name, "ko") ||
                a.id.localeCompare(b.id),
        );

    const ranking = [];
    rows.forEach((row, index) => {
        const previous = ranking[index - 1];
        const tied = previous && previous.theories === row.theories && previous.seconds === row.seconds;
        ranking.push({ ...row, rank: tied ? previous.rank : index + 1 });
    });
    return ranking;
}

/** 바로 위 순위와의 차이를 응원 문구로 */
function describeGap(me, above, metric) {
    const gap = above[metric] - me[metric];
    if (gap > 0) {
        return metric === "theories"
            ? `한 계단 위까지 이론 ${gap}개 남았어요`
            : `한 계단 위까지 공부 시간 ${formatSecondsGap(gap)} 남았어요`;
    }
    // 기준 값은 같은데 다른 기준에서 밀려 한 계단 아래인 경우
    const other = otherMetricOf(metric);
    const otherGap = above[other] - me[other];
    return metric === "theories"
        ? `이론 수는 바로 위와 같아요. 공부 시간 ${formatSecondsGap(otherGap)}만 더 채워봐요`
        : `공부 시간은 바로 위와 같아요. 이론 ${otherGap}개만 더 공부해봐요`;
}

function SegmentGroup({ label, options, value, onChange }) {
    return (
        <div className={ui.segmented} role="group" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={cx(ui.segment, option.value === value && ui.segmentActive)}
                    aria-pressed={option.value === value}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function MyRankCard({ userId, me, myTotals, ranking, metric, metricLabel, periodPhrase }) {
    const titleId = useId();
    let content;

    if (!userId) {
        content = (
            <>
                <p className={styles.myHeadline}>로그인하고 랭킹에 참여해보세요</p>
                <p className={styles.myDesc}>공부한 이론과 시간이 쌓이면 순위에 이름이 올라가요.</p>
                <button
                    type="button"
                    className={cx(ui.btn, ui.btnPrimary, styles.myAction)}
                    onClick={() => openAuthModal("login")}
                >
                    로그인하기
                </button>
            </>
        );
    } else if (!me) {
        const isTheories = metric === "theories";
        // 다른 기준의 기록은 있으면 "기록이 없다" 대신 무엇이 없는지 짚어 줍니다.
        const hasOtherRecord = myTotals[otherMetricOf(metric)] > 0;
        let headline = "이 기간에는 아직 기록이 없어요";
        if (hasOtherRecord) {
            headline = isTheories
                ? "이 기간에는 아직 공부한 이론이 없어요"
                : "이 기간에는 아직 공부 시간 기록이 없어요";
        }
        content = (
            <>
                <p className={styles.myHeadline}>{headline}</p>
                <p className={styles.myDesc}>
                    {isTheories
                        ? "이론을 하나 공부하면 바로 순위에 올라요."
                        : "타이머를 켜고 공부하면 시간이 자동으로 기록돼요."}
                </p>
                <Link to="/main" className={cx(ui.btn, ui.btnPrimary, styles.myAction)}>
                    {isTheories ? "이론 하나 공부하러 가기" : "타이머로 공부하러 가기"}
                </Link>
            </>
        );
    } else {
        const tied = ranking.filter((row) => row.rank === me.rank).length > 1;
        const above = me.rank > 1 ? ranking[me.rank - 2] : null;
        let note = tied ? "공동 1위예요! 조금만 더 하면 단독 1위가 돼요" : "지금 1위예요! 이 기세로 쭉 가봐요";
        if (above) note = describeGap(me, above, metric);
        content = (
            <>
                <p className={styles.rankLine}>
                    <span className={ui.srOnly}>
                        {`${ranking.length}명 중 ${tied ? "공동 " : ""}${me.rank}위`}
                    </span>
                    <span className={styles.rankNumber} aria-hidden="true">
                        #{me.rank}
                    </span>
                    <span className={styles.rankOf} aria-hidden="true">
                        {ranking.length}명 중
                    </span>
                    {tied && (
                        <span className={ui.tag} aria-hidden="true">
                            공동
                        </span>
                    )}
                </p>
                <div className={styles.myStat}>
                    <span className={ui.statLabel}>
                        {periodPhrase} {metricLabel}
                    </span>
                    <strong className={cx(ui.statValue, styles.myValue)}>{formatMetric(metric, me[metric])}</strong>
                </div>
                <p className={styles.note}>
                    <span className={cx(styles.noteIcon, !above && styles.noteIconTop)} aria-hidden="true">
                        <Icon name={above ? "arrowUp" : "trophy"} size={16} strokeWidth={2} />
                    </span>
                    <span>{note}</span>
                </p>
            </>
        );
    }

    return (
        <section className={cx(ui.card, styles.myCard)} aria-labelledby={titleId}>
            <h2 id={titleId} className={ui.cardTitle}>
                나의 순위
            </h2>
            {content}
        </section>
    );
}

function Podium({ rows, userId, metric, metricLabel, periodPhrase }) {
    const titleId = useId();
    return (
        <section className={cx(ui.card, styles.podiumCard)} aria-labelledby={titleId}>
            <div>
                <h2 id={titleId} className={ui.cardTitle}>
                    {periodPhrase} TOP 3
                </h2>
                <p className={ui.cardDesc}>{metricLabel} 기준</p>
            </div>
            {/* list-style 을 없앤 목록도 Safari 스크린 리더가 목록으로 읽도록 role 을 명시합니다. */}
            <ol className={styles.podium} role="list">
                {rows.map((row, index) => {
                    const isMe = row.id === userId;
                    return (
                        <li
                            key={row.id}
                            className={cx(
                                styles.podiumItem,
                                SLOT_CLASSES[index],
                                PLACE_CLASSES[row.rank],
                                isMe && styles.podiumMe,
                            )}
                        >
                            <div className={styles.podiumAvatar}>
                                <Avatar name={row.name} color={row.color} size={row.rank === 1 ? 72 : 56} />
                                <span className={cx(styles.medal, MEDAL_CLASSES[row.rank])}>
                                    {row.rank}
                                    <span className={ui.srOnly}>위</span>
                                </span>
                            </div>
                            <p className={styles.podiumName}>
                                <span className={styles.ellipsis}>{row.name}</span>
                                {isMe && <span className={styles.meBadge}>나</span>}
                            </p>
                            <p className={styles.podiumHandle}>@{row.id}</p>
                            <p className={styles.pedestal}>
                                <span className={styles.pedestalLabel}>{metricLabel}</span>
                                <strong className={styles.pedestalValue}>{formatMetric(metric, row[metric])}</strong>
                            </p>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function RankTable({ rows, userId, metric, metricLabel, periodPhrase }) {
    const titleId = useId();
    return (
        <section className={cx(ui.card, styles.tableCard)} aria-labelledby={titleId}>
            <h2 id={titleId} className={ui.cardTitle}>
                순위표
            </h2>
            <p className={ui.cardDesc}>
                {periodPhrase} · {metricLabel} 기준 · {rows[0].rank}위부터
            </p>
            <table className={styles.table} aria-labelledby={titleId}>
                <thead>
                    <tr>
                        <th scope="col" className={styles.colRank}>
                            순위
                        </th>
                        <th scope="col">이름</th>
                        {METRICS.map((item) => {
                            const active = item.value === metric;
                            return (
                                <th
                                    key={item.value}
                                    scope="col"
                                    className={cx(styles.colMetric, active ? styles.colActive : styles.hideOnSmall)}
                                    aria-sort={active ? "descending" : undefined}
                                >
                                    {item.label}
                                    {active && <Icon name="arrowDown" size={14} strokeWidth={2.2} className={styles.sortIcon} />}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const isMe = row.id === userId;
                        return (
                            <tr key={row.id} className={isMe ? styles.rowMe : undefined}>
                                <td className={styles.rankCell}>{row.rank}</td>
                                <td>
                                    <div className={styles.user}>
                                        <Avatar name={row.name} color={row.color} size={36} />
                                        <div className={styles.userText}>
                                            <span className={styles.nameLine}>
                                                <span className={styles.ellipsis}>{row.name}</span>
                                                {isMe && <span className={styles.meBadge}>나</span>}
                                            </span>
                                            <span className={styles.subLine}>
                                                <span className={styles.handle}>@{row.id}</span>
                                                {row.bio && <span className={styles.bio}>{row.bio}</span>}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                {METRICS.map((item) => (
                                    <td
                                        key={item.value}
                                        className={cx(
                                            styles.metricCell,
                                            item.value === metric ? styles.metricActive : styles.hideOnSmall,
                                        )}
                                    >
                                        {formatMetric(item.value, row[item.value])}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}

function EmptyRanking() {
    const titleId = useId();
    return (
        <section className={cx(ui.card, styles.emptyCard)} aria-labelledby={titleId}>
            <div className={cx(ui.empty, styles.emptyBox)}>
                <span className={styles.emptyIcon} aria-hidden="true">
                    <Icon name="flag" size={30} strokeWidth={1.6} />
                </span>
                <h2 id={titleId} className={styles.emptyTitle}>
                    아직 이 기간에 기록이 없어요
                </h2>
                <p className={styles.emptyDesc}>첫 번째 주인공이 되어보세요!</p>
                <Link to="/main" className={cx(ui.btn, ui.btnPrimary)}>
                    첫 기록 남기러 가기
                </Link>
            </div>
        </section>
    );
}

function Leaderboard() {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const todayKey = useTodayKey();
    const users = useAllUsers();
    const [filter, setFilter] = useState(readSavedFilter);
    const { period, metric } = filter;

    const ranking = useMemo(
        () => buildRanking(users, period, metric, todayKey),
        [users, period, metric, todayKey],
    );

    const periodPhrase = PERIOD_PHRASES[period] ?? "";
    const metricLabel = METRICS.find((item) => item.value === metric)?.label ?? "";
    const me = userId ? (ranking.find((row) => row.id === userId) ?? null) : null;
    const myRecord = userId ? users.find((item) => item.id === userId) : null;
    const myTotals = myRecord ? periodTotals(myRecord.study, period, todayKey) : EMPTY_TOTALS;

    // 필터를 바꾸면 아래 내용이 통째로 바뀌므로, 스크린 리더에는 요약 한 줄만 알려 줍니다.
    const scope = `${periodPhrase} ${metricLabel} 순위`;
    let announcement = `${scope}: ${ranking.length}명이 순위에 올라 있어요.`;
    if (ranking.length === 0) announcement = `${scope}: 아직 기록이 없어요.`;
    else if (me) announcement = `${scope}: ${ranking.length}명 중 ${me.rank}위예요.`;

    const changeFilter = (patch) => {
        const next = { ...filter, ...patch };
        setFilter(next);
        saveFilter(next);
    };

    return (
        <div className={ui.page}>
            <div className={ui.pageHeader}>
                <div>
                    <p className={ui.eyebrow}>Leaderboard</p>
                    <h1 className={ui.pageTitle}>리더보드</h1>
                    <p className={ui.pageDesc}>함께 공부하는 사람들과 순위를 겨뤄보세요</p>
                </div>
                <div className={styles.filters}>
                    <SegmentGroup
                        label="기간"
                        options={PERIODS}
                        value={period}
                        onChange={(value) => changeFilter({ period: value })}
                    />
                    <SegmentGroup
                        label="순위 기준"
                        options={METRICS}
                        value={metric}
                        onChange={(value) => changeFilter({ metric: value })}
                    />
                </div>
            </div>

            <p className={ui.srOnly} role="status" aria-live="polite">
                {announcement}
            </p>

            <div className={styles.board}>
                <MyRankCard
                    userId={userId}
                    me={me}
                    myTotals={myTotals}
                    ranking={ranking}
                    metric={metric}
                    metricLabel={metricLabel}
                    periodPhrase={periodPhrase}
                />
                {ranking.length === 0 ? (
                    <EmptyRanking />
                ) : (
                    <>
                        <Podium
                            rows={ranking.slice(0, 3)}
                            userId={userId}
                            metric={metric}
                            metricLabel={metricLabel}
                            periodPhrase={periodPhrase}
                        />
                        {ranking.length > 3 && (
                            <RankTable
                                rows={ranking.slice(3)}
                                userId={userId}
                                metric={metric}
                                metricLabel={metricLabel}
                                periodPhrase={periodPhrase}
                            />
                        )}
                    </>
                )}
            </div>

            <p className={styles.footnote}>
                <Icon name="info" size={16} />
                지금은 이 브라우저에 저장된 기록으로 순위를 매겨요. 서버에 기록 API가 연결되면 전체 사용자 순위로
                바뀌어요.
            </p>
        </div>
    );
}

export default Leaderboard;
