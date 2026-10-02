import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_student, require_role
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.communication import Notice, Notification, PDFDocument, Warning
from app.models.student import Student
from app.schemas.attendance import AttendanceOut, StudentAttendanceSummary
from app.schemas.communication import (
    NoticeOut,
    NotificationOut,
    PDFDocumentOut,
)
from app.schemas.marks import PerformanceAnalytics, StudentExamResult
from app.schemas.response import ApiResponse
from app.services.attendance_service import get_student_attendance_summary
from app.services.marks_service import (
    get_performance_analytics,
    get_student_exam_results,
)

router = APIRouter(prefix="/student", tags=["Student Module"], dependencies=[Depends(require_role("STUDENT"))])

@router.get("/dashboard", response_model=ApiResponse[dict])
def get_student_dashboard(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    attendance_summary = get_student_attendance_summary(db, student.id)
    exam_results = get_student_exam_results(db, student.id, only_published=True)

    today = dt.date.today()
    # Upcoming notices targeted at all or student's class
    notices_query = db.query(Notice).filter(
        Notice.publish_date <= today,
        or_(Notice.expiry_date == None, Notice.expiry_date >= today),
        or_(
            Notice.target_audience == "all",
            Notice.target_audience == "students",
            Notice.class_id == student.class_id
        )
    ).order_by(Notice.created_at.desc()).limit(5)
    notices = notices_query.all()

    warnings = db.query(Warning).filter(Warning.student_id == student.id).order_by(Warning.created_at.desc()).limit(5).all()
    unread_notifs_count = db.query(Notification).filter(
        Notification.recipient_user_id == student.user_id,
        Notification.is_read == False
    ).count()

    latest_marks = exam_results[0] if exam_results else None

    return ApiResponse(
        success=True,
        data={
            "student_info": {
                "id": student.id,
                "name": student.name,
                "roll_no": student.roll_no,
                "class_name": student.class_group.name if student.class_group else None,
                "section": student.section
            },
            "attendance": attendance_summary,
            "latest_exam_result": latest_marks,
            "unread_notifications_count": unread_notifs_count,
            "notices": [NoticeOut.model_validate(n) for n in notices],
            "warnings": [
                {
                    "id": w.id,
                    "type": w.type,
                    "severity": w.severity,
                    "message": w.message,
                    "status": w.status,
                    "created_at": w.created_at
                } for w in warnings
            ]
        }
    )

@router.get("/attendance", response_model=ApiResponse[StudentAttendanceSummary])
def get_attendance(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    summary = get_student_attendance_summary(db, student.id)
    return ApiResponse(success=True, data=summary)

@router.get("/attendance/history", response_model=ApiResponse[list[AttendanceOut]])
def get_attendance_history(
    subject_id: int | None = None,
    month: int | None = None,
    year: int | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance).filter(Attendance.student_id == student.id)
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    records = query.order_by(Attendance.date.desc()).all()

    # If month/year specified, filter records
    if month or year:
        records = [
            r for r in records
            if (not month or r.date.month == month) and (not year or r.date.year == year)
        ]

    results = [
        AttendanceOut(
            id=r.id,
            student_id=r.student_id,
            student_name=student.name,
            student_roll_no=student.roll_no,
            subject_id=r.subject_id,
            subject_name=r.subject.name if r.subject else None,
            subject_code=r.subject.code if r.subject else None,
            date=r.date,
            status=r.status,
            time_slot=r.time_slot,
            marked_by=r.marked_by,
            created_at=r.created_at,
            updated_at=r.updated_at
        ) for r in records
    ]
    return ApiResponse(success=True, data=results)

@router.get("/marks", response_model=ApiResponse[list[StudentExamResult]])
def get_student_marks(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    results = get_student_exam_results(db, student.id, only_published=True)
    return ApiResponse(success=True, data=results)

@router.get("/performance", response_model=ApiResponse[PerformanceAnalytics])
def get_student_performance(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    analytics = get_performance_analytics(db, student.id, only_published=True)
    return ApiResponse(success=True, data=analytics)

@router.get("/notifications", response_model=ApiResponse[list[NotificationOut]])
def get_student_notifications(
    is_read: bool | None = None,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.recipient_user_id == student.user_id)
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    notifs = query.order_by(Notification.created_at.desc()).all()
    return ApiResponse(success=True, data=[NotificationOut.model_validate(n) for n in notifs])

@router.put("/notifications/{notif_id}/read", response_model=ApiResponse)
def mark_notification_read(
    notif_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.recipient_user_id == student.user_id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return ApiResponse(success=True, message="Marked as read")

@router.get("/documents", response_model=ApiResponse[list[PDFDocumentOut]])
def list_student_documents(
    category: str | None = None,
    subject_id: int | None = None,
    search: str | None = None,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    query = db.query(PDFDocument).filter(
        or_(
            PDFDocument.class_id == None,
            PDFDocument.class_id == student.class_id
        )
    )
    if category:
        query = query.filter(PDFDocument.category == category)
    if subject_id:
        query = query.filter(PDFDocument.subject_id == subject_id)
    if search:
        query = query.filter(PDFDocument.title.ilike(f"%{search}%"))

    docs = query.order_by(PDFDocument.created_at.desc()).all()
    results = [
        PDFDocumentOut(
            id=d.id,
            title=d.title,
            file_path=d.file_path,
            file_size=d.file_size,
            mime_type=d.mime_type,
            category=d.category,
            class_id=d.class_id,
            subject_id=d.subject_id,
            class_name=d.target_class.name if d.target_class else None,
            subject_name=d.subject.name if d.subject else None,
            download_count=d.download_count,
            uploaded_by=d.uploaded_by,
            created_at=d.created_at
        ) for d in docs
    ]
    return ApiResponse(success=True, data=results)

@router.post("/documents/{doc_id}/download-count", response_model=ApiResponse)
def track_document_download(
    doc_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if doc:
        doc.download_count += 1
        db.commit()
    return ApiResponse(success=True, message="Download registered")
