from sqlalchemy.orm import Session

from app.models.academic import Subject
from app.models.marks import Exam, Mark
from app.models.student import Student
from app.schemas.marks import (
    PerformanceAnalytics,
    StudentExamResult,
    StudentSubjectMark,
)


def calculate_grade(percentage: float) -> tuple[str, bool]:
    if percentage >= 90.0:
        return "A+", True
    elif percentage >= 80.0:
        return "A", True
    elif percentage >= 70.0:
        return "B", True
    elif percentage >= 60.0:
        return "C", True
    elif percentage >= 50.0:
        return "D", True
    elif percentage >= 40.0:
        return "E", True
    else:
        return "F", False

def get_exam_rankings_for_class(db: Session, exam_id: int) -> dict[int, int]:
    # Returns { student_id: rank }
    marks = db.query(Mark).filter(Mark.exam_id == exam_id).all()
    student_totals: dict[int, float] = {}
    for m in marks:
        student_totals[m.student_id] = student_totals.get(m.student_id, 0.0) + m.marks_obtained

    sorted_students = sorted(student_totals.items(), key=lambda x: x[1], reverse=True)
    rankings = {}
    for rank, (stud_id, _) in enumerate(sorted_students, start=1):
        rankings[stud_id] = rank
    return rankings

def get_student_exam_results(db: Session, student_id: int, only_published: bool = True) -> list[StudentExamResult]:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return []

    query = db.query(Exam)
    if only_published:
        query = query.filter(Exam.is_published == True)
    exams = query.order_by(Exam.date.desc(), Exam.id.desc()).all()

    results: list[StudentExamResult] = []
    for exam in exams:
        marks_query = db.query(Mark).filter(Mark.exam_id == exam.id, Mark.student_id == student_id)
        if only_published:
            marks_query = marks_query.filter(Mark.published == True)
        marks = marks_query.all()

        if not marks:
            continue

        subj_marks: list[StudentSubjectMark] = []
        tot_obtained = 0.0
        tot_max = 0.0

        for m in marks:
            pct = round((m.marks_obtained / m.max_marks * 100), 1) if m.max_marks > 0 else 0.0
            grade, passed = calculate_grade(pct)
            subj = db.query(Subject).filter(Subject.id == m.subject_id).first()
            subj_name = subj.name if subj else "Subject"
            subj_code = subj.code if subj else "SUB"

            subj_marks.append(StudentSubjectMark(
                subject_id=m.subject_id,
                subject_name=subj_name,
                subject_code=subj_code,
                marks_obtained=m.marks_obtained,
                max_marks=m.max_marks,
                percentage=pct,
                grade=grade,
                passed=passed
            ))
            tot_obtained += m.marks_obtained
            tot_max += m.max_marks

        overall_pct = round((tot_obtained / tot_max * 100), 1) if tot_max > 0 else 0.0
        overall_grd, _ = calculate_grade(overall_pct)

        # Rank in class for this exam
        rankings = get_exam_rankings_for_class(db, exam.id)
        rank = rankings.get(student_id)
        total_students = len(rankings)

        results.append(StudentExamResult(
            exam_id=exam.id,
            exam_name=exam.name,
            exam_type=exam.exam_type,
            date=exam.date,
            total_obtained=tot_obtained,
            total_max=tot_max,
            overall_percentage=overall_pct,
            overall_grade=overall_grd,
            rank=rank,
            total_students_in_class=total_students,
            subjects=subj_marks
        ))

    return results

def get_performance_analytics(db: Session, student_id: int, only_published: bool = True) -> PerformanceAnalytics:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ValueError("Student not found")

    exam_results = get_student_exam_results(db, student_id, only_published=only_published)

    exam_trends = []
    for er in reversed(exam_results):
        exam_trends.append({
            "exam_name": er.exam_name,
            "percentage": er.overall_percentage,
            "date": str(er.date) if er.date else er.exam_name
        })

    # Subject comparison: student average vs class average
    all_subjects = db.query(Subject).all()
    subject_comparison = []
    strong_subjects = []
    weak_subjects = []

    for subj in all_subjects:
        # student marks for this subject
        s_marks_query = db.query(Mark).filter(Mark.student_id == student_id, Mark.subject_id == subj.id)
        if only_published:
            s_marks_query = s_marks_query.filter(Mark.published == True)
        s_marks = s_marks_query.all()

        if not s_marks:
            continue

        s_pcts = [(m.marks_obtained / m.max_marks * 100) for m in s_marks if m.max_marks > 0]
        s_avg = round(sum(s_pcts) / len(s_pcts), 1) if s_pcts else 0.0

        # class average for this subject
        c_marks_query = db.query(Mark).filter(Mark.subject_id == subj.id)
        if only_published:
            c_marks_query = c_marks_query.filter(Mark.published == True)
        c_marks = c_marks_query.all()
        c_pcts = [(m.marks_obtained / m.max_marks * 100) for m in c_marks if m.max_marks > 0]
        c_avg = round(sum(c_pcts) / len(c_pcts), 1) if c_pcts else 0.0

        subject_comparison.append({
            "subject_name": subj.name,
            "student_avg": s_avg,
            "class_avg": c_avg
        })

        if s_avg >= 75.0:
            strong_subjects.append(subj.name)
        elif s_avg < 50.0:
            weak_subjects.append(subj.name)

    overall_pct = 0.0
    if exam_results:
        overall_pct = round(sum(er.overall_percentage for er in exam_results) / len(exam_results), 1)

    return PerformanceAnalytics(
        student_id=student.id,
        student_name=student.name,
        roll_no=student.roll_no,
        overall_percentage=overall_pct,
        overall_rank=exam_results[0].rank if exam_results else None,
        total_exams=len(exam_results),
        exam_trends=exam_trends,
        subject_comparison=subject_comparison,
        strong_subjects=strong_subjects,
        weak_subjects=weak_subjects
    )
