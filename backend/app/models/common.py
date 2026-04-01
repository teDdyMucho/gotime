from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class AuditFields(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 50

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class StatusEnum:
    ACTIVE = "active"
    INACTIVE = "inactive"
