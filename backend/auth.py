import os
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET", "orthopedic-opd-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
PATIENT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days — consumer app, no refresh-token flow yet
PATIENT_AUDIENCE = "patient"

security = HTTPBearer()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_patient_access_token(patient_id: str, phone: str) -> str:
    """Issues a patient-scoped token for the mobile app, tagged with a
    distinct "aud" claim so it can never be accepted by get_current_user
    (staff routes) — a leaked patient token must not reach clinical/staff
    endpoints, and vice versa."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=PATIENT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": patient_id, "phone": phone, "aud": PATIENT_AUDIENCE, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Staff tokens carry no "aud" claim. PyJWT rejects ANY token that has
        # an "aud" claim (InvalidAudienceError, a PyJWTError) when decode()
        # isn't told what audience to expect — so a patient token (aud=
        # PATIENT_AUDIENCE) is already refused here without any extra check.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"email": email, "name": payload.get("name"), "role": payload.get("role")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_patient(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # audience= is required here: PyJWT raises InvalidAudienceError for
        # ANY token carrying an "aud" claim unless decode() is told what to
        # expect — passing it also rejects a staff token outright, since
        # those have no "aud" claim to match.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=PATIENT_AUDIENCE)
        patient_id = payload.get("sub")
        if patient_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"patient_id": patient_id, "phone": payload.get("phone")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def forbid_roles(*roles):
    """Dependency factory — blocks the given roles from a router/route while
    leaving every other role unaffected (e.g. nurses are restricted to the
    dashboard + physician evaluation; every other role keeps full access)."""
    def checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") in roles:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
        return current_user
    return checker
