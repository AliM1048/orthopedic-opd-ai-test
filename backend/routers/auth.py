from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import bcrypt

from auth import create_access_token, get_current_user
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserInfo(BaseModel):
    email: str
    name: str
    role: str


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    db: Session = Depends(get_db)
):
    result = db.execute(
        text("""
            SELECT email,
                   password_hash,
                   name,
                   role
            FROM users
            WHERE email = :email
        """),
        {"email": body.email}
    )

    row = result.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not bcrypt.checkpw(
        body.password.encode("utf-8"),
        row.password_hash.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user = {
        "email": row.email,
        "name": row.name,
        "role": row.role,
    }

    token = create_access_token({
        "sub": user["email"],
        "name": user["name"],
        "role": user["role"],
    })

    return LoginResponse(
        access_token=token,
        user=user,
    )


@router.get("/me", response_model=UserInfo)
def me(current_user: dict = Depends(get_current_user)):
    return UserInfo(**current_user)