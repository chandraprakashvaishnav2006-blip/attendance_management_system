
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.parent import Parent
from app.models.student import Student
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_token_from_request(request: Request, header_token: str | None = Depends(oauth2_scheme)) -> str | None:
    # Check httpOnly cookie first
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        # Strip "Bearer " if present
        if cookie_token.startswith("Bearer "):
            return cookie_token[7:]
        return cookie_token
    # Fallback to Authorization header
    return header_token

def get_current_user(
    token: str | None = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user

def require_role(allowed_roles: list[str] | str):
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]
    # Normalize roles to uppercase
    allowed_roles = [r.upper() for r in allowed_roles]

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.upper() not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker

def get_current_student(
    current_user: User = Depends(require_role("STUDENT")),
    db: Session = Depends(get_db)
) -> Student:
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user",
        )
    return student

def get_current_parent(
    current_user: User = Depends(require_role("PARENT")),
    db: Session = Depends(get_db)
) -> Parent:
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent profile not found for this user",
        )
    return parent
