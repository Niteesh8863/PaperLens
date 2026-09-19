from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..schemas import UserCreate, Token
from ..security import hash_password, verify_password, token
router=APIRouter()
@router.post("/register", response_model=Token)
def register(data:UserCreate, db:Session=Depends(get_db)):
    if db.query(User).filter_by(email=data.email).first(): raise HTTPException(400,"Email already registered")
    u=User(email=data.email,password_hash=hash_password(data.password)); db.add(u); db.commit(); db.refresh(u); return Token(access_token=token(u.id))
@router.post("/login", response_model=Token)
def login(data:UserCreate, db:Session=Depends(get_db)):
    u=db.query(User).filter_by(email=data.email).first()
    if not u or not verify_password(data.password,u.password_hash): raise HTTPException(401,"Invalid credentials")
    return Token(access_token=token(u.id))
