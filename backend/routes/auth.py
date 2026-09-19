import re
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User
from auth.security import hash_password, create_access_token, verify_password_constant_time
from auth.rate_limiter import limiter
from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_LANGUAGES = {"en", "hi", "kn", "te"}
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_-]{3,30}$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$")


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    preferred_language: str = "en"

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not USERNAME_REGEX.match(v):
            raise ValueError(
                "Username must be 3-30 characters long and contain only alphanumeric characters, underscores, or hyphens."
            )
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) > 254 or not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email address format.")
        return v

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return v

    @field_validator("preferred_language")
    @classmethod
    def check_language(cls, v: str) -> str:
        if v not in ALLOWED_LANGUAGES:
            raise ValueError(f"Language must be one of: {', '.join(sorted(ALLOWED_LANGUAGES))}")
        return v


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        preferred_language=payload.preferred_language,
    )
    db.add(user)
    db.commit()
    return {"message": "User created"}


@router.post("/login")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Enforce lockout if max failed attempts exceeded
    limiter.check_login_allowed(client_ip, form_data.username)

    user = db.query(User).filter(User.username == form_data.username).first()

    # Constant-time comparison ensures identical latency whether user exists or not
    is_valid = verify_password_constant_time(user, form_data.password)

    if not is_valid:
        limiter.record_login_failure(client_ip, form_data.username)
        raise HTTPException(401, "Incorrect username or password")

    # Reset failed attempts upon successful login
    limiter.record_login_success(client_ip, form_data.username)
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

