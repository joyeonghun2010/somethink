from random import randint
from fastapi import FastAPI
from database import engine
from sqlalchemy import text
import bcrypt
from pydantic import BaseModel
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

class signup(BaseModel):
    id: str
    password: str
    email: str
    name: str
    phone: int

class login(BaseModel):
    id: str
    password: str

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

@app.post("/signup")
def signup(user: signup):

    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO member
                (id, password)
                VALUES
                (:id, :password)
            """),
            {
                "id": user.id,
                "password": hashed_password,
            }
        )

    return {"success": True}

@app.post("/login")
def login(user: login):

    with engine.connect() as conn:

        result = conn.execute(
            text("""
                SELECT id,password
                FROM member
                WHERE id = :id
            """),
            {
                "id": user.id
            }
        )

        db_user = result.fetchone()

    if db_user is None:
        return {
            "success": False,
            "message": "존재하지 않는 아이디입니다."
        }

    stored_password = db_user.password

    if bcrypt.checkpw(
        user.password.encode("utf-8"),
        stored_password.encode("utf-8")
    ):

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