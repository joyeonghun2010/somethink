import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../api/api";
import styles from "./login.module.css";

function Login() {

    const navigate = useNavigate();

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    const login = async () => {

        const res = await fetch(`${BASE_URL}/login`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                id,
                password
            })
        });

        const result = await res.json();

        if(result.success){

            localStorage.setItem(
                "access_token",
                result.access_token
            );

            navigate("/main");

        }else{
            alert(result.message);
        }

    }

    return (
        <div className={styles.root}>
            <div className={styles.image}>
                <img src="/somethink-main.png" alt="Somethink" />
            </div>

            <div  className={styles.login}>
                <div className={styles.title}>
                    <h1>SomeThink</h1>
                    <p className={styles.disc}>오늘의 이론을 공부할 준비가 되었나요?</p>
                </div>
                <div className={styles.id}>
                    <h3>아이디</h3>
                    <label>
                        <input
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            placeholder="아이디를 입력하세요."
                        />
                    </label>
                </div>
                <div className={styles.password}>
                    <h3>비밀번호</h3>
                    <label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호를 입력하세요."
                        />
                    </label>
                </div>
                <button className={styles.log_btn} onClick={login}>로그인
                </button>
                <div className={styles.register}>
                    <p className={styles.no_account}>아직 계정이 없으신가요?</p>
                    <p className={styles.register_btn}
                       onClick={() => navigate("/signup")}>
                        회원가입</p>
                </div>
            </div>
        </div>
    )
}

export default Login;