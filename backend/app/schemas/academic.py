
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

