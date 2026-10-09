import datetime as dt
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # normal, important, urgent
    target_audience: Mapped[str] = mapped_column(String(50), default="all")  # all, students, parents, class
    class_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    attachment_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attachment_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    publish_date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today)
    expiry_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    # Relationships
    target_class: Mapped[Optional["ClassModel"]] = relationship("ClassModel", back_populates="notices")

class PDFDocument(Base):
    __tablename__ = "pdf_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    file_path: Mapped[str] = mapped_column(String(255))
    file_size: Mapped[int] = mapped_column(Integer)  # bytes
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    category: Mapped[str] = mapped_column(String(50), default="Notes")  # Notes, Syllabus, Timetable, Assignment, Circular, Other
    class_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    subject_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    file_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    uploaded_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    # Relationships
    target_class: Mapped[Optional["ClassModel"]] = relationship("ClassModel", back_populates="documents")
    subject: Mapped[Optional["Subject"]] = relationship("Subject", back_populates="documents")

class Warning(Base):
    __tablename__ = "warnings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(50))  # Low Attendance, Poor Marks, Discipline, Other
    severity: Mapped[str] = mapped_column(String(20), default="medium")  # low, medium, high
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent, read, resolved
    issued_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="warnings")

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipient_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50), default="general")  # attendance_alert, warning, notice, exam_mark, system
    ref_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # ID of related notice/warning/attendance
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    # Relationships
    recipient: Mapped["User"] = relationship("User", back_populates="notifications")
