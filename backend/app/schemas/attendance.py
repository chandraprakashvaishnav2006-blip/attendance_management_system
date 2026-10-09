import datetime as dt

from pydantic import BaseModel, ConfigDict


class AttendanceItem(BaseModel):
    student_id: int
    status: str  # Present, Absent, Late, Leave
    time_slot: str | None = None

class AttendanceBatchCreate(BaseModel):
    subject_id: int
    date: dt.date
    time_slot: str | None = None
    records: list[AttendanceItem]

class AttendanceUpdate(BaseModel):
    status: str
    time_slot: str | None = None

class AttendanceAuditOut(BaseModel):
    id: int
    attendance_id: int
    changed_by: int | None
    changed_by_name: str | None = None
    old_status: str
    new_status: str
    changed_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    student_name: str | None = None
    student_roll_no: str | None = None
    subject_id: int
    subject_name: str | None = None
    subject_code: str | None = None
    date: dt.date
    status: str
    branch_name: str | None = None
    branch_code: str | None = None
    section_name: str | None = None
    time_slot: str | None = None
    marked_by: int | None = None
    created_at: dt.datetime
    updated_at: dt.datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class SubjectAttendanceStat(BaseModel):
    subject_id: int
    subject_name: str
    subject_code: str
    total_classes: int
    present_count: int
    absent_count: int
    late_count: int
    leave_count: int
    percentage: float
    status_color: str  # green, yellow, red

class StudentAttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    roll_no: str
    total_classes: int
    present_count: int
    absent_count: int
    late_count: int
    leave_count: int
    overall_percentage: float
    status_color: str
    is_low_attendance: bool
    subjects: list[SubjectAttendanceStat] = []
