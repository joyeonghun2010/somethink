from random import randint
from fastapi import FastAPI, HTTPException, status
from database import engine
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import bcrypt
from pydantic import BaseModel, ConfigDict, Field, model_validator
from auth import create_access_token
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SignupRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    passwordCheck: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.passwordCheck:
            raise ValueError("비밀번호가 일치하지 않습니다.")
        return self

class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


@app.on_event("startup")
def ensure_auth_schema():
    """Keep the existing local SomeThink schema compatible with bcrypt."""
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS `Members` (
                `id` VARCHAR(50) NOT NULL,
                `password` VARCHAR(100) NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `id_UNIQUE` (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        conn.execute(text("""
            ALTER TABLE `Members`
            MODIFY COLUMN `password` VARCHAR(100) NOT NULL
        """))

@app.get("/")
def home():
    return {
        "message": "Somethink API"
    }


@app.get("/test")
def get_test():

    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT test_column FROM test")
        )

        data = result.fetchone()

        random_index = randint(0, len(data) - 1)

        return {
            "랜덤 이론" : f"{data[random_index]}번 이론"
        }

@app.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user: SignupRequest):

    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    try:
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO `Members`
                    (id, password)
                    VALUES
                    (:id, :password)
                """),
                {
                    "id": user.id,
                    "password": hashed_password,
                }
            )
    except IntegrityError as exc:
        if "Duplicate entry" in str(exc.orig):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 사용 중인 아이디입니다."
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="회원가입 처리 중 데이터베이스 오류가 발생했습니다."
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="회원가입 처리 중 데이터베이스 오류가 발생했습니다."
        ) from exc

    return {"success": True}

@app.post("/login")
def login(user: LoginRequest):

    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT id, password
                    FROM `Members`
                    WHERE id = :id
                """),
                {"id": user.id}
            )
            db_user = result.fetchone()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그인 처리 중 데이터베이스 오류가 발생했습니다."
        ) from exc

    if db_user is None:
        return {
            "success": False,
            "message": "존재하지 않는 아이디입니다."
        }

    stored_password = db_user.password

    try:
        password_matches = bcrypt.checkpw(
            user.password.encode("utf-8"),
            stored_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        password_matches = False

    if password_matches:

        token = create_access_token(
            {
                "sub": db_user.id
            }
        )

        return {
            "success": True,
            "access_token": token
        }

    return {
        "success": False,
        "message": "비밀번호가 틀렸습니다."
    }
