# EduTrack Pro - Student Management System (SMS)

A complete, production-quality Student Management System web application built with a **FastAPI (Python 3.10+)** backend and a **React 18 + Vite + Tailwind CSS** frontend.

Designed with a sleek, role-tailored UI (Admin: Indigo, Student: Emerald, Parent: Amber), strict backend role-based access control (RBAC), data isolation boundaries, real-time attendance tracking with audit logs, multi-child parent dashboards, automated marks grading, PDF document management, and dark/light mode.

---

## 🌟 Key Features

### 🔐 1. Authentication & Security
- **Multi-Role JWT Authentication:** Dedicated login and role separation for **Admin**, **Student**, and **Parent**.
- **Flexible Login:** Students can sign in using either their registered **Email** or unique **Roll Number** (e.g., `CS202401`).
- **Security Best Practices:**
  - Password hashing with **Bcrypt**.
  - Account lockout after 5 consecutive failed attempts.
  - Temporary password generation with mandatory password change on first login.
  - JWT tokens stored in `httpOnly`, `SameSite=lax` secure cookies with Authorization header fallback.
  - Rate limiting with `slowapi`.
  - CORS middleware, security headers, and Pydantic v2 schema validation on all inputs.
  - Magic byte validation for PDF uploads (`%PDF-` header check).

### 👑 2. Admin Module
- **Dashboard:** Real-time statistics (Total Students, Parents, Today's Attendance %, Low Attendance alerts), quick actions, and recent notices.
- **Student Management:**
  - Full CRUD operations with class, section, roll number, and contact info.
  - Search, filter by class/section/status, sort, and pagination.
  - Bulk student import via CSV and export to CSV.
  - Automatic student user account creation upon registration.
- **Parent Management:**
  - Full CRUD with many-to-many parent-student linking (one parent can be linked to multiple children).
  - Search, filter, and automatic parent user account creation.
- **Attendance Management:**
  - Select class, section, subject, and date.
  - Mark status (*Present*, *Absent*, *Late*, *Leave*) with a 1-click **"Mark All Present"** shortcut.
  - Past attendance editing with an **immutable audit trail** tracking who modified it, when, old status, and new status.
  - Automated low-attendance detection based on a configurable threshold (default 75%).
  - Attendance export to CSV.
- **Marks & Examination Management:**
  - Exam creation (Unit Test, Mid-Term, Final Exam, Assignments) with maximum marks.
  - Interactive grid marks entry with percentage, grade calculation (A+, A, B, C, D, F), pass/fail status, and class rank computation.
  - Publish / Unpublish results toggle (students and parents only see published results).
- **Notice Board:**
  - Create notices with priority flags (*Normal*, *Important*, *Urgent*), target audience (*All*, *Students*, *Parents*, *Specific Class*), optional PDF attachment, and expiration dates.
- **Document (PDF) Management:**
  - Upload, categorize (*Notes*, *Syllabus*, *Timetable*, *Assignment*, *Circular*, *Other*), assign to class/subject, view in browser, download counter, and magic byte validation.
- **Disciplinary & Attendance Warnings:**
  - Issue warnings (*Low Attendance*, *Poor Marks*, *Discipline*, *Other*) with severity levels.
  - 1-click warning generation for students below the 75% attendance threshold.

### 🎓 3. Student Module
- **Dashboard:** Attendance gauge, recent exam grades, unread notifications, and urgent notices.
- **Attendance History:**
  - Monthly interactive calendar view with color-coded status badges.
  - Tabular list view with month and subject filtering.
  - Subject-wise percentage breakdown (Green: >85%, Yellow: 75–85%, Red: <75%).
- **Marks & Report Card:**
  - Exam-wise and subject-wise scorecards with grade, percentage, class rank, and pass/fail indicators.
- **Academic Performance Analytics:**
  - Powered by **Recharts**:
    - **Performance Trend:** Multi-exam line chart tracking percentage trajectory.
    - **Subject Comparison:** Bar chart comparing student marks against maximum marks.
    - **Attendance Split:** Donut chart breaking down Present, Absent, Late, and Leave sessions.
- **Documents & Resources:** Search, filter by category/subject, preview in browser, and download class materials.
- **Notifications:** In-app notification center with unread badges, mark-as-read, and warning alerts.

### 👨‍👩‍👧 4. Parent Module (Strictly Read-Only)
- **Multi-Child Switcher:** Seamlessly switch between multiple children from a persistent dropdown.
- **Child Overview:** Attendance summary, latest exam marks, and academic standing.
- **Read-Only Attendance & Marks:** Complete history calendar and published report cards.
- **Comparative Analytics:** Visual charts benchmarked against class performance.
- **Attendance & Disciplinary Alerts:** Immediate visibility of unexcused absences and administrative warnings.

---

## 🏗️ Architecture & Tech Stack

```
student-management-system/
├── client/                     # React 18 + Vite Frontend
│   ├── src/
│   │   ├── api/                # Axios instance with auth interceptor
│   │   ├── components/         # Reusable UI (Modals, Badges, Tables, Charts, Skeletons)
│   │   ├── context/            # AuthContext, ThemeContext (Dark Mode)
│   │   ├── layouts/            # DashboardLayout (Sidebar, Navbar)
│   │   ├── pages/              # Auth, Admin, Student, Parent, Shared pages
│   │   └── App.jsx             # Role-protected routes (ProtectedRoute)
│   ├── tailwind.config.js      # Custom theme colors (Admin, Student, Parent)
│   └── vite.config.js          # Proxy configuration to FastAPI backend
└── server/                     # FastAPI Backend (Python 3.10+)
    ├── alembic/                # Database migrations
    ├── app/
    │   ├── core/               # App config, JWT & Bcrypt security, FastAPI dependencies
    │   ├── db/                 # SQLAlchemy 2.0 engine & session factory
    │   ├── models/             # Mapped[] SQLAlchemy 2.0 ORM models
    │   ├── routers/            # /auth, /admin, /student, /parent API routers
    │   ├── schemas/            # Pydantic v2 schemas
    │   ├── services/           # Attendance, Marks, Notification services
    │   └── seed.py             # Database seeder (Admin, 20 Students, 15 Parents, etc.)
    ├── tests/                  # Pytest test suite for auth & RBAC
    ├── requirements.txt        # Python dependencies
    └── pyproject.toml          # Ruff linter and pytest configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (tested on Python 3.10 and 3.11)
- **Node.js 18+** and **npm**

---

### Step 1: Backend Setup

1. Open a terminal in the `server/` directory:
   ```bash
   cd server
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (a pre-configured `.env` is already provided):
   ```bash
   # If needed, copy from example
   cp .env.example .env
   ```

5. Apply database migrations:
   ```bash
   alembic upgrade head
   ```

6. Seed the database with demo data (Admin, 20 Students, 15 Parents, 30 days of attendance, exams, marks):
   ```bash
   python -m app.seed
   ```

7. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - Swagger Interactive Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - ReDoc Documentation: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### Step 2: Frontend Setup

1. Open a second terminal in the `client/` directory:
   ```bash
   cd client
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 Demo Credentials

All accounts come pre-configured in the database seeder. You can click the **Demo Quick-Fill Buttons** on the login page or enter credentials manually:

| Role | Email / Identifier | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sms.com` | `Admin@12345` | Full administrative control |
| **Student (Standard)** | `student1@sms.com` *(or Roll No: `CS202401`)* | `Student@12345` | Class 10-A, 88% attendance |
| **Student (Low Attendance)** | `student19@sms.com` *(or Roll No: `CS202419`)* | `Student@12345` | Class 10-B, <75% attendance (flagged) |
| **Parent (Multi-Child)** | `parent1@sms.com` | `Parent@12345` | Linked to **Student 1** & **Student 16** |
| **Parent (Single-Child)** | `parent2@sms.com` | `Parent@12345` | Linked to **Student 2** |

*(Note: There are 20 total student accounts `student1@sms.com` through `student20@sms.com`, and 15 parent accounts `parent1@sms.com` through `parent15@sms.com` with respective passwords `Student@12345` and `Parent@12345`).*

---

## 📡 API Endpoints Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Login with email/roll_no + password (sets JWT cookie) | Public |
| `POST` | `/api/v1/auth/logout` | Clear auth cookies | Authenticated |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user session profile | Authenticated |
| `POST` | `/api/v1/auth/change-password` | Update account password | Authenticated |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset token | Public |
| `POST` | `/api/v1/auth/reset-password` | Reset password using valid token | Public |

### Admin Endpoints (`/api/v1/admin`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard` | Dashboard metrics & low attendance alerts | Admin |
| `GET` / `POST` | `/api/v1/admin/students` | List paginated students / Add student | Admin |
| `GET` / `PUT` / `DELETE`| `/api/v1/admin/students/{id}` | Student details, update, delete | Admin |
| `POST` | `/api/v1/admin/students/import-csv` | Bulk import students via CSV | Admin |
| `GET` | `/api/v1/admin/students/export-csv` | Export students list to CSV | Admin |
| `GET` / `POST` | `/api/v1/admin/parents` | List parents / Add parent | Admin |
| `POST` | `/api/v1/admin/parents/{id}/link-students`| Link/unlink student(s) to parent | Admin |
| `GET` / `POST` | `/api/v1/admin/attendance` | Get sheet / Mark student attendance | Admin |
| `POST` | `/api/v1/admin/attendance/batch` | Batch mark attendance with audit trail | Admin |
| `GET` | `/api/v1/admin/attendance/export-csv` | Export attendance report to CSV | Admin |
| `GET` / `POST` | `/api/v1/admin/exams` | List / Create examination | Admin |
| `GET` / `POST` | `/api/v1/admin/marks` | Grid marks lookup / Batch save marks | Admin |
| `PUT` | `/api/v1/admin/exams/{id}/publish` | Toggle exam marks publication | Admin |
| `GET` / `POST` / `DELETE`| `/api/v1/admin/notices` | Notices management | Admin |
| `GET` / `POST` / `DELETE`| `/api/v1/admin/pdfs` | Document management & magic byte upload | Admin |
| `GET` / `POST` | `/api/v1/admin/warnings` | Warning issuance & auto-suggest | Admin |

### Student Endpoints (`/api/v1/student`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/student/dashboard` | Student dashboard summary | Student |
| `GET` | `/api/v1/student/attendance` | Attendance records & subject percentages | Student |
| `GET` | `/api/v1/student/marks` | Published exam marks & report card | Student |
| `GET` | `/api/v1/student/analytics` | Trend & comparative charts data | Student |
| `GET` | `/api/v1/student/documents` | Browse & download PDF documents | Student |
| `GET` / `PUT` | `/api/v1/student/notifications`| View notifications / Mark read | Student |

### Parent Endpoints (`/api/v1/parent`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/parent/children` | List linked children | Parent |
| `GET` | `/api/v1/parent/child/{id}/dashboard`| Selected child dashboard summary | Parent |
| `GET` | `/api/v1/parent/child/{id}/attendance`| Selected child attendance calendar & stats | Parent |
| `GET` | `/api/v1/parent/child/{id}/marks` | Selected child published marks | Parent |
| `GET` | `/api/v1/parent/child/{id}/analytics`| Selected child performance charts | Parent |
| `GET` | `/api/v1/parent/alerts` | Attendance & administrative alerts | Parent |

---

## 🧪 Testing & Verification

### Running Automated Backend Tests
Run the pytest suite to verify authentication, roll number login, rate limiting, and RBAC data boundary isolation:

```bash
cd server
.\venv\Scripts\python.exe -m pytest -v
```

**Results:**
```
tests/test_auth.py::test_admin_login_success PASSED                      [ 11%]
tests/test_auth.py::test_login_invalid_password PASSED                   [ 22%]
tests/test_auth.py::test_student_login_with_roll_no PASSED               [ 33%]
tests/test_auth.py::test_parent_login PASSED                             [ 44%]
tests/test_auth.py::test_role_mismatch_rejected PASSED                   [ 55%]
tests/test_rbac.py::test_unauthenticated_admin_route_blocked PASSED      [ 66%]
tests/test_rbac.py::test_student_cannot_access_admin_route PASSED        [ 77%]
tests/test_rbac.py::test_student_can_only_access_their_own_data PASSED   [ 88%]
tests/test_rbac.py::test_parent_cannot_access_unlinked_child PASSED      [100%]

======================== 9 passed in 5.69s =========================
```

### Running Linting
```bash
cd server
.\venv\Scripts\python.exe -m ruff check app tests
```

---

## 📋 Manual Verification Checklist

- [x] **Role-Based Login:** Able to switch between Admin, Student, and Parent tabs. Quick-fill button correctly populates credentials.
- [x] **Student Roll Number Login:** Able to log in with `CS202401` as well as `student1@sms.com`.
- [x] **Admin Student CRUD:** Can add, edit, search, filter by class/section, and export students to CSV.
- [x] **Parent-Student Linking:** One parent (e.g. `parent1@sms.com`) can be linked to multiple children (`student1` and `student16`).
- [x] **Attendance Marking & Audit:**
  - Able to filter by Class 10-A, Mathematics, and today's date.
  - "Mark All Present" button marks all rows at once.
  - Editing an existing attendance record records an audit entry in `AttendanceAudit`.
  - Configurable 75% threshold automatically flags low attendance students.
- [x] **Marks Grid & Publishing:**
  - Auto-calculates percentages, grades (A+, A, B, etc.), and ranks.
  - Unpublishing marks immediately hides them from student and parent endpoints.
- [x] **PDF Magic Byte Validation:** Attempting to upload a renamed `.exe` or `.txt` file as `.pdf` is rejected with `400 Invalid PDF header`.
- [x] **Student Analytics:** Recharts line chart, bar chart, and donut gauge load without errors.
- [x] **Parent Multi-Child Switcher:** Parent dropdown allows switching between linked children, updating all cards and analytics instantly.
- [x] **Theme Switching:** Dark mode toggle smoothly updates background and text colors across all pages.
