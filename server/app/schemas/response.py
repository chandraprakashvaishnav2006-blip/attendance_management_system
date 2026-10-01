from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: T | None = None

class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
