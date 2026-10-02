def test_unauthenticated_admin_route_blocked(client):
    client.cookies.clear()
    response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 401

def test_student_cannot_access_admin_route(client):
    # Login as student
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "student1@sms.com",
        "password": "Student@12345",
        "role": "STUDENT"
    })
    token = login_res.json()["data"]["access_token"]
    
    # Try accessing admin endpoint
    res = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403

def test_student_can_only_access_their_own_data(client):
    # Login as student 1
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "student1@sms.com",
        "password": "Student@12345",
        "role": "STUDENT"
    })
    token = login_res.json()["data"]["access_token"]

    # Student dashboard should show student 1's details
    res = client.get(
        "/api/v1/student/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["student_info"]["roll_no"] == "CS202401"

def test_parent_cannot_access_unlinked_child(client):
    # Login as parent 2 (only linked to student 2)
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "parent2@sms.com",
        "password": "Parent@12345",
        "role": "PARENT"
    })
    token = login_res.json()["data"]["access_token"]

    # Parent 2 tries to access student 1's attendance (student_id = 1)
    res = client.get(
        "/api/v1/parent/children/1/attendance",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403
    assert "not linked to your parent account" in res.json()["message"]
