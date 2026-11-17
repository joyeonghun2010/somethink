import { hideToast, useToast } from "../lib/toast";
import Icon from "./Icon";
import styles from "./Toaster.module.css";

const TONE_ICONS = { success: "checkCircle", error: "alert", default: "info" };

/** showToast() 로 띄운 알림을 화면 하단에 보여줍니다. Layout 에 한 번만 둡니다. */
export default function Toaster() {
    const toast = useToast();
    return (
        <div className={styles.region} role="status" aria-live="polite">
            {toast && (
                <div key={toast.id} className={`${styles.toast} ${styles[toast.tone] ?? ""}`}>
                    <Icon
                        name={toast.icon ?? TONE_ICONS[toast.tone] ?? TONE_ICONS.default}
                        size={20}
                        className={styles.icon}
                    />
                    <span>{toast.message}</span>
                    <button type="button" className={styles.close} onClick={hideToast} aria-label="알림 닫기">
                        <Icon name="close" size={16} strokeWidth={2} />
                    </button>
                </div>
            )}
        </div>
    );
}
