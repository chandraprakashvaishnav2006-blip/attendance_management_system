import datetime as dt

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class AppFunction(Base):
    __tablename__ = "app_functions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(150))
    category: Mapped[str] = mapped_column(String(50), index=True)  # Auth, Attendance, Marks, Students, Parents, Documents, Communication, System
    endpoint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    http_method: Mapped[str | None] = mapped_column(String(10), nullable=True)
    module: Mapped[str | None] = mapped_column(String(150), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_executions: Mapped[int] = mapped_column(Integer, default=0)
    successful_executions: Mapped[int] = mapped_column(Integer, default=0)
    failed_executions: Mapped[int] = mapped_column(Integer, default=0)
    avg_latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    last_executed_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    last_execution_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # SUCCESS, FAILED
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    # Relationships
    logs: Mapped[list["FunctionLog"]] = relationship(
        "FunctionLog",
        back_populates="function",
        cascade="all, delete-orphan",
        order_by="desc(FunctionLog.executed_at)"
    )


class FunctionLog(Base):
    __tablename__ = "function_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    function_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("app_functions.id", ondelete="SET NULL"), nullable=True, index=True)
    function_name: Mapped[str] = mapped_column(String(100), index=True)
    endpoint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    http_method: Mapped[str | None] = mapped_column(String(10), nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    user_identifier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status_code: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), index=True)  # SUCCESS, FAILED
    execution_duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    executed_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, index=True)

    # Relationships
    function: Mapped["AppFunction | None"] = relationship("AppFunction", back_populates="logs")
