import datetime as dt
import math

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import require_role
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.academic import ClassModel, Subject
from app.models.attendance import Attendance, AttendanceAudit
from app.models.communication import Notice, PDFDocument, Warning
from app.models.marks import Exam, Mark
from app.models.parent import Parent
from app.models.student import Student
from app.models.user import User
from app.schemas.academic import (
    ClassCreate,
    ClassOut,
    ClassSubjectsUpdate,
    ClassUpdate,
    SubjectCreate,
    SubjectOut,
    SubjectUpdate,
)
from app.schemas.attendance import (
    AttendanceAuditOut,
    AttendanceBatchCreate,
    AttendanceOut,
    AttendanceUpdate,
)
from app.schemas.communication import (
    NoticeCreate,
    NoticeOut,
    NoticeUpdate,
    PDFDocumentOut,
    WarningCreate,
    WarningOut,
    WarningUpdate,
)
from app.schemas.marks import ExamCreate, ExamOut, ExamUpdate, MarkBatchCreate, MarkOut
from app.schemas.parent import ParentCreate, ParentOut, ParentUpdate
from app.schemas.response import ApiResponse, PaginatedData
from app.schemas.student import (
    StudentCreate,
    StudentDetailOut,
    StudentOut,
    StudentUpdate,
)
from app.services.marks_service import calculate_grade
from app.services.notification_service import (
    notify_attendance_event,
    notify_warning_issued,
)
from app.utils.csv_helper import export_to_csv, parse_students_csv
from app.utils.file_validator import validate_and_save_file, validate_and_save_pdf

router = APIRouter(prefix="/admin", tags=["Admin Module"], dependencies=[Depends(require_role("ADMIN"))])

# -------------------------------------------------------------
# DASHBOARD OVERVIEW
# -------------------------------------------------------------
@router.get("/dashboard", response_model=ApiResponse[dict])
def get_admin_dashboard(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    total_parents = db.query(Parent).count()
    total_classes = db.query(ClassModel).count()
    total_subjects = db.query(Subject).count()

    today = dt.date.today()
    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    today_total = len(today_records)
    today_present = sum(1 for a in today_records if a.status.lower() in ("present", "late"))
    today_pct = round((today_present / today_total * 100), 1) if today_total > 0 else 0.0

    # Low attendance count
    all_students = db.query(Student).filter(Student.status == "active").all()
    low_attendance_students = []
    for s in all_students:
        s_att = db.query(Attendance).filter(Attendance.student_id == s.id).all()
        if s_att:
            p_cnt = sum(1 for a in s_att if a.status.lower() in ("present", "late"))
            pct = round((p_cnt / len(s_att) * 100), 1)
            if pct < settings.MIN_ATTENDANCE_THRESHOLD:
                low_attendance_students.append({
                    "id": s.id,
                    "name": s.name,
                    "roll_no": s.roll_no,
                    "class_name": s.class_group.name if s.class_group else "-",
                    "percentage": pct,
                })

    recent_notices = db.query(Notice).order_by(Notice.created_at.desc()).limit(5).all()
    recent_warnings = db.query(Warning).order_by(Warning.created_at.desc()).limit(5).all()

    return ApiResponse(
        success=True,
        data={
            "total_students": total_students,
            "total_parents": total_parents,
            "total_classes": total_classes,
            "total_subjects": total_subjects,
            "today_attendance_percentage": today_pct,
            "today_records_count": today_total,
            "low_attendance_count": len(low_attendance_students),
            "low_attendance_students": low_attendance_students[:10],
            "recent_notices": [NoticeOut.model_validate(n) for n in recent_notices],
            "recent_warnings": [
                {
                    "id": w.id,
                    "student_name": w.student.name if w.student else "-",
                    "student_roll_no": w.student.roll_no if w.student else "-",
                    "type": w.type,
                    "severity": w.severity,
                    "message": w.message,
                    "status": w.status,
                    "created_at": w.created_at
                } for w in recent_warnings
            ]
        }
    )

# -------------------------------------------------------------
# ACADEMIC: CLASSES & SUBJECTS
# -------------------------------------------------------------
@router.get("/classes", response_model=ApiResponse[list[ClassOut]])
def list_classes(db: Session = Depends(get_db)):
    classes = db.query(ClassModel).order_by(ClassModel.name.asc()).all()
    return ApiResponse(success=True, data=[ClassOut.model_validate(c) for c in classes])

@router.post("/classes", response_model=ApiResponse[ClassOut])
def create_class(data: ClassCreate, db: Session = Depends(get_db)):
    existing = db.query(ClassModel).filter(ClassModel.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="A class with this name already exists")
    
    new_class = ClassModel(name=data.name, sections=data.sections)
    if data.subject_ids:
        subjects = db.query(Subject).filter(Subject.id.in_(data.subject_ids)).all()
        new_class.subjects = subjects
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return ApiResponse(success=True, message="Class created", data=ClassOut.model_validate(new_class))

@router.put("/classes/{class_id}", response_model=ApiResponse[ClassOut])
def update_class(class_id: int, data: ClassUpdate, db: Session = Depends(get_db)):
    c = db.query(ClassModel).filter(ClassModel.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    
    if data.name and data.name != c.name:
        existing = db.query(ClassModel).filter(ClassModel.name == data.name).first()
        if existing and existing.id != class_id:
            raise HTTPException(status_code=400, detail="Another class with this name already exists")
        c.name = data.name

    if data.sections is not None:
        c.sections = data.sections

    if data.subject_ids is not None:
        subjects = db.query(Subject).filter(Subject.id.in_(data.subject_ids)).all()
        c.subjects = subjects

    db.commit()
    db.refresh(c)
    return ApiResponse(success=True, message="Class updated", data=ClassOut.model_validate(c))

@router.put("/classes/{class_id}/subjects", response_model=ApiResponse[ClassOut])
def update_class_subjects(class_id: int, data: ClassSubjectsUpdate, db: Session = Depends(get_db)):
    c = db.query(ClassModel).filter(ClassModel.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    
    subjects = db.query(Subject).filter(Subject.id.in_(data.subject_ids)).all()
    c.subjects = subjects
    db.commit()
    db.refresh(c)
    return ApiResponse(success=True, message=f"Updated subjects for {c.name}", data=ClassOut.model_validate(c))

@router.delete("/classes/{class_id}", response_model=ApiResponse[dict])
def delete_class(class_id: int, db: Session = Depends(get_db)):
    c = db.query(ClassModel).filter(ClassModel.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Check if students are assigned to this class
    student_count = db.query(Student).filter(Student.class_id == class_id).count()
    if student_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete class '{c.name}' because {student_count} student(s) are enrolled in it."
        )

    db.delete(c)
    db.commit()
    return ApiResponse(success=True, message=f"Class '{c.name}' deleted successfully", data={"deleted_id": class_id})

@router.get("/subjects", response_model=ApiResponse[list[SubjectOut]])
def list_subjects(class_id: int | None = None, db: Session = Depends(get_db)):
    if class_id:
        c = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Class not found")
        return ApiResponse(success=True, data=[SubjectOut.model_validate(s) for s in c.subjects])

    subjects = db.query(Subject).order_by(Subject.code.asc()).all()
    return ApiResponse(success=True, data=[SubjectOut.model_validate(s) for s in subjects])

@router.post("/subjects", response_model=ApiResponse[SubjectOut])
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Subject).filter(Subject.code == data.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A subject with this code already exists")
    
    new_subject = Subject(name=data.name.strip(), code=data.code.strip().upper())
    if data.class_ids:
        classes = db.query(ClassModel).filter(ClassModel.id.in_(data.class_ids)).all()
        new_subject.classes = classes

    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return ApiResponse(success=True, message="Subject created", data=SubjectOut.model_validate(new_subject))

@router.put("/subjects/{subject_id}", response_model=ApiResponse[SubjectOut])
def update_subject(subject_id: int, data: SubjectUpdate, db: Session = Depends(get_db)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")

    if data.name:
        s.name = data.name.strip()
    if data.code:
        code_upper = data.code.strip().upper()
        if code_upper != s.code:
            existing = db.query(Subject).filter(Subject.code == code_upper).first()
            if existing and existing.id != subject_id:
                raise HTTPException(status_code=400, detail="Another subject with this code already exists")
            s.code = code_upper

    if data.class_ids is not None:
        classes = db.query(ClassModel).filter(ClassModel.id.in_(data.class_ids)).all()
        s.classes = classes

    db.commit()
    db.refresh(s)
    return ApiResponse(success=True, message="Subject updated", data=SubjectOut.model_validate(s))

@router.delete("/subjects/{subject_id}", response_model=ApiResponse[dict])
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Check if attendance or marks exist for this subject
    att_count = db.query(Attendance).filter(Attendance.subject_id == subject_id).count()
    mark_count = db.query(Mark).filter(Mark.subject_id == subject_id).count()
    if att_count > 0 or mark_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete subject '{s.name}' because it has {att_count} attendance records and {mark_count} mark records."
        )

    db.delete(s)
    db.commit()
    return ApiResponse(success=True, message=f"Subject '{s.name}' deleted successfully", data={"deleted_id": subject_id})

# -------------------------------------------------------------
# STUDENT MANAGEMENT
# -------------------------------------------------------------
@router.get("/students", response_model=ApiResponse[PaginatedData[StudentOut]])
def list_students(
    search: str | None = None,
    class_id: int | None = None,
    section: str | None = None,
    status_filter: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = "name",
    sort_order: str = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(Student).join(User, Student.user_id == User.id)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Student.name.ilike(term),
                Student.roll_no.ilike(term),
                User.email.ilike(term)
            )
        )
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if section:
        query = query.filter(Student.section.ilike(section))
    if status_filter:
        query = query.filter(Student.status == status_filter)

    total = query.count()

    # Sorting
    sort_column = getattr(Student, sort_by, Student.name)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    students = query.offset((page - 1) * page_size).limit(page_size).all()
    
    items = []
    for s in students:
        items.append(StudentOut(
            id=s.id,
            user_id=s.user_id,
            email=s.user.email,
            name=s.name,
            roll_no=s.roll_no,
            class_id=s.class_id,
            class_name=s.class_group.name if s.class_group else None,
            section=s.section,
            dob=s.dob,
            gender=s.gender,
            phone=s.phone,
            address=s.address,
            photo_path=s.photo_path,
            status=s.status,
            parent_count=len(s.parents),
            created_at=s.created_at
        ))

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return ApiResponse(
        success=True,
        data=PaginatedData(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )

@router.post("/students", response_model=ApiResponse[StudentOut])
def add_student(data: StudentCreate, db: Session = Depends(get_db)):
    # Check email uniqueness
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    # Check roll_no uniqueness
    if db.query(Student).filter(Student.roll_no == data.roll_no).first():
        raise HTTPException(status_code=400, detail="A student with this roll number already exists")

    # Auto-generate credentials
    initial_pwd = data.password or f"{data.roll_no}@Pass123"
    new_user = User(
        email=data.email,
        password_hash=get_password_hash(initial_pwd),
        role="STUDENT",
        must_change_password=True,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    new_student = Student(
        user_id=new_user.id,
        roll_no=data.roll_no,
        name=data.name,
        class_id=data.class_id,
        section=data.section,
        dob=data.dob,
        gender=data.gender,
        phone=data.phone,
        address=data.address,
        photo_path=data.photo_path,
        status=data.status
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return ApiResponse(
        success=True,
        message=f"Student registered. Initial password: {initial_pwd}",
        data=StudentOut(
            id=new_student.id,
            user_id=new_student.user_id,
            email=new_user.email,
            name=new_student.name,
            roll_no=new_student.roll_no,
            class_id=new_student.class_id,
            class_name=new_student.class_group.name if new_student.class_group else None,
            section=new_student.section,
            dob=new_student.dob,
            gender=new_student.gender,
            phone=new_student.phone,
            address=new_student.address,
            photo_path=new_student.photo_path,
            status=new_student.status,
            parent_count=0,
            created_at=new_student.created_at
        )
    )

@router.get("/students/{student_id}", response_model=ApiResponse[StudentDetailOut])
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    parents_summary = []
    for p in student.parents:
        parents_summary.append({
            "id": p.id,
            "name": p.name,
            "email": p.user.email,
            "phone": p.phone,
            "relation": p.relation
        })

    return ApiResponse(
        success=True,
        data=StudentDetailOut(
            id=student.id,
            user_id=student.user_id,
            email=student.user.email,
            name=student.name,
            roll_no=student.roll_no,
            class_id=student.class_id,
            class_name=student.class_group.name if student.class_group else None,
            section=student.section,
            dob=student.dob,
            gender=student.gender,
            phone=student.phone,
            address=student.address,
            photo_path=student.photo_path,
            status=student.status,
            parent_count=len(parents_summary),
            created_at=student.created_at,
            parents=parents_summary
        )
    )

@router.put("/students/{student_id}", response_model=ApiResponse)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_dict = data.model_dump(exclude_unset=True)
    if "email" in update_dict:
        new_email = update_dict.pop("email")
        if new_email and new_email != student.user.email:
            existing = db.query(User).filter(User.email == new_email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already taken")
            student.user.email = new_email

    for key, value in update_dict.items():
        setattr(student, key, value)

    db.commit()
    return ApiResponse(success=True, message="Student updated successfully")

@router.delete("/students/{student_id}", response_model=ApiResponse)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    user = student.user
    db.delete(user)  # Cascades to student
    db.commit()
    return ApiResponse(success=True, message="Student and associated user account deleted")

@router.post("/students/bulk-import", response_model=ApiResponse[dict])
async def bulk_import_students(file: UploadFile = File(...), class_id: int | None = Form(None), db: Session = Depends(get_db)):
    content = await file.read()
    records = parse_students_csv(content)

    success_count = 0
    errors = []

    for idx, rec in enumerate(records, start=2):
        if db.query(User).filter(User.email == rec["email"]).first():
            errors.append(f"Row {idx}: Email '{rec['email']}' already exists")
            continue
        if db.query(Student).filter(Student.roll_no == rec["roll_no"]).first():
            errors.append(f"Row {idx}: Roll No '{rec['roll_no']}' already exists")
            continue

        init_pwd = f"{rec['roll_no']}@Pass123"
        user = User(
            email=rec["email"],
            password_hash=get_password_hash(init_pwd),
            role="STUDENT",
            must_change_password=True,
            is_active=True
        )
        db.add(user)
        db.flush()

        student = Student(
            user_id=user.id,
            roll_no=rec["roll_no"],
            name=rec["name"],
            class_id=class_id,
            section=rec["section"],
            gender=rec["gender"],
            phone=rec["phone"],
            address=rec["address"],
            status=rec["status"]
        )
        db.add(student)
        success_count += 1

    db.commit()
    return ApiResponse(
        success=True,
        message=f"Import completed: {success_count} students added, {len(errors)} skipped.",
        data={"added": success_count, "skipped": len(errors), "errors": errors}
    )

@router.get("/students-export/csv")
def export_students_csv(class_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    students = query.all()

    data = [
        {
            "roll_no": s.roll_no,
            "name": s.name,
            "email": s.user.email,
            "class": s.class_group.name if s.class_group else "",
            "section": s.section,
            "phone": s.phone or "",
            "gender": s.gender or "",
            "status": s.status,
            "created_at": s.created_at.strftime("%Y-%m-%d")
        } for s in students
    ]
    csv_str = export_to_csv(data)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_export.csv"}
    )

# -------------------------------------------------------------
# PARENT MANAGEMENT
# -------------------------------------------------------------
@router.get("/parents", response_model=ApiResponse[list[ParentOut]])
def list_parents(search: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Parent).join(User, Parent.user_id == User.id)
    if search:
        term = f"%{search}%"
        query = query.filter(or_(Parent.name.ilike(term), User.email.ilike(term), Parent.phone.ilike(term)))
    parents = query.all()

    result = []
    for p in parents:
        stud_summaries = [
            {
                "id": s.id,
                "roll_no": s.roll_no,
                "name": s.name,
                "class_id": s.class_id,
                "class_name": s.class_group.name if s.class_group else None,
                "section": s.section
            } for s in p.students
        ]
        result.append(ParentOut(
            id=p.id,
            user_id=p.user_id,
            email=p.user.email,
            name=p.name,
            phone=p.phone,
            relation=p.relation,
            students=stud_summaries,
            created_at=p.created_at
        ))
    return ApiResponse(success=True, data=result)

@router.post("/parents", response_model=ApiResponse[ParentOut])
def add_parent(data: ParentCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    init_pwd = data.password or f"Parent@{dt.datetime.utcnow().strftime('%y%m')}!"
    user = User(
        email=data.email,
        password_hash=get_password_hash(init_pwd),
        role="PARENT",
        must_change_password=True,
        is_active=True
    )
    db.add(user)
    db.flush()

    new_parent = Parent(
        user_id=user.id,
        name=data.name,
        phone=data.phone,
        relation=data.relation
    )
    if data.student_ids:
        linked_students = db.query(Student).filter(Student.id.in_(data.student_ids)).all()
        new_parent.students = linked_students

    db.add(new_parent)
    db.commit()
    db.refresh(new_parent)

    return ApiResponse(
        success=True,
        message=f"Parent registered. Temporary password: {init_pwd}",
        data=ParentOut(
            id=new_parent.id,
            user_id=new_parent.user_id,
            email=user.email,
            name=new_parent.name,
            phone=new_parent.phone,
            relation=new_parent.relation,
            students=[
                {
                    "id": s.id,
                    "roll_no": s.roll_no,
                    "name": s.name,
                    "class_id": s.class_id,
                    "class_name": s.class_group.name if s.class_group else None,
                    "section": s.section
                } for s in new_parent.students
            ],
            created_at=new_parent.created_at
        )
    )

@router.put("/parents/{parent_id}", response_model=ApiResponse)
def update_parent(parent_id: int, data: ParentUpdate, db: Session = Depends(get_db)):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    if data.name is not None:
        parent.name = data.name
    if data.phone is not None:
        parent.phone = data.phone
    if data.relation is not None:
        parent.relation = data.relation
    if data.email is not None and data.email != parent.user.email:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already taken")
        parent.user.email = data.email
    if data.student_ids is not None:
        linked = db.query(Student).filter(Student.id.in_(data.student_ids)).all()
        parent.students = linked

    db.commit()
    return ApiResponse(success=True, message="Parent updated successfully")

@router.delete("/parents/{parent_id}", response_model=ApiResponse)
def delete_parent(parent_id: int, db: Session = Depends(get_db)):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    user = parent.user
    db.delete(user)
    db.commit()
    return ApiResponse(success=True, message="Parent deleted successfully")

# -------------------------------------------------------------
# ATTENDANCE MANAGEMENT
# -------------------------------------------------------------
@router.get("/attendance", response_model=ApiResponse[list[AttendanceOut]])
def list_attendance(
    class_id: int | None = None,
    subject_id: int | None = None,
    date_val: dt.date | None = None,
    student_id: int | None = None,
    time_slot: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Attendance)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if date_val:
        query = query.filter(Attendance.date == date_val)
    if time_slot:
        query = query.filter(Attendance.time_slot == time_slot)
    if class_id:
        query = query.join(Student).filter(Student.class_id == class_id)

    attendances = query.order_by(Attendance.date.desc(), Attendance.id.desc()).all()
    results = []
    for a in attendances:
        results.append(AttendanceOut(
            id=a.id,
            student_id=a.student_id,
            student_name=a.student.name if a.student else None,
            student_roll_no=a.student.roll_no if a.student else None,
            subject_id=a.subject_id,
            subject_name=a.subject.name if a.subject else None,
            subject_code=a.subject.code if a.subject else None,
            date=a.date,
            status=a.status,
            time_slot=a.time_slot,
            marked_by=a.marked_by,
            created_at=a.created_at,
            updated_at=a.updated_at
        ))
    return ApiResponse(success=True, data=results)

@router.get("/attendance/export/csv")
def export_attendance_csv(
    class_id: int | None = None,
    subject_id: int | None = None,
    date_val: dt.date | None = None,
    time_slot: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Attendance)
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if date_val:
        query = query.filter(Attendance.date == date_val)
    if time_slot:
        query = query.filter(Attendance.time_slot == time_slot)
    if class_id:
        query = query.join(Student).filter(Student.class_id == class_id)

    attendances = query.order_by(Attendance.date.desc(), Attendance.id.desc()).all()

    data = [
        {
            "date": str(a.date),
            "roll_no": a.student.roll_no if a.student else "",
            "student_name": a.student.name if a.student else "",
            "class": a.student.class_group.name if (a.student and a.student.class_group) else "",
            "section": a.student.section if a.student else "",
            "subject": a.subject.name if a.subject else "",
            "subject_code": a.subject.code if a.subject else "",
            "status": a.status,
            "time_slot": a.time_slot or "N/A",
            "marked_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else ""
        } for a in attendances
    ]
    csv_str = export_to_csv(data)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_export.csv"}
    )

@router.post("/attendance/batch", response_model=ApiResponse)
def mark_attendance_batch(
    data: AttendanceBatchCreate,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    saved_count = 0
    updated_count = 0

    for item in data.records:
        slot = item.time_slot or data.time_slot
        existing = db.query(Attendance).filter(
            Attendance.student_id == item.student_id,
            Attendance.subject_id == data.subject_id,
            Attendance.date == data.date
        ).first()

        if existing:
            status_changed = existing.status != item.status
            time_changed = slot is not None and existing.time_slot != slot
            if status_changed or time_changed:
                if status_changed:
                    # Create audit record
                    audit = AttendanceAudit(
                        attendance_id=existing.id,
                        changed_by=current_admin.id,
                        old_status=existing.status,
                        new_status=item.status
                    )
                    db.add(audit)
                    existing.status = item.status
                if slot:
                    existing.time_slot = slot
                existing.updated_at = dt.datetime.utcnow()
                updated_count += 1
        else:
            new_att = Attendance(
                student_id=item.student_id,
                subject_id=data.subject_id,
                date=data.date,
                status=item.status,
                time_slot=slot,
                marked_by=current_admin.id
            )
            db.add(new_att)
            saved_count += 1

        # Background task for alert if absent
        if item.status.lower() == "absent":
            background_tasks.add_task(
                notify_attendance_event,
                db,
                item.student_id,
                subject.name,
                str(data.date),
                item.status
            )

    db.commit()
    return ApiResponse(
        success=True,
        message=f"Attendance saved: {saved_count} new entries, {updated_count} updated entries."
    )

@router.put("/attendance/{attendance_id}", response_model=ApiResponse)
def update_single_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    att = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    status_changed = att.status != data.status
    if status_changed:
        audit = AttendanceAudit(
            attendance_id=att.id,
            changed_by=current_admin.id,
            old_status=att.status,
            new_status=data.status
        )
        db.add(audit)
        att.status = data.status

    if data.time_slot:
        att.time_slot = data.time_slot
    att.updated_at = dt.datetime.utcnow()
    db.commit()

    return ApiResponse(success=True, message="Attendance updated with time and audit log")

@router.get("/attendance/{attendance_id}/audits", response_model=ApiResponse[list[AttendanceAuditOut]])
def get_attendance_audits(attendance_id: int, db: Session = Depends(get_db)):
    audits = db.query(AttendanceAudit).filter(AttendanceAudit.attendance_id == attendance_id).order_by(AttendanceAudit.changed_at.desc()).all()
    results = []
    for a in audits:
        user = db.query(User).filter(User.id == a.changed_by).first() if a.changed_by else None
        results.append(AttendanceAuditOut(
            id=a.id,
            attendance_id=a.attendance_id,
            changed_by=a.changed_by,
            changed_by_name=user.email if user else "Admin",
            old_status=a.old_status,
            new_status=a.new_status,
            changed_at=a.changed_at
        ))
    return ApiResponse(success=True, data=results)

@router.get("/attendance/export/csv")
def export_attendance_csv(
    class_id: int | None = None,
    subject_id: int | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Attendance).join(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    records = query.order_by(Attendance.date.desc()).all()
    data = [
        {
            "date": str(r.date),
            "roll_no": r.student.roll_no if r.student else "",
            "student_name": r.student.name if r.student else "",
            "subject": r.subject.name if r.subject else "",
            "status": r.status,
        } for r in records
    ]
    csv_str = export_to_csv(data)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_report.csv"}
    )

# -------------------------------------------------------------
# MARKS MANAGEMENT
# -------------------------------------------------------------
@router.get("/exams", response_model=ApiResponse[list[ExamOut]])
def list_exams(class_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Exam)
    if class_id:
        query = query.filter(Exam.class_id == class_id)
    exams = query.order_by(Exam.created_at.desc()).all()
    results = [
        ExamOut(
            id=e.id,
            name=e.name,
            exam_type=e.exam_type,
            class_id=e.class_id,
            class_name=e.class_group.name if e.class_group else None,
            date=e.date,
            is_published=e.is_published,
            created_at=e.created_at
        ) for e in exams
    ]
    return ApiResponse(success=True, data=results)

@router.post("/exams", response_model=ApiResponse[ExamOut])
def create_exam(data: ExamCreate, db: Session = Depends(get_db)):
    new_exam = Exam(
        name=data.name,
        exam_type=data.exam_type,
        class_id=data.class_id,
        date=data.date,
        is_published=data.is_published
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return ApiResponse(
        success=True,
        message="Exam created successfully",
        data=ExamOut(
            id=new_exam.id,
            name=new_exam.name,
            exam_type=new_exam.exam_type,
            class_id=new_exam.class_id,
            class_name=new_exam.class_group.name if new_exam.class_group else None,
            date=new_exam.date,
            is_published=new_exam.is_published,
            created_at=new_exam.created_at
        )
    )

@router.put("/exams/{exam_id}", response_model=ApiResponse)
def update_exam(exam_id: int, data: ExamUpdate, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(exam, k, v)
        if k == "is_published":
            # Also update mark published status
            for m in exam.marks:
                m.published = v

    db.commit()
    return ApiResponse(success=True, message="Exam updated successfully")

@router.delete("/exams/{exam_id}", response_model=ApiResponse)
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.delete(exam)
    db.commit()
    return ApiResponse(success=True, message="Exam deleted successfully")

@router.get("/marks", response_model=ApiResponse[list[MarkOut]])
def list_marks(
    exam_id: int | None = None,
    subject_id: int | None = None,
    student_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Mark)
    if exam_id:
        query = query.filter(Mark.exam_id == exam_id)
    if subject_id:
        query = query.filter(Mark.subject_id == subject_id)
    if student_id:
        query = query.filter(Mark.student_id == student_id)

    marks = query.all()
    results = []
    for m in marks:
        pct = round((m.marks_obtained / m.max_marks * 100), 1) if m.max_marks > 0 else 0.0
        grd, passed = calculate_grade(pct)
        results.append(MarkOut(
            id=m.id,
            student_id=m.student_id,
            student_name=m.student.name if m.student else None,
            student_roll_no=m.student.roll_no if m.student else None,
            exam_id=m.exam_id,
            exam_name=m.exam.name if m.exam else None,
            subject_id=m.subject_id,
            subject_name=m.subject.name if m.subject else None,
            marks_obtained=m.marks_obtained,
            max_marks=m.max_marks,
            percentage=pct,
            grade=grd,
            passed=passed,
            published=m.published
        ))
    return ApiResponse(success=True, data=results)

@router.post("/marks/batch", response_model=ApiResponse)
def save_marks_batch(data: MarkBatchCreate, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == data.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    saved = 0
    for entry in data.entries:
        existing = db.query(Mark).filter(
            Mark.student_id == entry.student_id,
            Mark.exam_id == data.exam_id,
            Mark.subject_id == entry.subject_id
        ).first()

        if existing:
            existing.marks_obtained = entry.marks_obtained
            existing.max_marks = entry.max_marks or data.max_marks
            existing.published = exam.is_published
        else:
            new_mark = Mark(
                student_id=entry.student_id,
                exam_id=data.exam_id,
                subject_id=entry.subject_id,
                marks_obtained=entry.marks_obtained,
                max_marks=entry.max_marks or data.max_marks,
                published=exam.is_published
            )
            db.add(new_mark)
        saved += 1

    db.commit()
    return ApiResponse(success=True, message=f"Marks saved for {saved} entries.")

# -------------------------------------------------------------
# NOTICE MANAGEMENT
# -------------------------------------------------------------
@router.get("/notices", response_model=ApiResponse[list[NoticeOut]])
def list_admin_notices(db: Session = Depends(get_db)):
    notices = db.query(Notice).order_by(Notice.created_at.desc()).all()
    return ApiResponse(success=True, data=[NoticeOut.model_validate(n) for n in notices])

@router.post("/notices", response_model=ApiResponse[NoticeOut])
def create_admin_notice(
    data: NoticeCreate,
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    notice = Notice(
        title=data.title,
        description=data.description,
        priority=data.priority,
        target_audience=data.target_audience,
        class_id=data.class_id,
        publish_date=data.publish_date,
        expiry_date=data.expiry_date,
        created_by=current_admin.id
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return ApiResponse(success=True, message="Notice published", data=NoticeOut.model_validate(notice))

@router.put("/notices/{notice_id}", response_model=ApiResponse)
def update_admin_notice(notice_id: int, data: NoticeUpdate, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(notice, k, v)
    db.commit()
    return ApiResponse(success=True, message="Notice updated successfully")

@router.delete("/notices/{notice_id}", response_model=ApiResponse)
def delete_admin_notice(notice_id: int, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
    return ApiResponse(success=True, message="Notice deleted successfully")

# -------------------------------------------------------------
# PDF MANAGEMENT
# -------------------------------------------------------------
@router.get("/documents", response_model=ApiResponse[list[PDFDocumentOut]])
def list_admin_documents(db: Session = Depends(get_db)):
    docs = db.query(PDFDocument).order_by(PDFDocument.created_at.desc()).all()
    results = []
    for d in docs:
        results.append(PDFDocumentOut(
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
        ))
    return ApiResponse(success=True, data=results)

@router.post("/documents/upload", response_model=ApiResponse[PDFDocumentOut])
def upload_admin_document(
    title: str = Form(...),
    category: str = Form("Notes"),
    class_id: int | None = Form(None),
    subject_id: int | None = Form(None),
    file: UploadFile = File(...),
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    rel_path, file_size, mime_type, orig_name = validate_and_save_file(file, subfolder="materials")

    doc = PDFDocument(
        title=title or orig_name,
        file_path=rel_path,
        file_size=file_size,
        mime_type=mime_type,
        category=category,
        class_id=class_id,
        subject_id=subject_id,
        download_count=0,
        uploaded_by=current_admin.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return ApiResponse(
        success=True,
        message="Document uploaded successfully",
        data=PDFDocumentOut(
            id=doc.id,
            title=doc.title,
            file_path=doc.file_path,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            category=doc.category,
            class_id=doc.class_id,
            subject_id=doc.subject_id,
            class_name=doc.target_class.name if doc.target_class else None,
            subject_name=doc.subject.name if doc.subject else None,
            download_count=doc.download_count,
            uploaded_by=doc.uploaded_by,
            created_at=doc.created_at
        )
    )

@router.post("/documents/upload-batch", response_model=ApiResponse[list[PDFDocumentOut]])
def upload_admin_documents_batch(
    files: list[UploadFile] = File(...),
    folder_name: str | None = Form(None),
    category: str = Form("Notes"),
    class_id: int | None = Form(None),
    subject_id: int | None = Form(None),
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for upload")

    created_docs = []
    for file in files:
        if not file.filename:
            continue
        rel_path, file_size, mime_type, orig_name = validate_and_save_file(file, subfolder="materials")
        doc_title = f"[{folder_name}] {orig_name}" if folder_name else orig_name
        doc = PDFDocument(
            title=doc_title,
            file_path=rel_path,
            file_size=file_size,
            mime_type=mime_type,
            category=category,
            class_id=class_id,
            subject_id=subject_id,
            download_count=0,
            uploaded_by=current_admin.id
        )
        db.add(doc)
        created_docs.append(doc)

    db.commit()
    for doc in created_docs:
        db.refresh(doc)

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
        )
        for d in created_docs
    ]

    return ApiResponse(
        success=True,
        message=f"Successfully uploaded {len(results)} document(s)",
        data=results
    )

@router.delete("/documents/{doc_id}", response_model=ApiResponse)
def delete_admin_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return ApiResponse(success=True, message="Document deleted successfully")

# -------------------------------------------------------------
# WARNING MANAGEMENT
# -------------------------------------------------------------
@router.get("/warnings", response_model=ApiResponse[list[WarningOut]])
def list_admin_warnings(db: Session = Depends(get_db)):
    warnings = db.query(Warning).order_by(Warning.created_at.desc()).all()
    results = [
        WarningOut(
            id=w.id,
            student_id=w.student_id,
            student_name=w.student.name if w.student else None,
            student_roll_no=w.student.roll_no if w.student else None,
            type=w.type,
            severity=w.severity,
            message=w.message,
            status=w.status,
            issued_by=w.issued_by,
            created_at=w.created_at
        ) for w in warnings
    ]
    return ApiResponse(success=True, data=results)

@router.post("/warnings", response_model=ApiResponse[WarningOut])
def issue_warning(
    data: WarningCreate,
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    new_warning = Warning(
        student_id=data.student_id,
        type=data.type,
        severity=data.severity,
        message=data.message,
        status="sent",
        issued_by=current_admin.id
    )
    db.add(new_warning)
    db.commit()
    db.refresh(new_warning)

    # Dispatches notifications to student and linked parents
    notify_warning_issued(db, new_warning)

    return ApiResponse(
        success=True,
        message="Warning issued and notification dispatched.",
        data=WarningOut(
            id=new_warning.id,
            student_id=new_warning.student_id,
            student_name=student.name,
            student_roll_no=student.roll_no,
            type=new_warning.type,
            severity=new_warning.severity,
            message=new_warning.message,
            status=new_warning.status,
            issued_by=new_warning.issued_by,
            created_at=new_warning.created_at
        )
    )

@router.put("/warnings/{warning_id}", response_model=ApiResponse)
def update_warning_status(warning_id: int, data: WarningUpdate, db: Session = Depends(get_db)):
    w = db.query(Warning).filter(Warning.id == warning_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Warning not found")
    w.status = data.status
    db.commit()
    return ApiResponse(success=True, message=f"Warning status updated to '{data.status}'")
