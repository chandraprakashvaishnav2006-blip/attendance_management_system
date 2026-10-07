import os

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

import time

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.routers import admin, auth, functions, parent, student
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": f"Internal Server Error: {exc!s}",
            "data": None
        }
    )

# Mount Uploads for direct PDF download and preview
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

@app.on_event("startup")
def startup_event():
    # Seed system functions catalog on startup
    db = SessionLocal()
    try:
        seed_system_functions(db)
    except Exception as e:
        print(f"[Startup] Could not seed system functions: {e}")
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
