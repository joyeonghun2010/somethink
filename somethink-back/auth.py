from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

# 토큰 생성용 정보 정의
# =================================================================================
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY") # 토큰 생성용 키 .env 파일에서 가져오기
ALGORITHM = "HS256" # HS256 방식으로 토큰 생성
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # 토큰 만료시간 : 1분
# =================================================================================


# 토큰 생성용 키가 없을 경우
# =================================================================================
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY가 설정되지 않았습니다.") # 오류 발생
# =================================================================================


# 로그인 확인용 JWT 토큰 생성 함수
# =================================================================================
def create_access_token(data: dict): # 함수에서 파라미터를 딕셔너리로 받음
    payload = data.copy() # 원본 데이터를 변경하지 않고 수정하기 위해 값 복사

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) # 토큰 만료 시간 계산

    payload.update({
        "exp": expire
    }) # payload 에 만료시간 추가

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM) # payload, 토큰 생성용 키, 토큰 생성 방식을 종합해 토큰 생성
# =================================================================================