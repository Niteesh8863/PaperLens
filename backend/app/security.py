from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import User
pwd=CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth=OAuth2PasswordBearer(tokenUrl="/api/auth/login")
def hash_password(p): return pwd.hash(p)
def verify_password(p,h): return pwd.verify(p,h)
def token(user_id): return jwt.encode({"sub":str(user_id),"exp":datetime.now(timezone.utc)+timedelta(minutes=settings.jwt_expire_minutes)}, settings.jwt_secret, algorithm="HS256")
def current_user(t: str=Depends(oauth), db: Session=Depends(get_db)):
    try: uid=int(jwt.decode(t, settings.jwt_secret, algorithms=["HS256"])["sub"])
    except (JWTError, ValueError): raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user=db.get(User,uid)
    if not user: raise HTTPException(status_code=401, detail="User not found")
    return user
