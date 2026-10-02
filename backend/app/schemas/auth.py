
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or Roll Number / Student ID")
    password: str = Field(..., min_length=1)
    role: str | None = Field(None, description="ADMIN, STUDENT, or PARENT")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str
    name: str
    must_change_password: bool
    student_id: int | None = None
    parent_id: int | None = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

class AdminResetPasswordRequest(BaseModel):
    user_id: int
    temporary_password: str | None = None
