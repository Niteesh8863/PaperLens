from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base
class User(Base):
    __tablename__="users"
    id: Mapped[int]=mapped_column(primary_key=True)
    email: Mapped[str]=mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str]=mapped_column(String(255))
    created_at: Mapped[datetime]=mapped_column(DateTime, default=datetime.utcnow)
class Document(Base):
    __tablename__="documents"
    id: Mapped[int]=mapped_column(primary_key=True)
    owner_id: Mapped[int]=mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str]=mapped_column(String(255))
    storage_path: Mapped[str]=mapped_column(String(500))
    status: Mapped[str]=mapped_column(String(30), default="uploaded")
    created_at: Mapped[datetime]=mapped_column(DateTime, default=datetime.utcnow)
    owner=relationship("User")
    extractions=relationship("Extraction", back_populates="document", cascade="all, delete-orphan")
class Extraction(Base):
    __tablename__="extractions"
    id: Mapped[int]=mapped_column(primary_key=True)
    document_id: Mapped[int]=mapped_column(ForeignKey("documents.id"), index=True)
    kind: Mapped[str]=mapped_column(String(80))
    value: Mapped[dict]=mapped_column(JSON)
    confidence: Mapped[int]=mapped_column(Integer, default=0)
    review_status: Mapped[str]=mapped_column(String(20), default="pending")
    reviewer_note: Mapped[str|None]=mapped_column(Text, nullable=True)
    document=relationship("Document", back_populates="extractions")
