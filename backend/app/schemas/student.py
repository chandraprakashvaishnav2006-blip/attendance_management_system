import datetime as dt

from pydantic import BaseModel, ConfigDict, EmailStr


class StudentBase(BaseModel):
    name: str
    roll_no: str
    class_id: int | None = None
    branch_id: int | None = None
    section_id: int | None = None
    section: str = "A"
    dob: dt.date | None = None
    gender: str | None = None
    phone: str | None = None
    address: str | None = None
    photo_path: str | None = None
    status: str = "active"

class StudentCreate(StudentBase):
    email: EmailStr
    password: str | None = None  # if not provided, defaults to roll_no + @Pass123

class StudentUpdate(BaseModel):
    name: str | None = None
    class_id: int | None = None
    branch_id: int | None = None
    section_id: int | None = None
    section: str | None = None
    dob: dt.date | None = None
    gender: str | None = None
    phone: str | None = None
    address: str | None = None
    photo_path: str | None = None
    status: str | None = None
    email: EmailStr | None = None

class StudentOut(StudentBase):
    id: int
    user_id: int
    email: str
    class_name: str | None = None
    branch_name: str | None = None
    branch_code: str | None = None
    section_name: str | None = None
    parent_count: int = 0
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)

class StudentDetailOut(StudentOut):
    parents: list["ParentSummary"] = []

class ParentSummary(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None
    relation: str

    model_config = ConfigDict(from_attributes=True)
