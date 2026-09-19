from datetime import datetime, timedelta
import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
from database.db import get_db
from database.models import User
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set in .env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# Precomputed dummy hash to mitigate side-channel timing attacks
DUMMY_HASH = bcrypt.hashpw(b"constant_time_timing_mitigation_secret", bcrypt.gensalt()).decode("utf-8")
def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")
def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
def verify_password_constant_time(user: User | None, plain_password: str) -> bool:
    """
    Evaluates password in constant time regardless of whether the user exists.
    Prevents side-channel timing analysis from determining valid usernames.
    """
    if user and user.hashed_password:
        return bcrypt.checkpw(plain_password.encode("utf-8"), user.hashed_password.encode("utf-8"))
    bcrypt.checkpw(plain_password.encode("utf-8"), DUMMY_HASH.encode("utf-8"))
    return False
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
