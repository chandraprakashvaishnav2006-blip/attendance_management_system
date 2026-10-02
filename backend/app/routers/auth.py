import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, require_role
from app.core.rate_limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    validate_password_strength,
    verify_password,
)
from app.db.session import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.auth import (
    AdminResetPasswordRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=ApiResponse[TokenResponse])
@limiter.limit("15/minute")
def login(
    request: Request,
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    identifier = login_data.identifier.strip()
    
    # Check if user matches email or student roll_no
    user = db.query(User).filter(User.email.ilike(identifier)).first()
    if not user:
        student = db.query(Student).filter(Student.roll_no.ilike(identifier)).first()
        if student:
            user = db.query(User).filter(User.id == student.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Check account lock
    now = datetime.utcnow()
    if user.lock_until and user.lock_until > now:
        remaining = int((user.lock_until - now).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked due to multiple failed login attempts. Try again in {remaining} minute(s)."
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.lock_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Too many failed attempts. Account locked for 15 minutes."
            )
        db.commit()
        remaining_tries = 5 - user.failed_attempts
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials. {remaining_tries} attempts remaining before account lock."
        )

    # Check role filter if specified
    if login_data.role and login_data.role.upper() != user.role.upper():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role mismatch. Account belongs to {user.role}, not {login_data.role}."
        )

    # Reset failed attempts
    user.failed_attempts = 0
    user.lock_until = None
    db.commit()

    # Create tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    # Set httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,  # Set to True in HTTPS production
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=False,
    )

    # Determine display name and profile IDs
    name = user.email.split("@")[0]
    student_id = None
    parent_id = None

    if user.role.upper() == "STUDENT" and user.student_profile:
        name = user.student_profile.name
        student_id = user.student_profile.id
    elif user.role.upper() == "PARENT" and user.parent_profile:
        name = user.parent_profile.name
        parent_id = user.parent_profile.id
    elif user.role.upper() == "ADMIN":
        name = "Administrator"

    data = TokenResponse(
        access_token=access_token,
        role=user.role,
        user_id=user.id,
        email=user.email,
        name=name,
        must_change_password=user.must_change_password,
        student_id=student_id,
        parent_id=parent_id,
    )
    return ApiResponse(success=True, message="Login successful", data=data)

@router.post("/logout", response_model=ApiResponse)
def logout(response: Response):
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return ApiResponse(success=True, message="Successfully logged out")

@router.get("/me", response_model=ApiResponse[dict])
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile_info = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "must_change_password": current_user.must_change_password,
        "created_at": current_user.created_at,
    }
    if current_user.role.upper() == "STUDENT" and current_user.student_profile:
        st = current_user.student_profile
        profile_info.update({
            "student_id": st.id,
            "name": st.name,
            "roll_no": st.roll_no,
            "class_id": st.class_id,
            "class_name": st.class_group.name if st.class_group else None,
            "section": st.section,
            "phone": st.phone,
            "gender": st.gender,
            "dob": st.dob,
            "address": st.address,
        })
    elif current_user.role.upper() == "PARENT" and current_user.parent_profile:
        pr = current_user.parent_profile
        profile_info.update({
            "parent_id": pr.id,
            "name": pr.name,
            "phone": pr.phone,
            "relation": pr.relation,
            "students": [
                {
                    "id": s.id,
                    "name": s.name,
                    "roll_no": s.roll_no,
                    "class_name": s.class_group.name if s.class_group else None,
                    "section": s.section
                } for s in pr.students
            ]
        })
    else:
        profile_info["name"] = "Administrator"

    return ApiResponse(success=True, message="Current profile loaded", data=profile_info)

@router.post("/change-password", response_model=ApiResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password does not match.")

    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match.")

    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    current_user.password_hash = get_password_hash(data.new_password)
    current_user.must_change_password = False
    db.commit()

    return ApiResponse(success=True, message="Password changed successfully.")

@router.post("/forgot-password", response_model=ApiResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    # Always return a generic success message to prevent user enumeration
    if user:
        reset_token = uuid.uuid4().hex
        user.reset_token = reset_token
        user.reset_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
        print("\n" + "=" * 60)
        print(f"🔒 [FORGOT PASSWORD] Password reset requested for {user.email}")
        print(f"🔗 Reset Link: {reset_link}")
        print(f"⏳ Expires in 1 hour (Token: {reset_token})")
        print("=" * 60 + "\n")

    return ApiResponse(
        success=True,
        message="If an account with that email exists, password reset instructions have been dispatched (see server console)."
    )

@router.post("/reset-password", response_model=ApiResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user or not user.reset_expiry or user.reset_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user.password_hash = get_password_hash(data.new_password)
    user.reset_token = None
    user.reset_expiry = None
    user.must_change_password = False
    db.commit()

    return ApiResponse(success=True, message="Password has been reset successfully. You can now login.")

@router.post("/admin-reset-password", response_model=ApiResponse)
def admin_reset_password(
    data: AdminResetPasswordRequest,
    current_admin: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_pwd = data.temporary_password or f"Temp@{uuid.uuid4().hex[:6].capitalize()}1"
    target_user.password_hash = get_password_hash(temp_pwd)
    target_user.must_change_password = True
    db.commit()

    return ApiResponse(
        success=True,
        message=f"Temporary password set to: {temp_pwd}. User must change it upon next login.",
        data={"temporary_password": temp_pwd}
    )
