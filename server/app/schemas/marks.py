import datetime as dt

from pydantic import BaseModel, ConfigDict


class ExamBase(BaseModel):
    name: str
    exam_type: str
    class_id: int
    date: dt.date | None = None
    is_published: bool = False

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    name: str | None = None
    exam_type: str | None = None
    class_id: int | None = None
    date: dt.date | None = None
    is_published: bool | None = None

class ExamOut(ExamBase):
    id: int
    class_name: str | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)

class MarkEntry(BaseModel):
    student_id: int
    subject_id: int
    marks_obtained: float
    max_marks: float = 100.0

class MarkBatchCreate(BaseModel):
    exam_id: int
    subject_id: int
    max_marks: float = 100.0
    entries: list[MarkEntry]

class MarkOut(BaseModel):
    id: int
    student_id: int
    student_name: str | None = None
    student_roll_no: str | None = None
    exam_id: int
    exam_name: str | None = None
    subject_id: int
    subject_name: str | None = None
    marks_obtained: float
    max_marks: float
    percentage: float
    grade: str
    passed: bool
    published: bool

    model_config = ConfigDict(from_attributes=True)

class StudentSubjectMark(BaseModel):
    subject_id: int
    subject_name: str
    subject_code: str
    marks_obtained: float
    max_marks: float
    percentage: float
    grade: str
    passed: bool

class StudentExamResult(BaseModel):
    exam_id: int
    exam_name: str
    exam_type: str
    date: dt.date | None = None
    total_obtained: float
    total_max: float
    overall_percentage: float
    overall_grade: str
    rank: int | None = None
    total_students_in_class: int | None = None
    subjects: list[StudentSubjectMark] = []

class PerformanceAnalytics(BaseModel):
    student_id: int
    student_name: str
    roll_no: str
    overall_percentage: float
    overall_rank: int | None = None
    total_exams: int
    exam_trends: list[dict] = []  # [{ exam_name, percentage, date }]
    subject_comparison: list[dict] = []  # [{ subject_name, student_avg, class_avg }]
    strong_subjects: list[str] = []
    weak_subjects: list[str] = []
