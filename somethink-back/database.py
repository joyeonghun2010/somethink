from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os


load_dotenv()


required_settings = (
    "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME", "SECRET_KEY"
)

missing_settings = [key for key in required_settings if not os.getenv(key)]
if missing_settings:
    raise RuntimeError(f"필수 환경변수가 없습니다: {', '.join(missing_settings)}")

DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT")),
    database=os.getenv("DB_NAME"),
)



engine = create_engine(
    DATABASE_URL,
    echo=True
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()
