import logging
import mimetypes
import os
import time

from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("uvicorn.error")


from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security import decode_token
from app.db.session import Base, SessionLocal, engine, get_db
import app.models
from app.models.communication import Notice, PDFDocument
from app.routers import admin, auth, documents, functions, parent, student
from app.services.function_tracker import record_function_execution, seed_system_functions

# Ensure upload directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "materials"), exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-featured Student Management System REST API with RBAC, Attendance, Marks, Analytics, and Notifications",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json"
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$|^https:\/\/.*\.onrender\.com$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "Content-Type"],
)

# Global Exception Handlers for consistent API responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
            "data": None
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"])
        error_messages.append(f"{field}: {err['msg']}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation Error: " + "; ".join(error_messages),
            "data": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    error_msg = f"Internal Server Error: {exc!s}" if settings.ENVIRONMENT.lower() == "development" else "An unexpected internal server error occurred."
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": error_msg,
            "data": None
        }
    )

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Allow in-browser PDF viewers and previewers to render without frame blocking
    req_path = request.url.path.lower()
    if not (req_path.startswith("/uploads/") or "/view" in req_path or req_path.endswith(".pdf")):
        response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/") and not ("/download" in req_path or "/view" in req_path):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Resilient Uploads Serving: Prioritizes database bytes directly for cloud container resilience
def _serve_db_or_disk_file(subfolder: str | None, filename: str, db: Session):
    import urllib.parse
    clean_fname = urllib.parse.unquote(filename)
    mime_type, _ = mimetypes.guess_type(clean_fname)
    media_type = mime_type or "application/octet-stream"

    # 1. Recover from PostgreSQL DB (PDF Documents)
    doc = db.query(PDFDocument).filter(
        (PDFDocument.file_path.ilike(f"%{clean_fname}")) | (PDFDocument.title.ilike(f"%{clean_fname}%"))
    ).first()
    if doc and doc.file_data and len(doc.file_data) > 0:
        safe_fname = urllib.parse.quote(clean_fname)
        headers = {
            "Content-Disposition": f'inline; filename="{clean_fname}"; filename*=UTF-8\'\'{safe_fname}',
            "Content-Length": str(len(doc.file_data)),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
        }
        return Response(content=doc.file_data, media_type=doc.mime_type or media_type, headers=headers)

    # 2. Recover from PostgreSQL DB (Notices / Announcements)
    notice = db.query(Notice).filter(
        (Notice.attachment_path.ilike(f"%{clean_fname}"))
    ).first()
    if notice and notice.attachment_data and len(notice.attachment_data) > 0:
        safe_fname = urllib.parse.quote(clean_fname)
        headers = {
            "Content-Disposition": f'inline; filename="{clean_fname}"; filename*=UTF-8\'\'{safe_fname}',
            "Content-Length": str(len(notice.attachment_data)),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
        }
        return Response(content=notice.attachment_data, media_type=media_type, headers=headers)

    # 3. Fallback to candidate disk paths
    parts = [settings.UPLOAD_DIR]
    if subfolder:
        parts.append(subfolder)
    parts.append(clean_fname)
    file_path = os.path.join(*parts)
    if os.path.isfile(file_path) and os.path.getsize(file_path) > 0:
        return FileResponse(file_path, media_type=media_type)

    return JSONResponse(status_code=404, content={"success": False, "message": f"File '{clean_fname}' not found on server or database."})


@app.get("/uploads/{subfolder}/{filename}")
def serve_uploaded_file(subfolder: str, filename: str, db: Session = Depends(get_db)):
    return _serve_db_or_disk_file(subfolder, filename, db)


@app.get("/uploads/{filename}")
def serve_uploaded_root_file(filename: str, db: Session = Depends(get_db)):
    return _serve_db_or_disk_file(None, filename, db)

# Static fallback mount
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.middleware("http")
async def track_functions_middleware(request: Request, call_next):
    # Only track /api/ routes
    path = request.url.path
    if not path.startswith("/api/"):
        return await call_next(request)

    start_time = time.time()
    try:
        response = await call_next(request)
        status_code = response.status_code
        err_msg = None
    except Exception as exc:
        status_code = 500
        err_msg = str(exc)
        raise exc
    finally:
        # Don't record pre-flight OPTIONS requests or docs
        if request.method != "OPTIONS" and not path.endswith("/openapi.json"):
            duration_ms = (time.time() - start_time) * 1000.0
            user_id = None
            user_role = None
            user_identifier = None

            try:
                cookie_token = request.cookies.get("access_token")
                token = None
                if cookie_token:
                    token = cookie_token[7:] if cookie_token.startswith("Bearer ") else cookie_token
                else:
                    auth_header = request.headers.get("Authorization")
                    if auth_header and auth_header.startswith("Bearer "):
                        token = auth_header[7:]

                if token:
                    payload = decode_token(token)
                    user_id = int(payload.get("sub"))
                    user_role = payload.get("role")
                    user_identifier = payload.get("email") or payload.get("identifier")
            except Exception:
                pass

            try:
                db_session = SessionLocal()
                try:
                    record_function_execution(
                        db=db_session,
                        endpoint=path,
                        http_method=request.method,
                        status_code=status_code,
                        duration_ms=duration_ms,
                        ip_address=request.client.host if request.client else None,
                        user_id=user_id,
                        user_role=user_role,
                        user_identifier=user_identifier or ("Anonymous" if not user_id else f"User #{user_id}"),
                        error_message=err_msg
                    )
                finally:
                    db_session.close()
            except Exception:
                pass

    return response

# Include Routers under /api/v1
api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(student.router, prefix=api_prefix)
app.include_router(parent.router, prefix=api_prefix)
app.include_router(functions.router, prefix=api_prefix)
app.include_router(documents.router, prefix=api_prefix)

@app.on_event("startup")
def startup_event():
    # 1. Automatically create database tables if they do not exist
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.error(f"[Startup] Could not create database tables: {e}")

    # 2. Seed system functions catalog on startup
    db = SessionLocal()
    try:
        seed_system_functions(db)
        # Check if database has any users; if completely empty, run seed
        from app.models.user import User
        if db.query(User).count() == 0:
            logger.info("[Startup] Database is empty. Seeding initial records...")
            try:
                from app.seed import run_seed
                run_seed()
            except Exception as seed_err:
                logger.error(f"[Startup] Could not run initial seed: {seed_err}")
    except Exception as e:
        logger.error(f"[Startup] Startup error: {e}")
    finally:
        db.close()

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}

@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "documentation": "/docs",
        "version": "1.0.0"
    }
