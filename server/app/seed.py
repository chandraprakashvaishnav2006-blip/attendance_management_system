import datetime as dt
import os
import random
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.academic import ClassModel, Subject
from app.models.attendance import Attendance
from app.models.communication import Notice, Notification, PDFDocument, Warning
from app.models.marks import Exam, Mark
from app.models.parent import Parent
from app.models.student import Student
from app.models.user import User


def run_seed():
    db = SessionLocal()
    print("[+] Starting database seed script...")

    # 1. Admin account
    admin_email = "admin@sms.com"
    admin_pwd = "Admin@12345"
    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        admin_user = User(
            email=admin_email,
            password_hash=get_password_hash(admin_pwd),
            role="ADMIN",
            must_change_password=False,
            is_active=True
        )
        db.add(admin_user)
        db.flush()
        print(f"[OK] Admin created: {admin_email} / {admin_pwd}")
    else:
        admin_user.password_hash = get_password_hash(admin_pwd)
        admin_user.failed_attempts = 0
        admin_user.lock_until = None
        db.flush()
        print(f"[INFO] Admin updated: {admin_email}")

    # 2. Classes and Distinct Semester Curriculums
    semester_curriculums = [
        # Semester 1
        ("B.Tech - Semester 1", "A,B", [
            ("Engineering Mathematics I", "MATH101"),
            ("Applied Physics", "PHY101"),
            ("Programming in C", "CS101"),
            ("Basic Electrical Engineering", "EE101"),
            ("Engineering Graphics & Design", "ME101"),
        ]),
        # Semester 2
        ("B.Tech - Semester 2", "A,B", [
            ("Engineering Mathematics II", "MATH102"),
            ("Applied Chemistry", "CH102"),
            ("Data Structures & Algorithms", "CS102"),
            ("Digital Electronics", "EC102"),
            ("Environmental Science", "EVS102"),
        ]),
        # Semester 3
        ("B.Tech - Semester 3", "A,B", [
            ("Discrete Mathematics", "MATH201"),
            ("Database Systems", "CS301"),
            ("Computer Organization & Architecture", "CS203"),
            ("Object Oriented Programming with Java", "CS201"),
            ("Data Communication", "CS202"),
        ]),
        # Semester 4
        ("B.Tech - Semester 4", "A,B", [
            ("Operating Systems", "CS302"),
            ("Computer Networks", "CS303"),
            ("Design & Analysis of Algorithms", "CS204"),
            ("Theory of Computation", "CS205"),
            ("Software Engineering", "CS304"),
        ]),
        # Semester 5
        ("B.Tech - Semester 5", "A,B", [
            ("Web Technologies & Frameworks", "CS305"),
            ("Artificial Intelligence", "AI301"),
            ("Cyber Security & Cryptography", "CS306"),
            ("Microprocessors & Embedded Systems", "CS307"),
            ("Cloud Computing Concepts", "CS308"),
        ]),
        # Semester 6
        ("B.Tech - Semester 6", "A,B", [
            ("Machine Learning Techniques", "AI302"),
            ("Compiler Design", "CS309"),
            ("Mobile Application Development", "CS310"),
            ("Distributed Systems", "CS311"),
            ("Big Data Technologies", "CS312"),
        ]),
        # Semester 7
        ("B.Tech - Semester 7", "A,B", [
            ("Deep Learning Architectures", "AI401"),
            ("Internet of Things", "IoT401"),
            ("Blockchain Technologies", "CS402"),
            ("DevOps & CI/CD Pipelines", "CS403"),
            ("Major Project Phase I", "PROJ401"),
        ]),
        # Semester 8
        ("B.Tech - Semester 8", "A,B", [
            ("Natural Language Processing", "AI402"),
            ("Cloud Native Microservices", "CS404"),
            ("High Performance Computing", "CS405"),
            ("Capstone Industry Internship", "PROJ402"),
        ]),
    ]

    created_classes = []
    all_seeded_subjects = {}

    for c_name, sections, subj_tuples in semester_curriculums:
        c = db.query(ClassModel).filter(ClassModel.name == c_name).first()
        if not c:
            c = ClassModel(name=c_name, sections=sections)
            db.add(c)
            db.flush()
        else:
            c.sections = sections

        # Create or fetch subjects for this semester
        sem_subjects = []
        for s_name, s_code in subj_tuples:
            if s_code not in all_seeded_subjects:
                s = db.query(Subject).filter(Subject.code == s_code).first()
                if not s:
                    s = Subject(name=s_name, code=s_code)
                    db.add(s)
                    db.flush()
                else:
                    s.name = s_name
                all_seeded_subjects[s_code] = s
            sem_subjects.append(all_seeded_subjects[s_code])

        # Assign unique subjects to this semester
        c.subjects = sem_subjects
        db.flush()
        created_classes.append(c)

    # All created subjects list for reference
    created_subjects = list(all_seeded_subjects.values())

    # 4. Students (20 students)
    student_names = [
        "Aarav Sharma", "Diya Patel", "Ethan Hunt", "Sophia Martinez",
        "Liam Johnson", "Maya Sen", "Noah Davis", "Emma Wilson",
        "Rohan Gupta", "Olivia Brown", "Arjun Reddy", "Mia Taylor",
        "Lucas Anderson", "Ananya Verma", "Jackson Thomas", "Isabella Jackson",
        "Kabir Joshi", "Harper White", "Zara Khan", "Alexander Harris"
    ]

    default_student_pwd = "Student@12345"
    created_students = []
    primary_class = created_classes[0]

    for idx, name in enumerate(student_names, start=1):
        roll_no = f"CS{202400 + idx}"
        email = f"student{idx}@sms.com"

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=get_password_hash(default_student_pwd),
                role="STUDENT",
                must_change_password=False,
                is_active=True
            )
            db.add(user)
            db.flush()
        else:
            user.password_hash = get_password_hash(default_student_pwd)
            user.failed_attempts = 0
            user.lock_until = None
            db.flush()

        student = db.query(Student).filter(Student.roll_no == roll_no).first()
        if not student:
            section = "A" if idx <= 10 else "B"
            student = Student(
                user_id=user.id,
                roll_no=roll_no,
                name=name,
                class_id=primary_class.id,
                section=section,
                gender="Male" if idx % 2 != 0 else "Female",
                phone=f"+1 555-01{idx:02d}",
                address=f"{100 + idx} Innovation Way, Tech Campus",
                status="active"
            )
            db.add(student)
            db.flush()
        created_students.append(student)

    # 5. Parents (15 parents linked to students)
    parent_names = [
        ("Rajesh Sharma", "Father"), ("Sunita Patel", "Mother"), ("William Hunt", "Father"),
        ("Maria Martinez", "Mother"), ("Robert Johnson", "Father"), ("Pooja Sen", "Mother"),
        ("David Davis", "Father"), ("Jennifer Wilson", "Mother"), ("Alok Gupta", "Father"),
        ("Elizabeth Brown", "Mother"), ("Venkat Reddy", "Father"), ("Helen Taylor", "Mother"),
        ("Richard Anderson", "Father"), ("Sanjay Verma", "Father"), ("Mary Thomas", "Mother")
    ]

    default_parent_pwd = "Parent@12345"
    created_parents = []

    for idx, (p_name, relation) in enumerate(parent_names, start=1):
        p_email = f"parent{idx}@sms.com"
        p_user = db.query(User).filter(User.email == p_email).first()
        if not p_user:
            p_user = User(
                email=p_email,
                password_hash=get_password_hash(default_parent_pwd),
                role="PARENT",
                must_change_password=False,
                is_active=True
            )
            db.add(p_user)
            db.flush()
        else:
            p_user.password_hash = get_password_hash(default_parent_pwd)
            p_user.failed_attempts = 0
            p_user.lock_until = None
            db.flush()

        parent = db.query(Parent).filter(Parent.user_id == p_user.id).first()
        if not parent:
            parent = Parent(
                user_id=p_user.id,
                name=p_name,
                phone=f"+1 555-08{idx:02d}",
                relation=relation
            )
            # Link student: first 10 link to student idx, remaining link to student idx and idx+5
            linked = [created_students[idx - 1]]
            if idx <= 5 and (idx + 14) < len(created_students):
                linked.append(created_students[idx + 14])  # Multi-child parent demonstration
            parent.students = linked
            db.add(parent)
            db.flush()
        created_parents.append(parent)

    # 6. Exams (3 exams)
    exams_data = [
        {"name": "Unit Test 1", "type": "Unit Test", "days_ago": 45, "published": True},
        {"name": "Mid-Term Examination", "type": "Mid-term", "days_ago": 25, "published": True},
        {"name": "Final Semester Examination", "type": "Final", "days_ago": 5, "published": True},
    ]

    created_exams = []
    today = dt.date.today()
    for ex_info in exams_data:
        exam = db.query(Exam).filter(Exam.name == ex_info["name"]).first()
        if not exam:
            exam = Exam(
                name=ex_info["name"],
                exam_type=ex_info["type"],
                class_id=primary_class.id,
                date=today - dt.timedelta(days=ex_info["days_ago"]),
                is_published=ex_info["published"]
            )
            db.add(exam)
            db.flush()
        created_exams.append(exam)

    # 7. Marks
    # Base skills for each student to produce consistent trends
    random.seed(42)
    student_base_scores = {s.id: random.uniform(60, 95) for s in created_students}
    # Make student 19 and 20 weaker to showcase warning & alert systems
    student_base_scores[created_students[18].id] = 48.0
    student_base_scores[created_students[19].id] = 42.0

    for exam in created_exams:
        for student in created_students:
            base = student_base_scores[student.id]
            for subj in primary_class.subjects:
                existing_mark = db.query(Mark).filter(
                    Mark.student_id == student.id,
                    Mark.exam_id == exam.id,
                    Mark.subject_id == subj.id
                ).first()
                if not existing_mark:
                    score = min(100.0, max(25.0, round(random.gauss(base, 6), 1)))
                    mark = Mark(
                        student_id=student.id,
                        exam_id=exam.id,
                        subject_id=subj.id,
                        marks_obtained=score,
                        max_marks=100.0,
                        published=True
                    )
                    db.add(mark)

    # 8. 30 Days of Attendance
    # Students 18 and 19 have lower attendance (<75%) to showcase alerts and low-attendance indicators
    print("[+] Seeding 30 days of attendance history...")
    for day_offset in range(30, -1, -1):
        record_date = today - dt.timedelta(days=day_offset)
        # Skip Sundays
        if record_date.weekday() == 6:
            continue

        for subj in primary_class.subjects[:3]:  # 3 classes per day
            for s_idx, student in enumerate(created_students):
                existing_att = db.query(Attendance).filter(
                    Attendance.student_id == student.id,
                    Attendance.subject_id == subj.id,
                    Attendance.date == record_date
                ).first()

                if not existing_att:
                    # Low attendance for last 2 students
                    if s_idx in (18, 19):
                        status_choice = random.choices(["Present", "Absent", "Late", "Leave"], weights=[45, 45, 5, 5])[0]
                    else:
                        status_choice = random.choices(["Present", "Absent", "Late", "Leave"], weights=[88, 5, 5, 2])[0]

                    att = Attendance(
                        student_id=student.id,
                        subject_id=subj.id,
                        date=record_date,
                        status=status_choice,
                        marked_by=admin_user.id
                    )
                    db.add(att)

    # 9. Notices
    notices_data = [
        {
            "title": "Semester Final Examinations Schedule & Guidelines",
            "desc": "The final examinations schedule has been uploaded. Please ensure you have minimum 75% attendance to qualify.",
            "priority": "urgent",
            "audience": "all"
        },
        {
            "title": "Parent-Teacher Conference (PTC) Next Saturday",
            "desc": "Dear parents, join us for individual progress reviews on your child's academic performance from 10:00 AM to 3:00 PM.",
            "priority": "important",
            "audience": "parents"
        },
        {
            "title": "Annual Technical Fest & Hackathon Registration",
            "desc": "Registration for HackTech 2026 is now open. Submit project proposals before the 15th.",
            "priority": "normal",
            "audience": "students"
        }
    ]
    for n_data in notices_data:
        existing_n = db.query(Notice).filter(Notice.title == n_data["title"]).first()
        if not existing_n:
            n = Notice(
                title=n_data["title"],
                description=n_data["desc"],
                priority=n_data["priority"],
                target_audience=n_data["audience"],
                publish_date=today - dt.timedelta(days=2),
                created_by=admin_user.id
            )
            db.add(n)

    # 10. Sample PDF Document
    # Create sample PDF file physically in uploads/materials
    os.makedirs("./uploads/materials", exist_ok=True)
    sample_pdf_path = "./uploads/materials/sample_syllabus.pdf"
    if not os.path.exists(sample_pdf_path):
        with open(sample_pdf_path, "wb") as f:
            # Minimal valid PDF structure
            f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF")

    if not db.query(PDFDocument).filter(PDFDocument.title == "CS301 Complete Syllabus & Lecture Notes").first():
        sample_doc = PDFDocument(
            title="CS301 Complete Syllabus & Lecture Notes",
            file_path="/uploads/materials/sample_syllabus.pdf",
            file_size=1024,
            mime_type="application/pdf",
            category="Syllabus",
            class_id=primary_class.id,
            subject_id=created_subjects[0].id,
            download_count=18,
            uploaded_by=admin_user.id
        )
        db.add(sample_doc)

    # 11. Initial Warnings for demonstration
    low_att_student = created_students[18]  # Zara Khan
    if not db.query(Warning).filter(Warning.student_id == low_att_student.id).first():
        warning = Warning(
            student_id=low_att_student.id,
            type="Low Attendance",
            severity="high",
            message="Attendance has fallen below the required 75% threshold in multiple subjects. Please meet your department advisor.",
            status="sent",
            issued_by=admin_user.id
        )
        db.add(warning)
        db.flush()

        # Add notification for student and parent
        db.add(Notification(
            recipient_user_id=low_att_student.user_id,
            title="Urgent: Low Attendance Warning",
            message=warning.message,
            type="warning",
            ref_id=warning.id
        ))

    db.commit()
    db.close()

    print("\n" + "=" * 65)
    print("[SUCCESS] SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 65)
    print("DEMO USER CREDENTIALS:")
    print("-----------------------------------------------------------------")
    print("ADMIN:")
    print(f"   Email:    {admin_email}")
    print(f"   Password: {admin_pwd}")
    print("\nSTUDENTS (20 Accounts):")
    print(f"   Email 1:  student1@sms.com   (Roll No: CS202401) / {default_student_pwd}")
    print(f"   Email 2:  student2@sms.com   (Roll No: CS202402) / {default_student_pwd}")
    print(f"   Email 19: student19@sms.com  (Roll No: CS202419 - Flagged Low Attendance) / {default_student_pwd}")
    print("\nPARENTS (15 Accounts):")
    print(f"   Email 1:  parent1@sms.com    (Linked to: student1 & student16) / {default_parent_pwd}")
    print(f"   Email 2:  parent2@sms.com    (Linked to: student2) / {default_parent_pwd}")
    print("-----------------------------------------------------------------\n")

if __name__ == "__main__":
    run_seed()
