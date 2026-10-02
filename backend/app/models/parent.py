from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ParentStudent(Base):
    __tablename__ = "parent_students"

    parent_id: Mapped[int] = mapped_column(Integer, ForeignKey("parents.id", ondelete="CASCADE"), primary_key=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)

class Parent(Base):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    phone: Mapped[str | None] = mapped_column(String(25), nullable=True)
    relation: Mapped[str] = mapped_column(String(50), default="Parent")  # Father, Mother, Guardian, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="parent_profile")
    students: Mapped[list["Student"]] = relationship("Student", secondary="parent_students", back_populates="parents")
