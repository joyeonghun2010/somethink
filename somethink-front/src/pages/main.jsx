import {useEffect, useState} from 'react'
import { useNavigate } from "react-router-dom";
import styles from "./main.module.css";

function Profile() {
    return (
        <div className={styles.profile}>
            <div className={styles.avatar}>J</div>

            <div className={styles.menu}>
                <button>마이페이지</button>
                <button>로그아웃</button>
            </div>
        </div>
    )
}

function Authbutton() {

    const navigate = useNavigate();

    const handleLogin = () => {
        navigate("/login");
    };

    const handleSignup = () => {
        navigate("/signup");
    };

    return (
        <div className={styles.authButtons}>
            <button onClick={handleLogin} className={styles.login}>로그인</button>
            <button onClick={handleSignup} className={styles.signup}>회원가입</button>
        </div>
    )
}

function Main() {

    const navigate = useNavigate();

    const token = localStorage.getItem("access_token");

    const starttime = 1800;
    const [timeleft, settimeleft] = useState(starttime);
    const [is_running, setis_running] = useState(false);

    const [isLogin, setIsLogin] = useState(
        !!localStorage.getItem("access_token")
    );

    useEffect(() => {
        if (!is_running) return;

        const timer = setInterval(() => {
            settimeleft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    setis_running(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    },[is_running]);

    const minutes = String(Math.floor(timeleft / 60)).padStart(2, "0");
    const seconds = String(timeleft % 60).padStart(2, "0");

    return (
        <div className={styles.main}>
            <div className={styles.profileShowed}>
                token ? <Profile /> : <Authbutton />
            </div>
            <div className={styles.head}>
                <h1 className={styles.title}>SOMETHINK</h1>
                <h1 className={styles.subtitle}>Think-Something</h1>
                <h1 className={`${styles.subtitle} ${styles.korea}`}>여러분이 원하는 모든 이론, 바로 이곳에</h1>
            </div>

            <div className={styles.randomStudy}>
                <h1 className={`${styles.korea} ${styles.dis}`}>지금 바로 버튼 하나로 시작하세요<br/>이곳에 이론이 표시됩니다</h1>
                <button className={styles.actionButton}>이론 뽑기</button>
            </div>

            <div className={styles.timer}>
                <p>공부 타이머</p>
                <h1>{minutes} : {seconds}</h1>
                <div className={styles.timeSet}>
                    <button
                        className={styles.timesetButton}
                        onClick={() => setis_running(true)}
                    >start</button>

                    <button
                        className={styles.timesetButton}
                        onClick={() => setis_running(false)}
                    >stop</button>
                </div>
                <button
                className={styles.timesetButton}
                onClick={() => {
                    settimeleft(1800);
                    setis_running(false);
                }}
                style={{marginTop: '20px'}}
                >
                    reset
                </button>
            </div>
        </div>
    )
}

export default Main;