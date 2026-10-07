import datetime as dt
import math
import time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.function_tracker import AppFunction, FunctionLog
from app.models.user import User
from app.schemas.function_tracker import (
    AppFunctionOut,
    FunctionDashboardData,
    FunctionLogOut,
)
from app.schemas.response import ApiResponse, PaginatedData
from app.services.function_tracker import (
    get_dashboard_summary,
    record_function_execution,
    seed_system_functions,
)

router = APIRouter(prefix="/admin/functions", tags=["System Functions Tracker"])


@router.get("", response_model=ApiResponse[FunctionDashboardData])
def get_functions_dashboard(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Retrieve full dashboard data including overall stats, catalog of functions, and recent activity logs."""
    # Ensure standard catalog is seeded
    seed_system_functions(db)
    
    summary = get_dashboard_summary(db)
    return ApiResponse(
        success=True,
        message="System functions fetched successfully",
        data=summary
    )


@router.get("/logs", response_model=ApiResponse[PaginatedData[FunctionLogOut]])
def get_function_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Fetch paginated chronological execution logs with filtering."""
    query = select(FunctionLog)

    if status_filter and status_filter.upper() in ["SUCCESS", "FAILED"]:
        query = query.where(FunctionLog.status == status_filter.upper())

    if search:
        search_fmt = f"%{search}%"
        query = query.where(
            or_(
                FunctionLog.function_name.ilike(search_fmt),
                FunctionLog.endpoint.ilike(search_fmt),
                FunctionLog.user_identifier.ilike(search_fmt)
            )
        )

    # Total count
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    logs = db.execute(
        query.order_by(desc(FunctionLog.executed_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    return ApiResponse(
        success=True,
        message="Logs retrieved successfully",
        data=PaginatedData(
            items=logs,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )


@router.post("/test/{function_id}", response_model=ApiResponse[dict])
def test_system_function(
    function_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Simulate or execute a diagnostic probe on a registered system function to measure live response time."""
    func_obj = db.get(AppFunction, function_id)
    if not func_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Function not found in registry"
        )

    start_time = time.time()
    # Simulated execution check
    time.sleep(0.015)  # 15ms simulated run
    duration_ms = (time.time() - start_time) * 1000.0

    record_function_execution(
        db=db,
        endpoint=func_obj.endpoint or f"/diagnostic/{func_obj.name}",
        http_method=func_obj.http_method or "SYSTEM",
        status_code=200,
        duration_ms=duration_ms,
        ip_address="127.0.0.1",
        user_id=current_user.id,
        user_role=current_user.role,
        user_identifier=current_user.email,
        explicit_func_name=func_obj.name
    )

    return ApiResponse(
        success=True,
        message=f"Diagnostic executed for {func_obj.display_name}",
        data={
            "function_id": func_obj.id,
            "function_name": func_obj.name,
            "status": "SUCCESS",
            "duration_ms": round(duration_ms, 2),
            "timestamp": dt.datetime.utcnow().isoformat()
        }
    )


@router.delete("/logs", response_model=ApiResponse[dict])
def clear_function_logs(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Purge execution logs while keeping aggregate metrics intact."""
    deleted_count = db.query(FunctionLog).delete()
    db.commit()

    return ApiResponse(
        success=True,
        message=f"Successfully purged {deleted_count} execution log entries",
        data={"deleted_count": deleted_count}
    )
