import datetime as dt

from pydantic import BaseModel, ConfigDict


class NoticeBase(BaseModel):
    title: str
    description: str
    priority: str = "normal"  # normal, important, urgent
    target_audience: str = "all"  # all, students, parents, class
    class_id: int | None = None
    publish_date: dt.date = dt.date.today()
    expiry_date: dt.date | None = None

class NoticeCreate(NoticeBase):
    pass

class NoticeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    target_audience: str | None = None
    class_id: int | None = None
    publish_date: dt.date | None = None
    expiry_date: dt.date | None = None

class NoticeOut(NoticeBase):
    id: int
    attachment_path: str | None = None
    created_by: int | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)

class PDFDocumentOut(BaseModel):
    id: int
    title: str
    file_path: str
    file_size: int
    mime_type: str
    category: str
    class_id: int | None = None
    subject_id: int | None = None
    class_name: str | None = None
    subject_name: str | None = None
    download_count: int
    uploaded_by: int | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)

class WarningCreate(BaseModel):
    student_id: int
    type: str  # Low Attendance, Poor Marks, Discipline, Other
    severity: str = "medium"  # low, medium, high
    message: str

class WarningUpdate(BaseModel):
    status: str  # sent, read, resolved

class WarningOut(BaseModel):
    id: int
    student_id: int
    student_name: str | None = None
    student_roll_no: str | None = None
    type: str
    severity: str
    message: str
    status: str
    issued_by: int | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationOut(BaseModel):
    id: int
    recipient_user_id: int
    title: str
    message: str
    type: str
    ref_id: int | None = None
    is_read: bool
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
