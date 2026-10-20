from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar("T")

class PaginationMetadata(BaseModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int
    has_previous: bool
    has_next: bool

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    pagination: PaginationMetadata
