from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User
from auth.security import hash_password, verify_password, create_access_token
from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_LANGUAGES = {"en", "hi", "kn", "te"}

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    preferred_language: str = "en"

    @field_validator("password")
    @classmethod
    def check_password_length(cls, v):
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v

    @field_validator("preferred_language")
    @classmethod
    def check_language(cls, v):
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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Incorrect username or password")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}
