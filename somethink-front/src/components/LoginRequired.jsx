import { openAuthModal } from "../lib/authModal";
import ui from "../styles/ui.module.css";
import Icon from "./Icon";
import styles from "./LoginRequired.module.css";

/** 로그인이 필요한 화면에서 대신 보여주는 안내 카드 */
export default function LoginRequired({
    title = "로그인이 필요해요",
    description = "로그인하면 나만의 공부 기록을 확인할 수 있어요.",
}) {
    return (
        <div className={ui.page}>
            <div className={`${ui.card} ${styles.box}`}>
                <span className={styles.icon} aria-hidden="true">
                    <Icon name="lock" size={30} strokeWidth={1.6} />
                </span>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.desc}>{description}</p>
                <div className={styles.actions}>
                    <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => openAuthModal("login")}>
                        로그인
                    </button>
                    <button type="button" className={ui.btn} onClick={() => openAuthModal("signup")}>
                        회원가입
                    </button>
                </div>
            </div>
        </div>
    );
}
