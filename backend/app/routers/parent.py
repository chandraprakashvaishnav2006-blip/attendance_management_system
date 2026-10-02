import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_parent, require_role
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.communication import Notice, Notification, Warning
from app.models.parent import Parent
from app.models.student import Student
from app.schemas.attendance import AttendanceOut, StudentAttendanceSummary
from app.schemas.communication import NoticeOut, NotificationOut
from app.schemas.marks import PerformanceAnalytics, StudentExamResult
from app.schemas.parent import StudentSummary
from app.schemas.response import ApiResponse
from app.services.attendance_service import get_student_attendance_summary
from app.services.marks_service import (
    get_performance_analytics,
    get_student_exam_results,
)

router = APIRouter(prefix="/parent", tags=["Parent Module"], dependencies=[Depends(require_role("PARENT"))])

def verify_parent_child(parent: Parent, student_id: int) -> Student:
    child = next((s for s in parent.students if s.id == student_id), None)
    if not child:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This student is not linked to your parent account."
        )
    return child

@router.get("/children", response_model=ApiResponse[list[StudentSummary]])
def get_children(
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    results = [
        StudentSummary(
            id=s.id,
            roll_no=s.roll_no,
            name=s.name,
            class_id=s.class_id,
            class_name=s.class_group.name if s.class_group else None,
            section=s.section
        ) for s in parent.students
    ]
    return ApiResponse(success=True, data=results)

@router.get("/dashboard", response_model=ApiResponse[dict])
def get_parent_dashboard(
    student_id: int | None = None,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    if not parent.students:
        return ApiResponse(
            success=True,
            data={
                "children": [],
                "active_child": None,
                "attendance": None,
                "latest_exam_result": None,
                "warnings": [],
                "notices": [],
                "unread_alerts_count": 0
            }
        )

    # Default to first child if not specified
    target_id = student_id if student_id else parent.students[0].id
    child = verify_parent_child(parent, target_id)

    attendance_summary = get_student_attendance_summary(db, child.id)
    exam_results = get_student_exam_results(db, child.id, only_published=True)

    today = dt.date.today()
    notices_query = db.query(Notice).filter(
        Notice.publish_date <= today,
        or_(Notice.expiry_date == None, Notice.expiry_date >= today),
        or_(
            Notice.target_audience == "all",
            Notice.target_audience == "parents",
            Notice.class_id == child.class_id
        )
    ).order_by(Notice.created_at.desc()).limit(5)
    notices = notices_query.all()

    warnings = db.query(Warning).filter(Warning.student_id == child.id).order_by(Warning.created_at.desc()).limit(5).all()

    unread_alerts_count = db.query(Notification).filter(
        Notification.recipient_user_id == parent.user_id,
        Notification.is_read == False
    ).count()

    latest_marks = exam_results[0] if exam_results else None

    return ApiResponse(
        success=True,
        data={
            "children": [
                {
                    "id": s.id,
                    "name": s.name,
                    "roll_no": s.roll_no,
                    "class_name": s.class_group.name if s.class_group else None,
                    "section": s.section
                } for s in parent.students
            ],
            "active_child": {
                "id": child.id,
                "name": child.name,
                "roll_no": child.roll_no,
                "class_name": child.class_group.name if child.class_group else None,
                "section": child.section
            },
            "attendance": attendance_summary,
            "latest_exam_result": latest_marks,
            "warnings": [
                {
                    "id": w.id,
                    "type": w.type,
                    "severity": w.severity,
                    "message": w.message,
                    "status": w.status,
                    "created_at": w.created_at
                } for w in warnings
            ],
            "notices": [NoticeOut.model_validate(n) for n in notices],
            "unread_alerts_count": unread_alerts_count
        }
    )

@router.get("/children/{student_id}/attendance", response_model=ApiResponse[StudentAttendanceSummary])
def get_child_attendance(
    student_id: int,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    child = verify_parent_child(parent, student_id)
    summary = get_student_attendance_summary(db, child.id)
    return ApiResponse(success=True, data=summary)

@router.get("/children/{student_id}/attendance/history", response_model=ApiResponse[list[AttendanceOut]])
def get_child_attendance_history(
    student_id: int,
    subject_id: int | None = None,
    month: int | None = None,
    year: int | None = None,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    child = verify_parent_child(parent, student_id)
    query = db.query(Attendance).filter(Attendance.student_id == child.id)
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)

    records = query.order_by(Attendance.date.desc()).all()
    if month or year:
        records = [
            r for r in records
            if (not month or r.date.month == month) and (not year or r.date.year == year)
        ]

    results = [
        AttendanceOut(
            id=r.id,
            student_id=r.student_id,
            student_name=child.name,
            student_roll_no=child.roll_no,
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

@router.get("/children/{student_id}/marks", response_model=ApiResponse[list[StudentExamResult]])
def get_child_marks(
    student_id: int,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    child = verify_parent_child(parent, student_id)
    results = get_student_exam_results(db, child.id, only_published=True)
    return ApiResponse(success=True, data=results)

@router.get("/children/{student_id}/performance", response_model=ApiResponse[PerformanceAnalytics])
def get_child_performance(
    student_id: int,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    child = verify_parent_child(parent, student_id)
    analytics = get_performance_analytics(db, child.id, only_published=True)
    return ApiResponse(success=True, data=analytics)

@router.get("/notifications", response_model=ApiResponse[list[NotificationOut]])
def get_parent_notifications(
    is_read: bool | None = None,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.recipient_user_id == parent.user_id)
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    notifs = query.order_by(Notification.created_at.desc()).all()
    return ApiResponse(success=True, data=[NotificationOut.model_validate(n) for n in notifs])

@router.put("/notifications/{notif_id}/read", response_model=ApiResponse)
def mark_parent_notification_read(
    notif_id: int,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.recipient_user_id == parent.user_id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return ApiResponse(success=True, message="Marked as read")
