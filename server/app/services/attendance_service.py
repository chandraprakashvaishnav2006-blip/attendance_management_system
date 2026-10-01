from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.academic import Subject
from app.models.attendance import Attendance
from app.models.student import Student
from app.schemas.attendance import StudentAttendanceSummary, SubjectAttendanceStat


def calculate_status_color(percentage: float) -> str:
    if percentage >= 85.0:
        return "green"
    elif percentage >= 75.0:
        return "yellow"
    else:
        return "red"

def get_student_attendance_summary(db: Session, student_id: int) -> StudentAttendanceSummary:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ValueError("Student not found")

    attendances = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    
    total = len(attendances)
    present = sum(1 for a in attendances if a.status.lower() in ("present", "late"))
    absent = sum(1 for a in attendances if a.status.lower() == "absent")
    late = sum(1 for a in attendances if a.status.lower() == "late")
    leave = sum(1 for a in attendances if a.status.lower() == "leave")

    overall_pct = round((present / total * 100), 1) if total > 0 else 100.0
    overall_color = calculate_status_color(overall_pct)
    is_low = overall_pct < settings.MIN_ATTENDANCE_THRESHOLD

    # Subject-wise breakdown
    subject_map: dict[int, list[Attendance]] = {}
    for a in attendances:
        subject_map.setdefault(a.subject_id, []).append(a)

    subjects_stats: list[SubjectAttendanceStat] = []
    # If the student has classes/subjects, let's also ensure all subjects are listed
    all_subjects = db.query(Subject).all()
    for subj in all_subjects:
        subj_records = subject_map.get(subj.id, [])
        if not subj_records:
            continue
        s_total = len(subj_records)
        s_present = sum(1 for a in subj_records if a.status.lower() in ("present", "late"))
        s_absent = sum(1 for a in subj_records if a.status.lower() == "absent")
        s_late = sum(1 for a in subj_records if a.status.lower() == "late")
        s_leave = sum(1 for a in subj_records if a.status.lower() == "leave")
        s_pct = round((s_present / s_total * 100), 1) if s_total > 0 else 100.0

        subjects_stats.append(SubjectAttendanceStat(
            subject_id=subj.id,
            subject_name=subj.name,
            subject_code=subj.code,
            total_classes=s_total,
            present_count=s_present,
            absent_count=s_absent,
            late_count=s_late,
            leave_count=s_leave,
            percentage=s_pct,
            status_color=calculate_status_color(s_pct)
        ))

    return StudentAttendanceSummary(
        student_id=student.id,
        student_name=student.name,
        roll_no=student.roll_no,
        total_classes=total,
        present_count=present,
        absent_count=absent,
        late_count=late,
        leave_count=leave,
        overall_percentage=overall_pct,
        status_color=overall_color,
        is_low_attendance=is_low,
        subjects=subjects_stats
    )
