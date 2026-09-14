import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../api/api";
import styles from "./signup.module.css";

function Signup() {

    const navigate = useNavigate();

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [passwordCheck, setPasswordCheck] = useState("");

    const signup = async()=>{

        const res = await fetch(`${BASE_URL}/signup`,{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({
                id,
                password,
                passwordCheck,
            })

        });

        const result = await res.json();

        if(result.success){

            alert("회원가입 성공");

            navigate("/login");
        }else {
            alert(result.message);
        }
    }

    return (
        <div className={styles.root}>
            <div className={styles.image}>
                <img src="/somethink-main.png" alt="Somethink" />
            </div>
            <div className={styles.signup}>
                <div className={styles.title}>
                    <h1>SomeThink</h1>
                    <p className={styles.disc}>새로운 생각을 시작할 준비가 되었나요?</p>
                </div>
                <div>
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
                <div>
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
                <div>
                    <h3>비밀번호 확인</h3>
                    <label>
                        <input
                            type="password"
                            value={passwordCheck}
                            onChange={(e) => setPasswordCheck(e.target.value)}
                            placeholder="비밀번호를 다시 입력하세요."
                        />
                    </label>
                </div>
                <button className={styles.register_btn} onClick={signup}>회원가입</button>
                <div className={styles.log}>
                    <p className={styles.yes_account}>이미 계정이 있으신가요?</p>
                    <p className={styles.log_btn}
                       onClick={() => navigate("/login")}>
                        로그인</p>
                </div>
            </div>
        </div>
    )

}

export default Signup;