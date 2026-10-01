from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


# Association table between Class and Subject
class ClassSubject(Base):
    __tablename__ = "class_subjects"

    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)

class ClassModel(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)  # e.g., "Grade 10", "CSE-Sem 5"
    sections: Mapped[str] = mapped_column(String(100), default="A,B")  # comma-separated sections
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    students: Mapped[list["Student"]] = relationship("Student", back_populates="class_group")
    subjects: Mapped[list["Subject"]] = relationship("Subject", secondary="class_subjects", back_populates="classes")
    exams: Mapped[list["Exam"]] = relationship("Exam", back_populates="class_group")
    notices: Mapped[list["Notice"]] = relationship("Notice", back_populates="target_class")
    documents: Mapped[list["PDFDocument"]] = relationship("PDFDocument", back_populates="target_class")

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)  # e.g., "Mathematics", "Computer Science"
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g., "MATH101", "CS201"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    classes: Mapped[list["ClassModel"]] = relationship("ClassModel", secondary="class_subjects", back_populates="subjects")
    attendances: Mapped[list["Attendance"]] = relationship("Attendance", back_populates="subject")
    marks: Mapped[list["Mark"]] = relationship("Mark", back_populates="subject")
    documents: Mapped[list["PDFDocument"]] = relationship("PDFDocument", back_populates="subject")
