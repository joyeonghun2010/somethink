import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import ui from "../styles/ui.module.css";
import styles from "./stats.module.css";

// TODO: 구현 예정 (임시 화면)
function Stats() {
    return (
        <div className={ui.page}>
            <header className={ui.pageHeader}>
                <div>
                    <p className={ui.eyebrow}>Statistics</p>
                    <h1 className={ui.pageTitle}>통계</h1>
                    <p className={ui.pageDesc}>지금까지 쌓은 공부 기록을 한눈에 볼 수 있도록 준비하고 있어요.</p>
                </div>
            </header>
            <div className={`${ui.card} ${ui.empty} ${styles.soon}`}>
                <span className={styles.soonIcon} aria-hidden="true">
                    <Icon name="chart" size={32} strokeWidth={1.7} />
                </span>
                <p className={styles.soonText}>통계 화면은 곧 열려요. 그동안 대시보드에서 오늘의 공부를 확인해 보세요.</p>
                <Link to="/main" className={`${ui.btn} ${ui.btnSm}`}>
                    대시보드로 가기
                    <Icon name="arrowRight" size={16} />
                </Link>
            </div>
        </div>
    );
}

export default Stats;
