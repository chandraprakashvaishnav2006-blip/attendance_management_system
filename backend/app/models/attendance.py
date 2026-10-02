import datetime as dt

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Attendance(Base):
    __tablename__ = "attendances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), index=True)
    date: Mapped[dt.date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20))  # Present, Absent, Late, Leave
    time_slot: Mapped[str | None] = mapped_column(String(30), nullable=True, default=None)  # e.g., 10:30 AM
    marked_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "subject_id", "date", name="uq_student_subject_date"),
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="attendances")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="attendances")
    audits: Mapped[list["AttendanceAudit"]] = relationship("AttendanceAudit", back_populates="attendance", cascade="all, delete-orphan")

class AttendanceAudit(Base):
    __tablename__ = "attendance_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attendance_id: Mapped[int] = mapped_column(Integer, ForeignKey("attendances.id", ondelete="CASCADE"), index=True)
    changed_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    old_status: Mapped[str] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20))
    changed_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    # Relationships
    attendance: Mapped["Attendance"] = relationship("Attendance", back_populates="audits")
