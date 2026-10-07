import datetime as dt
import functools
import time
from typing import Any, Callable

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.function_tracker import AppFunction, FunctionLog

SYSTEM_FUNCTIONS_CATALOG = [
    # Auth
    {
        "name": "auth_login",
        "display_name": "User Login & JWT Generation",
        "category": "Authentication",
        "endpoint": "/api/v1/auth/login",
        "http_method": "POST",
        "module": "app.routers.auth",
        "description": "Authenticates user by email/roll_no and password; generates httpOnly JWT cookies and bearer tokens."
    },
    {
        "name": "auth_logout",
        "display_name": "User Session Logout",
        "category": "Authentication",
        "endpoint": "/api/v1/auth/logout",
        "http_method": "POST",
        "module": "app.routers.auth",
        "description": "Clears auth session cookies and invalidates client credentials."
    },
    {
        "name": "auth_get_me",
        "display_name": "Get Current User Profile",
        "category": "Authentication",
        "endpoint": "/api/v1/auth/me",
        "http_method": "GET",
        "module": "app.routers.auth",
        "description": "Retrieves the authenticated user profile, assigned role, and permissions."
    },
    {
        "name": "auth_change_password",
        "display_name": "Update User Password",
        "category": "Authentication",
        "endpoint": "/api/v1/auth/change-password",
        "http_method": "POST",
        "module": "app.routers.auth",
        "description": "Validates current credentials and updates user password with Bcrypt hashing."
    },
    {
        "name": "auth_forgot_password",
        "display_name": "Request Password Reset Token",
        "category": "Authentication",
        "endpoint": "/api/v1/auth/forgot-password",
        "http_method": "POST",
        "module": "app.routers.auth",
        "description": "Issues time-limited cryptographic reset token for lost account recovery."
    },
    {
        "name": "auth_reset_password",
        "display_name": "Reset Password with Token",
        "category": "Authentication",
        "endpoint": "/api/v1/auth/reset-password",
        "http_method": "POST",
        "module": "app.routers.auth",
        "description": "Validates token and updates account credentials."
    },

    # Attendance
    {
        "name": "admin_get_attendance",
        "display_name": "Fetch Attendance Sheet",
        "category": "Attendance",
        "endpoint": "/api/v1/admin/attendance",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Fetches attendance records for a specific class, section, subject, and date."
    },
    {
        "name": "admin_batch_attendance",
        "display_name": "Batch Record Attendance",
        "category": "Attendance",
        "endpoint": "/api/v1/admin/attendance/batch",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Bulk marks student attendance with automated audit trail logging of previous states."
    },
    {
        "name": "admin_export_attendance",
        "display_name": "Export Attendance to CSV",
        "category": "Attendance",
        "endpoint": "/api/v1/admin/attendance/export-csv",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Compiles and streams a formatted CSV of attendance percentages and history."
    },
    {
        "name": "student_get_attendance",
        "display_name": "Student Attendance Calendar",
        "category": "Attendance",
        "endpoint": "/api/v1/student/attendance",
        "http_method": "GET",
        "module": "app.routers.student",
        "description": "Fetches authenticated student's monthly attendance matrix and subject percentages."
    },
    {
        "name": "parent_get_attendance",
        "display_name": "Parent Child Attendance",
        "category": "Attendance",
        "endpoint": "/api/v1/parent/child/{id}/attendance",
        "http_method": "GET",
        "module": "app.routers.parent",
        "description": "Provides read-only access for parents to view their child's attendance records."
    },

    # Students & Parents
    {
        "name": "admin_list_students",
        "display_name": "List Paginated Students",
        "category": "Students",
        "endpoint": "/api/v1/admin/students",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Searches, filters, sorts, and paginates enrolled student directory records."
    },
    {
        "name": "admin_create_student",
        "display_name": "Register New Student",
        "category": "Students",
        "endpoint": "/api/v1/admin/students",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Enrolls student and automatically provisions corresponding user login account."
    },
    {
        "name": "admin_import_students_csv",
        "display_name": "Bulk CSV Student Import",
        "category": "Students",
        "endpoint": "/api/v1/admin/students/import-csv",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Parses and validates multi-row CSV files to register students in bulk."
    },
    {
        "name": "admin_export_students_csv",
        "display_name": "Export Student Roster CSV",
        "category": "Students",
        "endpoint": "/api/v1/admin/students/export-csv",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Generates downloadable CSV file of all student demographic and academic records."
    },
    {
        "name": "admin_list_parents",
        "display_name": "List Registered Parents",
        "category": "Parents",
        "endpoint": "/api/v1/admin/parents",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Retrieves parent contact profiles and many-to-many linked student associations."
    },
    {
        "name": "admin_create_parent",
        "display_name": "Register New Parent",
        "category": "Parents",
        "endpoint": "/api/v1/admin/parents",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Registers parent profile, user account, and links to designated student(s)."
    },
    {
        "name": "admin_link_parents",
        "display_name": "Link Student to Parent",
        "category": "Parents",
        "endpoint": "/api/v1/admin/parents/{id}/link-students",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Updates parent-student linking mappings for multi-child households."
    },

    # Marks & Exams
    {
        "name": "admin_list_exams",
        "display_name": "List Examinations",
        "category": "Marks & Exams",
        "endpoint": "/api/v1/admin/exams",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Retrieves unit tests, mid-terms, final exams, and evaluation rubrics."
    },
    {
        "name": "admin_create_exam",
        "display_name": "Schedule New Examination",
        "category": "Marks & Exams",
        "endpoint": "/api/v1/admin/exams",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Creates exam records with subject associations, date, and maximum score."
    },
    {
        "name": "admin_batch_marks",
        "display_name": "Batch Marks Entry & Grading",
        "category": "Marks & Exams",
        "endpoint": "/api/v1/admin/marks",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Saves scores, computes letter grades (A+, A, B, C, D, F), rank, and pass/fail."
    },
    {
        "name": "admin_publish_exam",
        "display_name": "Toggle Exam Publication",
        "category": "Marks & Exams",
        "endpoint": "/api/v1/admin/exams/{id}/publish",
        "http_method": "PUT",
        "module": "app.routers.admin",
        "description": "Controls visibility of exam results to student and parent portals."
    },
    {
        "name": "student_get_marks",
        "display_name": "Student Published Marks",
        "category": "Marks & Exams",
        "endpoint": "/api/v1/student/marks",
        "http_method": "GET",
        "module": "app.routers.student",
        "description": "Retrieves report cards, subject breakdowns, and percentile rankings for student."
    },

    # Documents & Communication
    {
        "name": "admin_upload_pdf",
        "display_name": "PDF Material Upload",
        "category": "Documents",
        "endpoint": "/api/v1/admin/pdfs",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Performs magic byte validation (%PDF-) and stores educational material."
    },
    {
        "name": "admin_list_pdfs",
        "display_name": "List Educational Documents",
        "category": "Documents",
        "endpoint": "/api/v1/admin/pdfs",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Fetches and filters uploaded course notes, syllabi, circulars, and timetables."
    },
    {
        "name": "admin_list_notices",
        "display_name": "List School Notices",
        "category": "Communication",
        "endpoint": "/api/v1/admin/notices",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Fetches active and archived broadcast announcements by audience target."
    },
    {
        "name": "admin_create_notice",
        "display_name": "Publish Announcement Notice",
        "category": "Communication",
        "endpoint": "/api/v1/admin/notices",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Creates campus bulletin notices with priority levels (Normal, Important, Urgent)."
    },
    {
        "name": "admin_issue_warning",
        "display_name": "Issue Academic/Discipline Warning",
        "category": "Communication",
        "endpoint": "/api/v1/admin/warnings",
        "http_method": "POST",
        "module": "app.routers.admin",
        "description": "Issues formal attendance or conduct warning letters to student and parent accounts."
    },

    # Dashboards & Analytics
    {
        "name": "admin_get_dashboard",
        "display_name": "Admin Dashboard Aggregates",
        "category": "Analytics",
        "endpoint": "/api/v1/admin/dashboard",
        "http_method": "GET",
        "module": "app.routers.admin",
        "description": "Aggregates school-wide metrics, low-attendance alerts, and quick counts."
    },
    {
        "name": "student_get_dashboard",
        "display_name": "Student Dashboard Overview",
        "category": "Analytics",
        "endpoint": "/api/v1/student/dashboard",
        "http_method": "GET",
        "module": "app.routers.student",
        "description": "Fetches student personal attendance gauge, latest marks, and urgent notices."
    },
    {
        "name": "student_get_analytics",
        "display_name": "Student Recharts Analytics",
        "category": "Analytics",
        "endpoint": "/api/v1/student/analytics",
        "http_method": "GET",
        "module": "app.routers.student",
        "description": "Calculates trajectory trend lines and subject mark distributions for visualization."
    },
    {
        "name": "parent_get_dashboard",
        "display_name": "Parent Child Dashboard",
        "category": "Analytics",
        "endpoint": "/api/v1/parent/child/{id}/dashboard",
        "http_method": "GET",
        "module": "app.routers.parent",
        "description": "Aggregates overall metrics for selected child for family review."
    },

    # Function Tracking & System Operations
    {
        "name": "system_get_functions",
        "display_name": "System Functions Dashboard",
        "category": "System",
        "endpoint": "/api/v1/admin/functions",
        "http_method": "GET",
        "module": "app.routers.functions",
        "description": "Retrieves comprehensive analytics, catalog, and status of all system functions."
    },
    {
        "name": "system_get_function_logs",
        "display_name": "Real-time Execution Logs Stream",
        "category": "System",
        "endpoint": "/api/v1/admin/functions/logs",
        "http_method": "GET",
        "module": "app.routers.functions",
        "description": "Streams chronological log of all function executions, durations, users, and statuses."
    },
    {
        "name": "system_test_function",
        "display_name": "Execute Function Diagnostic Ping",
        "category": "System",
        "endpoint": "/api/v1/admin/functions/test/{id}",
        "http_method": "POST",
        "module": "app.routers.functions",
        "description": "Performs an on-demand diagnostic invocation and measures latency."
    },
    {
        "name": "system_clear_logs",
        "display_name": "Clear Execution Log History",
        "category": "System",
        "endpoint": "/api/v1/admin/functions/logs",
        "http_method": "DELETE",
        "module": "app.routers.functions",
        "description": "Purges historical function logs while preserving cumulative execution statistics."
    }
]


def seed_system_functions(db: Session) -> int:
    """Seeds the catalog of application functions into the database if not present."""
    count = 0
    for item in SYSTEM_FUNCTIONS_CATALOG:
        existing = db.execute(
            select(AppFunction).where(AppFunction.name == item["name"])
        ).scalar_one_or_none()

        if not existing:
            new_func = AppFunction(
                name=item["name"],
                display_name=item["display_name"],
                category=item["category"],
                endpoint=item["endpoint"],
                http_method=item["http_method"],
                module=item["module"],
                description=item["description"],
                total_executions=0,
                successful_executions=0,
                failed_executions=0,
                avg_latency_ms=0.0
            )
            db.add(new_func)
            count += 1
        else:
            # Update metadata if needed
            existing.display_name = item["display_name"]
            existing.category = item["category"]
            existing.endpoint = item["endpoint"]
            existing.http_method = item["http_method"]
            existing.module = item["module"]
            existing.description = item["description"]

    db.commit()
    return count


def match_function_by_path(path: str, method: str, db: Session) -> AppFunction | None:
    """Attempts to match an incoming HTTP path and method to a registered AppFunction."""
    # 1. Exact match on endpoint & method
    func_obj = db.execute(
        select(AppFunction).where(
            AppFunction.endpoint == path,
            AppFunction.http_method == method.upper()
        )
    ).scalar_one_or_none()

    if func_obj:
        return func_obj

    # 2. Match parameterized routes (e.g. /api/v1/admin/students/12 -> /api/v1/admin/students/{id})
    all_funcs = db.execute(select(AppFunction)).scalars().all()
    for f in all_funcs:
        if not f.endpoint or f.http_method != method.upper():
            continue
        pattern_parts = f.endpoint.strip("/").split("/")
        actual_parts = path.strip("/").split("/")
        if len(pattern_parts) == len(actual_parts):
            matched = True
            for p, a in zip(pattern_parts, actual_parts):
                if p.startswith("{") and p.endswith("}"):
                    continue
                if p != a:
                    matched = False
                    break
            if matched:
                return f

    return None


def record_function_execution(
    db: Session,
    endpoint: str,
    http_method: str,
    status_code: int,
    duration_ms: float,
    ip_address: str | None = None,
    user_id: int | None = None,
    user_role: str | None = None,
    user_identifier: str | None = None,
    error_message: str | None = None,
    explicit_func_name: str | None = None
) -> None:
    """Records an execution of a system function into the database and updates statistics."""
    try:
        is_success = status_code < 400
        now = dt.datetime.utcnow()

        # Find or create AppFunction record
        func_obj = None
        if explicit_func_name:
            func_obj = db.execute(
                select(AppFunction).where(AppFunction.name == explicit_func_name)
            ).scalar_one_or_none()

        if not func_obj:
            func_obj = match_function_by_path(endpoint, http_method, db)

        if not func_obj:
            # Dynamically register uncatalogued API endpoint
            clean_name = f"{http_method.lower()}_{endpoint.strip('/').replace('/', '_').replace('-', '_')}"
            func_obj = AppFunction(
                name=clean_name[:100],
                display_name=f"{http_method.upper()} {endpoint}",
                category="API",
                endpoint=endpoint,
                http_method=http_method.upper(),
                module="app.routers",
                description=f"Auto-registered API endpoint {http_method.upper()} {endpoint}",
                total_executions=0,
                successful_executions=0,
                failed_executions=0,
                avg_latency_ms=0.0
            )
            db.add(func_obj)
            db.flush()

        # Update stats
        prev_count = func_obj.total_executions
        func_obj.total_executions += 1
        if is_success:
            func_obj.successful_executions += 1
        else:
            func_obj.failed_executions += 1

        # Incremental average latency computation
        if prev_count == 0:
            func_obj.avg_latency_ms = round(duration_ms, 2)
        else:
            func_obj.avg_latency_ms = round(
                ((func_obj.avg_latency_ms * prev_count) + duration_ms) / func_obj.total_executions,
                2
            )

        func_obj.last_executed_at = now
        func_obj.last_execution_status = "SUCCESS" if is_success else "FAILED"

        # Create log entry
        log_entry = FunctionLog(
            function_id=func_obj.id,
            function_name=func_obj.name,
            endpoint=endpoint,
            http_method=http_method.upper(),
            user_id=user_id,
            user_role=user_role,
            user_identifier=user_identifier or "Anonymous",
            status_code=status_code,
            status="SUCCESS" if is_success else "FAILED",
            execution_duration_ms=round(duration_ms, 2),
            ip_address=ip_address,
            error_message=error_message,
            executed_at=now
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        # Non-blocking: Logging failure should never break user requests
        print(f"[FunctionTracker] Error logging execution: {e}")


def get_dashboard_summary(db: Session) -> dict[str, Any]:
    """Retrieves high-level summary metrics, breakdown, and all functions."""
    functions = db.execute(
        select(AppFunction).order_by(
            desc(AppFunction.total_executions),
            AppFunction.name.asc()
        )
    ).scalars().all()

    total_funcs = len(functions)
    total_execs = sum(f.total_executions for f in functions)
    total_success = sum(f.successful_executions for f in functions)
    total_failed = sum(f.failed_executions for f in functions)
    
    success_rate = (
        round((total_success / total_execs) * 100.0, 1) if total_execs > 0 else 100.0
    )

    weighted_latency_sum = sum(f.avg_latency_ms * f.total_executions for f in functions)
    overall_avg_latency = (
        round(weighted_latency_sum / total_execs, 2) if total_execs > 0 else 0.0
    )

    category_counts: dict[str, int] = {}
    for f in functions:
        category_counts[f.category] = category_counts.get(f.category, 0) + f.total_executions

    most_active = functions[0] if functions and functions[0].total_executions > 0 else None

    recent_logs = db.execute(
        select(FunctionLog).order_by(desc(FunctionLog.executed_at)).limit(50)
    ).scalars().all()

    return {
        "stats": {
            "total_functions": total_funcs,
            "total_executions": total_execs,
            "successful_executions": total_success,
            "failed_executions": total_failed,
            "success_rate": success_rate,
            "avg_latency_ms": overall_avg_latency,
            "category_counts": category_counts,
            "most_active_function": most_active
        },
        "functions": functions,
        "recent_logs": recent_logs
    }
