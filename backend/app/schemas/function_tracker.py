import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict


class AppFunctionBase(BaseModel):
    name: str
    display_name: str
    category: str
    endpoint: str | None = None
    http_method: str | None = None
    module: str | None = None
    description: str | None = None


class AppFunctionCreate(AppFunctionBase):
    pass


class AppFunctionOut(AppFunctionBase):
    id: int
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    avg_latency_ms: float = 0.0
    last_executed_at: dt.datetime | None = None
    last_execution_status: str | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class FunctionLogOut(BaseModel):
    id: int
    function_id: int | None = None
    function_name: str
    endpoint: str | None = None
    http_method: str | None = None
    user_id: int | None = None
    user_role: str | None = None
    user_identifier: str | None = None
    status_code: int
    status: str
    execution_duration_ms: float
    ip_address: str | None = None
    error_message: str | None = None
    executed_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class FunctionStatsOut(BaseModel):
    total_functions: int
    total_executions: int
    successful_executions: int
    failed_executions: int
    success_rate: float
    avg_latency_ms: float
    category_counts: dict[str, int]
    most_active_function: AppFunctionOut | None = None


class FunctionDashboardData(BaseModel):
    stats: FunctionStatsOut
    functions: list[AppFunctionOut]
    recent_logs: list[FunctionLogOut]
