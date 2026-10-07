from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


# Association table between Class and Subject
class ClassSubject(Base):
    __tablename__ = "class_subjects"

    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)  # e.g., "Computer Science & Engineering"
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)   # e.g., "CSE"
    hod_name: Mapped[str | None] = mapped_column(String(100), nullable=True) # e.g., "Dr. Rajesh Sharma"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    intake_capacity: Mapped[int] = mapped_column(Integer, default=120)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    sections: Mapped[list["Section"]] = relationship("Section", back_populates="branch", cascade="all, delete-orphan", order_by="Section.name")
    students: Mapped[list["Student"]] = relationship("Student", back_populates="branch", order_by="Student.name")


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), index=True)  # e.g., "A", "B", "C"
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), index=True)
    branch_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    room_number: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g., "Hall 302", "Lab 4B"
    capacity: Mapped[int] = mapped_column(Integer, default=60)
    class_teacher: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g., "Prof. Priya Nair"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    class_group: Mapped["ClassModel"] = relationship("ClassModel", back_populates="section_records")
    branch: Mapped["Branch | None"] = relationship("Branch", back_populates="sections")
    students: Mapped[list["Student"]] = relationship("Student", back_populates="section_model", order_by="Student.name")


class ClassModel(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)  # e.g., "Grade 10", "CSE-Sem 5"
    sections: Mapped[str] = mapped_column(String(100), default="A,B")  # comma-separated sections
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    students: Mapped[list["Student"]] = relationship("Student", back_populates="class_group", order_by="Student.name")
    section_records: Mapped[list["Section"]] = relationship("Section", back_populates="class_group", cascade="all, delete-orphan", order_by="Section.name")
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
