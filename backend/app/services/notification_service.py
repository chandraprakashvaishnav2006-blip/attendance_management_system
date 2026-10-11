from sqlalchemy.orm import Session

from app.models.communication import Notification, Warning
from app.models.student import Student
from app.services.email_service import send_warning_email, send_absence_email


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

    # If student is absent, notify parents via in-app and email
    if status.lower() == "absent":
        parent_emails = []
        for parent in student.parents:
            create_notification(
                db=db,
                recipient_user_id=parent.user_id,
                title="Child Absence Alert",
                message=f"Your child {student.name} ({student.roll_no}) was marked ABSENT for {subject_name} on {date_str}.",
                notification_type="attendance_alert",
                ref_id=student.id
            )
            if parent.user and parent.user.email:
                parent_emails.append(parent.user.email)

        # Send absence email to parents
        if parent_emails:
            send_absence_email(
                student_name=student.name,
                student_roll_no=student.roll_no,
                subject_name=subject_name,
                date_str=date_str,
                recipient_emails=parent_emails,
            )

def notify_warning_issued(db: Session, warning: Warning):
    student = db.query(Student).filter(Student.id == warning.student_id).first()
    if not student:
        return

    recipient_emails = []

    # Notify student (in-app + email)
    create_notification(
        db=db,
        recipient_user_id=student.user_id,
        title=f"Warning: {warning.type} ({warning.severity.upper()})",
        message=warning.message,
        notification_type="warning",
        ref_id=warning.id
    )
    if student.user and student.user.email:
        recipient_emails.append(student.user.email)

    # Notify linked parents (in-app + email)
    for parent in student.parents:
        create_notification(
            db=db,
            recipient_user_id=parent.user_id,
            title=f"Disciplinary Alert: {warning.type} for {student.name}",
            message=f"An official warning has been issued for {student.name}: {warning.message}",
            notification_type="warning",
            ref_id=warning.id
        )
        if parent.user and parent.user.email:
            recipient_emails.append(parent.user.email)

    # Dispatch warning email in background
    if recipient_emails:
        send_warning_email(
            student_name=student.name,
            student_roll_no=student.roll_no,
            warning_type=warning.type,
            severity=warning.severity,
            message=warning.message,
            recipient_emails=list(set(recipient_emails)),
        )
