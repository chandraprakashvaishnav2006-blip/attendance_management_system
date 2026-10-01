import datetime as dt

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)  # e.g., "Mid-Term Examination", "Unit Test 1"
    exam_type: Mapped[str] = mapped_column(String(50))  # Unit Test, Mid-term, Final, Assignment
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), index=True)
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    # Relationships
    class_group: Mapped["ClassModel"] = relationship("ClassModel", back_populates="exams")
    marks: Mapped[list["Mark"]] = relationship("Mark", back_populates="exam", cascade="all, delete-orphan")

class Mark(Base):
    __tablename__ = "marks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True)
    exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), index=True)
    marks_obtained: Mapped[float] = mapped_column(Float)
    max_marks: Mapped[float] = mapped_column(Float, default=100.0)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "exam_id", "subject_id", name="uq_student_exam_subject"),
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="marks")
    exam: Mapped["Exam"] = relationship("Exam", back_populates="marks")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="marks")
