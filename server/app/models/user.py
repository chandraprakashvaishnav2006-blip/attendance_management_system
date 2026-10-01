from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    role: Mapped[str] = mapped_column(String(20), index=True)  # ADMIN, STUDENT, PARENT
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    lock_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    reset_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student_profile: Mapped[Optional["Student"]] = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    parent_profile: Mapped[Optional["Parent"]] = relationship("Parent", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
