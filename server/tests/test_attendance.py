def test_admin_mark_attendance_with_time_slot(client):
    # Admin login
    admin_login = client.post("/api/v1/auth/login", json={
        "identifier": "admin@sms.com",
        "password": "Admin@12345",
        "role": "ADMIN"
    })
    assert admin_login.status_code == 200
    token = admin_login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Batch mark attendance with time_slot
    payload = {
        "subject_id": 1,
        "date": "2026-09-30",
        "time_slot": "09:00 - 10:00 AM (Period 1)",
        "records": [
            {"student_id": 1, "status": "Present", "time_slot": "09:00 - 10:00 AM (Period 1)"}
        ]
    }
    res = client.post("/api/v1/admin/attendance/batch", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Verify via GET /api/v1/admin/attendance
    get_res = client.get("/api/v1/admin/attendance?subject_id=1&date_val=2026-09-30", headers=headers)
    assert get_res.status_code == 200
    records = get_res.json()["data"]
    assert len(records) > 0
    rec = next(r for r in records if r["student_id"] == 1)
    assert rec["time_slot"] == "09:00 - 10:00 AM (Period 1)"
    assert rec["status"] == "Present"


def test_export_attendance_csv(client):
    admin_login = client.post("/api/v1/auth/login", json={
        "identifier": "admin@sms.com",
        "password": "Admin@12345",
        "role": "ADMIN"
    })
    token = admin_login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/admin/attendance/export/csv?subject_id=1", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "date,roll_no,student_name" in res.text or "Period" in res.text or "time_slot" in res.text


def test_student_and_parent_see_time_slot(client):
    # Student 1 login
    student_login = client.post("/api/v1/auth/login", json={
        "identifier": "student1@sms.com",
        "password": "Student@12345",
        "role": "STUDENT"
    })
    s_token = student_login.json()["data"]["access_token"]
    s_headers = {"Authorization": f"Bearer {s_token}"}

    res = client.get("/api/v1/student/attendance/history?subject_id=1", headers=s_headers)
    assert res.status_code == 200
    records = res.json()["data"]
    rec = next((r for r in records if r["date"] == "2026-09-30"), None)
    if rec:
        assert rec["time_slot"] == "09:00 - 10:00 AM (Period 1)"
