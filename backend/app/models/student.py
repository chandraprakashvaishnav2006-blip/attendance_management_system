import datetime as dt
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    roll_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    class_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    branch_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    section_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    section: Mapped[str] = mapped_column(String(10), default="A")
    dob: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(25), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, inactive
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    class_group: Mapped[Optional["ClassModel"]] = relationship("ClassModel", back_populates="students")
    branch: Mapped[Optional["Branch"]] = relationship("Branch", back_populates="students")
    section_model: Mapped[Optional["Section"]] = relationship("Section", back_populates="students")
    parents: Mapped[list["Parent"]] = relationship("Parent", secondary="parent_students", back_populates="students", order_by="Parent.name")
    attendances: Mapped[list["Attendance"]] = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    marks: Mapped[list["Mark"]] = relationship("Mark", back_populates="student", cascade="all, delete-orphan")
    warnings: Mapped[list["Warning"]] = relationship("Warning", back_populates="student", cascade="all, delete-orphan")
