
import datetime as dt
from pydantic import BaseModel, ConfigDict


class SubjectBase(BaseModel):
    name: str
    code: str

class SubjectCreate(SubjectBase):
    class_ids: list[int] | None = None

class SubjectUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    class_ids: list[int] | None = None

class ClassBrief(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class SubjectOut(SubjectBase):
    id: int
    classes: list[ClassBrief] = []
    model_config = ConfigDict(from_attributes=True)

class ClassBase(BaseModel):
    name: str
    sections: str = "A,B"

class ClassCreate(ClassBase):
    subject_ids: list[int] | None = None

class ClassUpdate(BaseModel):
    name: str | None = None
    sections: str | None = None
    subject_ids: list[int] | None = None

class ClassSubjectsUpdate(BaseModel):
    subject_ids: list[int]

class ClassOut(ClassBase):
    id: int
    subjects: list[SubjectOut] = []
    model_config = ConfigDict(from_attributes=True)


# --- Branch Schemas ---

class BranchBase(BaseModel):
    name: str
    code: str
    hod_name: str | None = None
    description: str | None = None
    intake_capacity: int = 120
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    hod_name: str | None = None
    description: str | None = None
    intake_capacity: int | None = None
    is_active: bool | None = None

class BranchOut(BranchBase):
    id: int
    created_at: dt.datetime
    sections_count: int = 0
    students_count: int = 0
    model_config = ConfigDict(from_attributes=True)


# --- Section Schemas ---

class SectionBase(BaseModel):
    name: str
    class_id: int
    branch_id: int | None = None
    room_number: str | None = None
    capacity: int = 60
    class_teacher: str | None = None
    is_active: bool = True

class SectionCreate(SectionBase):
    pass

class SectionUpdate(BaseModel):
    name: str | None = None
    class_id: int | None = None
    branch_id: int | None = None
    room_number: str | None = None
    capacity: int | None = None
    class_teacher: str | None = None
    is_active: bool | None = None

class SectionOut(SectionBase):
    id: int
    class_name: str | None = None
    branch_name: str | None = None
    branch_code: str | None = None
    students_count: int = 0
    created_at: dt.datetime
    model_config = ConfigDict(from_attributes=True)

class SectionAssignStudents(BaseModel):
    section_id: int
    student_ids: list[int]


