import os
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET", "orthopedic-opd-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ── Hardcoded users (in production, store in database) ────────────────────────
USERS = {
    "nurse.sara@ortho.com": {
        "name": "Nurse Sara",
        "role": "nurse",
        "hashed_password": pwd_context.hash("password"),
    },
    "physician.khalid@ortho.com": {
        "name": "Dr. Khalid Mansour",
        "role": "physician",
        "hashed_password": pwd_context.hash("password"),
    },
}


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def authenticate_user(email: str, password: str):
    user = USERS.get(email)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return {"email": email, "name": user["name"], "role": user["role"]}


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Accept tokens issued by the auth router (database-backed users)
        # Do not require the email to exist in the in-memory USERS map.
        return {"email": email, "name": payload.get("name"), "role": payload.get("role")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
