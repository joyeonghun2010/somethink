import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import AuthModal from "./AuthModal";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Logo from "./Logo";
import Toaster from "./Toaster";
import { useAuth } from "../lib/auth";
import { openAuthModal } from "../lib/authModal";
import { formatClock, useTodayKey } from "../lib/date";
import { ATTRIBUTED_PORTRAITS, portraitPageUrl } from "../lib/portrait";
import { signOut } from "../lib/session";
import { ensureUserRecord, getAvatarColor, getDisplayName, useProfile } from "../lib/store";
import { claimTimer, getRemainingSeconds, onTimerFinish, resetTimer, useTimer } from "../lib/timer";
import { showToast } from "../lib/toast";
import ui from "../styles/ui.module.css";
import styles from "./Layout.module.css";

const NAV_ITEMS = [
    { to: "/main", label: "대시보드" },
    { to: "/stats", label: "통계" },
    { to: "/leaderboard", label: "리더보드" },
    { to: "/profile", label: "프로필" },
];
const DEFAULT_TITLE = "SOMETHINK";

function cx(...classNames) {
    return classNames.filter(Boolean).join(" ");
}

// 홈 화면에서는 맨 위에 있을 때만 헤더를 투명하게(사진 위에 겹쳐) 보여줍니다.
function subscribeScroll(callback) {
    window.addEventListener("scroll", callback, { passive: true });
    return () => window.removeEventListener("scroll", callback);
}
const getAtTop = () => window.scrollY < 24;
const getAtTopOnServer = () => true;

/** 타이머가 돌고 있으면 어느 화면에서든 헤더에 남은 시간을 보여줍니다. */
function TimerPill({ timer }) {
    if (timer.status !== "running" && timer.status !== "paused") return null;
    const running = timer.status === "running";
    return (
        <Link
            to="/main"
            className={cx(styles.timerPill, running && styles.timerRunning)}
            title="공부 타이머로 이동"
        >
            <span className={styles.timerDot} aria-hidden="true" />
            <span className={styles.timerText}>{formatClock(getRemainingSeconds(timer))}</span>
            <span className={ui.srOnly}>{running ? "타이머 진행 중" : "타이머 일시정지됨"}</span>
        </Link>
    );
}

function UserMenu({ userId, onLogout }) {
    const profile = useProfile(userId);
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const name = getDisplayName(profile, userId);

    useEffect(() => {
        if (!open) return undefined;
        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) setOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div className={styles.userMenu} ref={menuRef}>
            <button
                type="button"
                className={styles.avatarButton}
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${name} 계정 메뉴`}
            >
                <Avatar name={name} color={getAvatarColor(profile, userId)} size={38} />
                <Icon name="chevronDown" size={16} className={styles.avatarChevron} />
            </button>

            {open && (
                <div className={styles.dropdown} role="menu">
                    <div className={styles.dropdownHeader}>
                        <strong>{name}</strong>
                        <span>@{userId}</span>
                    </div>
                    <Link
                        to="/profile"
                        role="menuitem"
                        className={styles.dropdownItem}
                        onClick={() => setOpen(false)}
                    >
                        <Icon name="user" size={18} />
                        마이페이지
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        className={styles.dropdownItem}
                        onClick={() => {
                            setOpen(false);
                            onLogout();
                        }}
                    >
                        <Icon name="logout" size={18} />
                        로그아웃
                    </button>
                </div>
            )}
        </div>
    );
}

function Footer() {
    const year = useTodayKey().slice(0, 4);
    return (
        <footer className={styles.footer}>
            <div className={styles.footerInner}>
                <div className={styles.footerBrand}>
                    <Logo size={32} showTagline />
                    <p className={styles.footerTagline}>여러분이 원하는 모든 이론, 바로 이곳에.</p>
                </div>
                <nav className={styles.footerNav} aria-label="바닥글 메뉴">
                    <Link to="/" className={styles.footerLink}>
                        홈
                    </Link>
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.to} to={item.to} className={styles.footerLink}>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className={styles.footerBottom}>
                <p className={styles.copyright}>© {year} SOMETHINK · Think-Something</p>
                <details className={styles.credits}>
                    <summary className={styles.creditsSummary}>
                        이미지 출처
                        <Icon name="chevronDown" size={16} className={styles.creditsChevron} />
                    </summary>
                    <div className={styles.creditsBody}>
                        <p>
                            이론가들의 초상은 위키미디어 공용(Wikimedia Commons)에서 불러옵니다. 아래에 적은 이미지 말고는
                            모두 퍼블릭 도메인 또는 CC0 이미지입니다.
                        </p>
                        <ul className={styles.creditsList}>
                            {ATTRIBUTED_PORTRAITS.map((portrait) => (
                                <li key={portrait.file}>
                                    <a href={portraitPageUrl(portrait)} target="_blank" rel="noreferrer">
                                        {portrait.name}
                                    </a>{" "}
                                    — {portrait.author}, {portrait.license}
                                </li>
                            ))}
                        </ul>
                    </div>
                </details>
            </div>
        </footer>
    );
}

/** 모든 화면의 공통 틀 (상단 메뉴 + 본문 + 바닥글 + 알림 + 로그인 팝업) */
export default function Layout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const timer = useTimer();
    const atTop = useSyncExternalStore(subscribeScroll, getAtTop, getAtTopOnServer);
    const userId = user?.id ?? null;
    const remainingSeconds = getRemainingSeconds(timer);
    const isHome = pathname === "/";
    const overlay = isHome && atTop;

    // 다른 화면으로 이동하면 맨 위부터 보여줍니다.
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // 이 기기에서 처음 로그인한 사용자라면 기본 프로필을 만들어 둡니다 (리더보드 등에 표시).
    useEffect(() => {
        if (userId) ensureUserRecord(userId);
    }, [userId]);

    // 게스트로 켠 타이머는 로그인한 사용자에게 넘기고,
    // 다른 사용자의 타이머가 남아 있으면 그 사람의 기록을 마무리한 뒤 초기화합니다.
    useEffect(() => {
        if (!userId || timer.status === "idle" || timer.status === "finished") return;
        if (timer.ownerId && timer.ownerId !== userId) resetTimer();
        else if (!timer.ownerId) claimTimer(userId);
    }, [userId, timer.ownerId, timer.status]);

    useEffect(
        () =>
            onTimerFinish(({ ownerId }) => {
                showToast(
                    ownerId
                        ? "타이머 종료! 수고했어요. 공부 시간이 기록됐어요."
                        : "타이머 종료! 로그인하면 공부 시간이 기록돼요.",
                    { tone: "success", icon: "alarm", duration: 6000 },
                );
            }),
        [],
    );

    // 탭 제목에 남은 시간 표시
    useEffect(() => {
        if (timer.status === "running") document.title = `${formatClock(remainingSeconds)} 남음 · ${DEFAULT_TITLE}`;
        else if (timer.status === "paused") document.title = `일시정지 ${formatClock(remainingSeconds)} · ${DEFAULT_TITLE}`;
        else document.title = DEFAULT_TITLE;
    }, [timer.status, remainingSeconds]);

    useEffect(() => () => {
        document.title = DEFAULT_TITLE;
    }, []);

    const handleLogout = () => {
        signOut();
        showToast("로그아웃했어요.");
        navigate("/main");
    };

    return (
        <div className={styles.shell}>
            <header className={cx(styles.header, isHome && styles.headerFixed, overlay && styles.headerOverlay)}>
                <div className={styles.headerInner}>
                    <Link to="/" className={styles.logo} aria-label="SOMETHINK 홈">
                        <Logo size={34} tone={overlay ? "light" : "dark"} />
                    </Link>

                    <nav className={styles.nav} aria-label="주요 메뉴">
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => cx(styles.navLink, isActive && styles.navLinkActive)}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className={styles.actions}>
                        <TimerPill timer={timer} />
                        {userId ? (
                            <UserMenu userId={userId} onLogout={handleLogout} />
                        ) : (
                            <div className={styles.authButtons}>
                                <button
                                    type="button"
                                    className={styles.loginButton}
                                    onClick={() => openAuthModal("login")}
                                >
                                    로그인
                                </button>
                                <button
                                    type="button"
                                    className={cx(ui.btn, ui.btnSm, styles.signupButton)}
                                    onClick={() => openAuthModal("signup")}
                                >
                                    회원가입
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <Outlet />
            </main>

            <Footer />
            <Toaster />
            <AuthModal />
        </div>
    );
}
