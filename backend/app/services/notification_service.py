from sqlalchemy.orm import Session

from app.models.communication import Notification, Warning
from app.models.student import Student


def create_notification(
    db: Session,
    recipient_user_id: int,
    title: str,
    message: str,
    notification_type: str = "general",
    ref_id: int | None = None
) -> Notification:
    notif = Notification(
        recipient_user_id=recipient_user_id,
        title=title,
        message=message,
        type=notification_type,
        ref_id=ref_id,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def notify_attendance_event(
    db: Session,
    student_id: int,
    subject_name: str,
    date_str: str,
    status: str
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return

    # If student is absent, notify parents
    if status.lower() == "absent":
        for parent in student.parents:
            create_notification(
                db=db,
                recipient_user_id=parent.user_id,
                title="Child Absence Alert",
                message=f"Your child {student.name} ({student.roll_no}) was marked ABSENT for {subject_name} on {date_str}.",
                notification_type="attendance_alert",
                ref_id=student.id
            )

def notify_warning_issued(db: Session, warning: Warning):
    student = db.query(Student).filter(Student.id == warning.student_id).first()
    if not student:
        return

    # Notify student
    create_notification(
        db=db,
        recipient_user_id=student.user_id,
        title=f"Warning: {warning.type} ({warning.severity.upper()})",
        message=warning.message,
        notification_type="warning",
        ref_id=warning.id
    )

    # Notify linked parents
    for parent in student.parents:
        create_notification(
            db=db,
            recipient_user_id=parent.user_id,
            title=f"Disciplinary Alert: {warning.type} for {student.name}",
            message=f"An official warning has been issued for {student.name}: {warning.message}",
            notification_type="warning",
            ref_id=warning.id
        )
