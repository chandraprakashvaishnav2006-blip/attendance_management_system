def test_admin_login_success(client):
    response = client.post("/api/v1/auth/login", json={
        "identifier": "admin@sms.com",
        "password": "Admin@12345",
        "role": "ADMIN"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["role"] == "ADMIN"
    assert "access_token" in data["data"]
    # Check httpOnly cookie
    assert "access_token" in response.cookies

def test_login_invalid_password(client):
    response = client.post("/api/v1/auth/login", json={
        "identifier": "admin@sms.com",
        "password": "WrongPassword!99",
        "role": "ADMIN"
    })
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False

def test_student_login_with_roll_no(client):
    # Test logging in with Roll Number instead of email
    response = client.post("/api/v1/auth/login", json={
        "identifier": "CS202401",
        "password": "Student@12345",
        "role": "STUDENT"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["role"] == "STUDENT"
    assert data["data"]["student_id"] is not None

def test_parent_login(client):
    response = client.post("/api/v1/auth/login", json={
        "identifier": "parent1@sms.com",
        "password": "Parent@12345",
        "role": "PARENT"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["role"] == "PARENT"
    assert data["data"]["parent_id"] is not None

def test_role_mismatch_rejected(client):
    # Student attempting to log in on Admin tab
    response = client.post("/api/v1/auth/login", json={
        "identifier": "student1@sms.com",
        "password": "Student@12345",
        "role": "ADMIN"
    })
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert "Role mismatch" in data["message"]
