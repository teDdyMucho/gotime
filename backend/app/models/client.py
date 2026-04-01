from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Literal
from datetime import date, datetime

MobilityLevel = Literal["ambulatory", "wheelchair", "stretcher", "other"]


class ClientCreate(BaseModel):
    # PHI fields — encrypted at DB level
    full_name: str
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    primary_address: Optional[str] = None
    # Non-PHI
    mobility_level: Optional[MobilityLevel] = None
    special_assistance_notes: Optional[str] = None
    default_pay_source_id: Optional[UUID] = None
    primary_facility_id: Optional[UUID] = None
    recurring_notes: Optional[str] = None


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    primary_address: Optional[str] = None
    mobility_level: Optional[MobilityLevel] = None
    special_assistance_notes: Optional[str] = None
    default_pay_source_id: Optional[UUID] = None
    primary_facility_id: Optional[UUID] = None
    recurring_notes: Optional[str] = None


class ClientResponse(BaseModel):
    id: UUID
    full_name: str
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    primary_address: Optional[str] = None
    mobility_level: Optional[MobilityLevel] = None
    special_assistance_notes: Optional[str] = None
    default_pay_source_id: Optional[UUID] = None
    primary_facility_id: Optional[UUID] = None
    recurring_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True
