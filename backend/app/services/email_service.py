import logging
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_smtp_email_sync(to_emails: list[str], subject: str, html_body: str, text_body: str):
    """
    Synchronous SMTP email sender. Runs in a background thread to prevent blocking API responses.
    """
    if not settings.ENABLE_EMAIL_ALERTS:
        logger.info("[EMAIL SERVICE] Email alerts are disabled via ENABLE_EMAIL_ALERTS=False.")
        return

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(
            f"[EMAIL SERVICE] SMTP_USER or SMTP_PASSWORD not configured in .env. "
            f"Simulated dispatch for subject '{subject}' to: {to_emails}"
        )
        return

    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    from_header = f"{settings.SMTP_FROM_NAME} <{from_email}>"

    valid_recipients = [e.strip() for e in to_emails if e and "@" in e]
    if not valid_recipients:
        logger.warning("[EMAIL SERVICE] No valid recipient email addresses provided.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_header
        msg["To"] = ", ".join(valid_recipients)

        part_text = MIMEText(text_body, "plain", "utf-8")
        part_html = MIMEText(html_body, "html", "utf-8")

        msg.attach(part_text)
        msg.attach(part_html)

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
        server.ehlo()
        if settings.SMTP_PORT in (587, 25):
            server.starttls()
            server.ehlo()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(from_email, valid_recipients, msg.as_string())
        server.quit()

        logger.info(f"[EMAIL SERVICE] Successfully dispatched email to: {valid_recipients}")
    except Exception as exc:
        logger.error(f"[EMAIL SERVICE] Failed to send email via SMTP ({settings.SMTP_HOST}:{settings.SMTP_PORT}): {exc}")


def send_email_async(to_emails: list[str], subject: str, html_body: str, text_body: str):
    """
    Spawns a background thread to send the email asynchronously.
    """
    thread = threading.Thread(
        target=_send_smtp_email_sync,
        args=(to_emails, subject, html_body, text_body),
        daemon=True,
    )
    thread.start()


def send_warning_email(
    student_name: str,
    student_roll_no: str,
    warning_type: str,
    severity: str,
    message: str,
    recipient_emails: list[str],
):
    """
    Formats and dispatches an official warning email to student and linked parents.
    """
    if not recipient_emails:
        return

    severity_colors = {
        "high": "#e11d48",     # Rose / Red
        "medium": "#d97706",   # Amber / Orange
        "low": "#2563eb",      # Blue
    }
    badge_color = severity_colors.get(severity.lower(), "#e11d48")

    subject = f"Official Warning Notice: {warning_type} ({severity.upper()}) - {student_name} ({student_roll_no})"

    text_body = f"""
=====================================================
OFFICIAL ACADEMIC & DISCIPLINARY WARNING NOTICE
=====================================================
Student: {student_name}
Roll Number: {student_roll_no}
Warning Type: {warning_type}
Severity: {severity.upper()}

Notice Details:
{message}

Please log in to the Campus Attendance & Student Portal to view full details and contact the department coordinator immediately.

Campus Attendance Office
""".strip()

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #0f172a; padding: 24px; text-align: left;">
        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">
          {settings.PROJECT_NAME}
        </h2>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">
          Office of Academic Oversight & Student Affairs
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 28px 24px;">
        <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: {badge_color}15; border: 1px solid {badge_color}; color: {badge_color}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
          {severity.upper()} SEVERITY • {warning_type}
        </div>

        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px; font-weight: 700;">
          Official Warning Notice Issued
        </h3>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
          <tr>
            <td style="font-size: 12px; color: #64748b; padding: 4px 8px;"><strong>Student:</strong></td>
            <td style="font-size: 12px; color: #0f172a; padding: 4px 8px;"><strong>{student_name}</strong></td>
          </tr>
          <tr>
            <td style="font-size: 12px; color: #64748b; padding: 4px 8px;"><strong>Roll Number:</strong></td>
            <td style="font-size: 12px; color: #0f172a; font-family: monospace; padding: 4px 8px;">{student_roll_no}</td>
          </tr>
          <tr>
            <td style="font-size: 12px; color: #64748b; padding: 4px 8px;"><strong>Category:</strong></td>
            <td style="font-size: 12px; color: #0f172a; padding: 4px 8px;">{warning_type}</td>
          </tr>
        </table>

        <div style="background-color: #fff1f2; border-left: 4px solid {badge_color}; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #881337; font-size: 13px; line-height: 1.6;">
            {message}
          </p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 12px; color: #475569; line-height: 1.5;">
          This notice has been logged directly onto the student record and transmitted to linked guardians. Immediate corrective action or meeting with the class coordinator is required.
        </p>

        <p style="margin: 20px 0 0 0; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an automated transmission from the institutional portal. Please do not reply directly to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()

    send_email_async(recipient_emails, subject, html_body, text_body)


def send_absence_email(
    student_name: str,
    student_roll_no: str,
    subject_name: str,
    date_str: str,
    recipient_emails: list[str],
):
    """
    Formats and dispatches an absence alert email to student and linked parents.
    """
    if not recipient_emails:
        return

    subject = f"Attendance Alert: {student_name} was marked Absent on {date_str}"

    text_body = f"""
=====================================================
STUDENT ABSENCE NOTIFICATION
=====================================================
Student: {student_name} ({student_roll_no})
Subject: {subject_name}
Date: {date_str}
Status: ABSENT

Your student was marked absent for the recorded session. Maintaining regular attendance is mandatory (min. 75%).
Please check the student dashboard for full details.

Campus Attendance Office
""".strip()

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <tr>
      <td style="background-color: #0f172a; padding: 20px; text-align: left;">
        <h2 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 700;">
          {settings.PROJECT_NAME} • Attendance Office
        </h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #e11d48; font-size: 15px; font-weight: 700;">
          Student Absence Recorded
        </h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #334155; line-height: 1.5;">
          Student <strong>{student_name}</strong> (Roll: <span style="font-family: monospace;">{student_roll_no}</span>) was recorded as <strong>ABSENT</strong> for <strong>{subject_name}</strong> on <strong>{date_str}</strong>.
        </p>
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Please review your student's attendance calendar to verify all classes and ensure attendance stays above the mandatory 75% threshold.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()

    send_email_async(recipient_emails, subject, html_body, text_body)
