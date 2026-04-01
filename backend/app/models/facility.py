from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional, Literal
from datetime import datetime

FacilityType = Literal["hospital", "clinic", "SNF", "home_health", "other"]
FacilityStatus = Literal["active", "inactive"]


class FacilityCreate(BaseModel):
    name: str
    facility_type: FacilityType
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: FacilityStatus = "active"
    default_pay_source_id: Optional[UUID] = None
    internal_notes: Optional[str] = None
    account_notes: Optional[str] = None


class FacilityUpdate(BaseModel):
    name: Optional[str] = None
    facility_type: Optional[FacilityType] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[FacilityStatus] = None
    default_pay_source_id: Optional[UUID] = None
    internal_notes: Optional[str] = None
    account_notes: Optional[str] = None


class FacilityResponse(BaseModel):
    id: UUID
    name: str
    facility_type: Optional[FacilityType] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: FacilityStatus
    default_pay_source_id: Optional[UUID] = None
    internal_notes: Optional[str] = None
    account_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True
