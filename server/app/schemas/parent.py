import datetime as dt

from pydantic import BaseModel, ConfigDict, EmailStr


class StudentSummary(BaseModel):
    id: int
    roll_no: str
    name: str
    class_id: int | None = None
    class_name: str | None = None
    section: str

    model_config = ConfigDict(from_attributes=True)

class ParentBase(BaseModel):
    name: str
    phone: str | None = None
    relation: str = "Parent"

class ParentCreate(ParentBase):
    email: EmailStr
    password: str | None = None  # default temporary password if None
    student_ids: list[int] | None = []

class ParentUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    relation: str | None = None
    email: EmailStr | None = None
    student_ids: list[int] | None = None

class ParentOut(ParentBase):
    id: int
    user_id: int
    email: str
    students: list[StudentSummary] = []
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
