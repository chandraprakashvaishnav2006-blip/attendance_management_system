import httpx

client = httpx.Client(base_url="http://127.0.0.1:8000")

# 1. Login as Admin
login_res = client.post(
    "/api/v1/auth/login",
    json={"login_id": "admin@sms.com", "password": "Admin@12345", "role": "ADMIN"}
)
assert login_res.status_code == 200, f"Login failed: {login_res.text}"
token = login_res.json()["data"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Upload a Word document
files = {"file": ("Sample_Lecture_Notes.docx", b"Mock Word document binary contents...", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
data = {"title": "Sample Lecture Notes", "category": "Notes"}
res = client.post("/api/v1/admin/documents/upload", data=data, files=files, headers=headers)
print("Word doc upload:", res.status_code, res.json()["message"])
assert res.status_code == 200

# 3. Upload a batch / folder
batch_files = [
    ("files", ("lab_code.py", b"print('hello world')", "text/x-python")),
    ("files", ("data_sheet.xlsx", b"mock excel bytes", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
    ("files", ("presentation.pptx", b"mock pptx bytes", "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
]
batch_data = {"folder_name": "Unit_1_Package", "category": "Folder / Package"}
b_res = client.post("/api/v1/admin/documents/upload-batch", data=batch_data, files=batch_files, headers=headers)
print("Batch/Folder upload:", b_res.status_code, b_res.json()["message"])
assert b_res.status_code == 200

print("[SUCCESS] All document formats & folder uploads verified!")
