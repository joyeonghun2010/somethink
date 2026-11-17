import { useId, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BASE_URL from "../api/api";
import { saveToken } from "../lib/auth";
import { closeAuthModal, setAuthMode, useAuthModal } from "../lib/authModal";
import { showToast } from "../lib/toast";
import ui from "../styles/ui.module.css";
import Icon from "./Icon";
import Logo from "./Logo";
import styles from "./AuthModal.module.css";

// 백엔드(somethink-back/main.py)의 입력 제한과 맞춥니다.
const LIMITS = { id: 50, password: 128, passwordMin: 8 };

const COPY = {
    login: {
        icon: "key",
        title: "다시 만나 반가워요",
        sub: "오늘의 이론을 공부할 준비가 되었나요?",
        submit: "로그인",
        pending: "로그인 중…",
        switchText: "아직 계정이 없으신가요?",
        switchLabel: "회원가입",
    },
    signup: {
        icon: "sparkle",
        title: "생각을 시작해볼까요?",
        sub: "새로운 생각을 시작할 준비가 되었나요?",
        submit: "회원가입",
        pending: "가입하는 중…",
        switchText: "이미 계정이 있으신가요?",
        switchLabel: "로그인",
    },
};

/** FastAPI 응답에서 사용자에게 보여줄 오류 문장을 꺼냅니다. */
function readErrorMessage(result, fallback) {
    const detail = result?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
        // 입력 검증 오류(422)는 [{ msg: "Value error, 비밀번호가 일치하지 않습니다." }] 꼴입니다.
        const message = String(detail[0]?.msg ?? "").replace(/^Value error,\s*/, "");
        if (message) return message;
    }
    if (typeof result?.message === "string" && result.message) return result.message;
    return fallback;
}

async function postJSON(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const result = await res.json().catch(() => null);
    return { res, result };
}

function validate(mode, values) {
    const errors = {};
    if (!values.id.trim()) errors.id = "아이디를 입력해 주세요.";
    if (!values.password) errors.password = "비밀번호를 입력해 주세요.";
    else if (mode === "signup" && values.password.length < LIMITS.passwordMin) {
        errors.password = `비밀번호는 ${LIMITS.passwordMin}자 이상으로 정해 주세요.`;
    }
    if (mode === "signup") {
        if (!values.passwordCheck) errors.passwordCheck = "비밀번호를 한 번 더 입력해 주세요.";
        else if (values.password && values.password !== values.passwordCheck) {
            errors.passwordCheck = "비밀번호가 일치하지 않아요.";
        }
    }
    return errors;
}

function Field({ id, label, error, inputRef, ...inputProps }) {
    const errorId = `${id}-error`;
    return (
        <div className={ui.field}>
            <label htmlFor={id} className={ui.label}>
                {label}
            </label>
            <input
                ref={inputRef}
                id={id}
                className={`${ui.input} ${styles.input} ${error ? ui.inputInvalid : ""}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                {...inputProps}
            />
            {error && (
                <p id={errorId} className={`${ui.error} ${styles.fieldError}`}>
                    {error}
                </p>
            )}
        </div>
    );
}

function AuthForm({ mode, titleId }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const id = useId();
    const idRef = useRef(null);
    const passwordRef = useRef(null);
    const passwordCheckRef = useRef(null);
    const [values, setValues] = useState({ id: "", password: "", passwordCheck: "" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [notice, setNotice] = useState("");
    const [pending, setPending] = useState(false);
    const copy = COPY[mode];
    const isSignup = mode === "signup";

    const update = (field) => (event) => {
        const { value } = event.target;
        setValues((current) => ({ ...current, [field]: value }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
        setServerError("");
    };

    const switchMode = (nextMode, nextNotice = "") => {
        setAuthMode(nextMode);
        setValues((current) => ({ id: current.id, password: "", passwordCheck: "" }));
        setErrors({});
        setServerError("");
        setNotice(nextNotice);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (pending) return;
        const nextErrors = validate(mode, values);
        setErrors(nextErrors);
        setServerError("");
        if (Object.keys(nextErrors).length > 0) {
            const firstInvalid = { id: idRef, password: passwordRef, passwordCheck: passwordCheckRef }[
                Object.keys(nextErrors)[0]
            ];
            firstInvalid?.current?.focus();
            return;
        }

        const userId = values.id.trim();
        setPending(true);
        try {
            if (isSignup) {
                const { res, result } = await postJSON("/signup", {
                    id: userId,
                    password: values.password,
                    passwordCheck: values.passwordCheck,
                });
                if (res.ok && result?.success) {
                    switchMode("login", "회원가입이 완료됐어요. 방금 만든 비밀번호로 로그인해 주세요.");
                    passwordRef.current?.focus();
                } else {
                    setServerError(readErrorMessage(result, "회원가입에 실패했습니다."));
                }
            } else {
                const { res, result } = await postJSON("/login", { id: userId, password: values.password });
                if (res.ok && result?.success && result.access_token) {
                    saveToken(result.access_token);
                    closeAuthModal();
                    showToast(`${userId}님, 반가워요!`, { tone: "success" });
                    if (pathname === "/") navigate("/main");
                } else {
                    setServerError(readErrorMessage(result, "로그인에 실패했습니다."));
                }
            }
        } catch {
            setServerError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setPending(false);
        }
    };

    const handleBrowse = () => {
        closeAuthModal();
        if (pathname === "/") navigate("/main");
    };

    return (
        <>
            <span className={styles.badge} aria-hidden="true">
                <Icon name={copy.icon} size={26} strokeWidth={1.7} />
            </span>
            <h2 id={titleId} className={styles.title}>
                {copy.title}
            </h2>
            <p className={styles.sub}>{copy.sub}</p>

            <p className={styles.notice} role="status">
                {notice && (
                    <>
                        <Icon name="checkCircle" size={18} />
                        {notice}
                    </>
                )}
            </p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <Field
                    id={`${id}-id`}
                    label="아이디"
                    inputRef={idRef}
                    type="text"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={LIMITS.id}
                    placeholder="아이디를 입력하세요"
                    value={values.id}
                    onChange={update("id")}
                    error={errors.id}
                />
                <Field
                    id={`${id}-password`}
                    label="비밀번호"
                    inputRef={passwordRef}
                    type="password"
                    name="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    maxLength={LIMITS.password}
                    placeholder={isSignup ? `${LIMITS.passwordMin}자 이상 입력하세요` : "비밀번호를 입력하세요"}
                    value={values.password}
                    onChange={update("password")}
                    error={errors.password}
                />
                {isSignup && (
                    <Field
                        id={`${id}-password-check`}
                        label="비밀번호 확인"
                        inputRef={passwordCheckRef}
                        type="password"
                        name="password-check"
                        autoComplete="new-password"
                        maxLength={LIMITS.password}
                        placeholder="비밀번호를 다시 입력하세요"
                        value={values.passwordCheck}
                        onChange={update("passwordCheck")}
                        error={errors.passwordCheck}
                    />
                )}

                {serverError && (
                    <p className={styles.serverError} role="alert">
                        <Icon name="alert" size={18} />
                        {serverError}
                    </p>
                )}

                <button
                    type="submit"
                    className={`${ui.btn} ${ui.btnPrimary} ${ui.btnLg} ${ui.btnBlock} ${styles.submit}`}
                    aria-disabled={pending || undefined}
                >
                    {pending ? copy.pending : copy.submit}
                </button>
            </form>

            <p className={styles.switch}>
                <span>{copy.switchText}</span>
                <button
                    type="button"
                    className={styles.switchButton}
                    onClick={() => switchMode(isSignup ? "login" : "signup")}
                >
                    {copy.switchLabel}
                </button>
            </p>

            <div className={styles.divider}>
                <span>또는</span>
            </div>

            <button type="button" className={`${ui.btn} ${ui.btnBlock} ${styles.browse}`} onClick={handleBrowse}>
                로그인 없이 둘러보기
                <Icon name="arrowRight" size={18} />
            </button>

            <p className={styles.foot}>계정은 SOMETHINK 서버에, 공부 기록과 프로필은 이 브라우저에 저장돼요.</p>
        </>
    );
}

/** 로그인 · 회원가입 팝업. Layout 에 한 번만 둡니다. */
export default function AuthModal() {
    const { open, mode, session } = useAuthModal();
    const dialogRef = useRef(null);
    const pointerDownOnBackdrop = useRef(false);
    const titleId = useId();

    // 화면에 그려지기 전에 열고 닫아서, 빈 팝업이 한 번 보였다 사라지는 일이 없게 합니다.
    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
            dialog.querySelector("input")?.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    // 바깥(어두운 배경)을 눌렀다 뗐을 때만 닫습니다. 입력창에서 드래그하다 바깥에서 놓은 경우는 제외.
    const handlePointerDown = (event) => {
        pointerDownOnBackdrop.current = event.target === event.currentTarget;
    };
    const handleClick = (event) => {
        if (pointerDownOnBackdrop.current && event.target === event.currentTarget) closeAuthModal();
        pointerDownOnBackdrop.current = false;
    };

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby={titleId}
            onClose={closeAuthModal}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
        >
            <div className={styles.panel}>
                <button type="button" className={styles.close} onClick={closeAuthModal} aria-label="닫기">
                    <Icon name="close" size={22} />
                </button>
                <div className={styles.brand}>
                    <Logo size={34} />
                </div>
                {open && <AuthForm key={session} mode={mode} titleId={titleId} />}
            </div>
        </dialog>
    );
}
