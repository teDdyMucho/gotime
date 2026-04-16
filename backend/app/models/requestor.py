from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Literal
from datetime import datetime

NotificationMethod = Literal["sms", "email", "both"]
RequestorStatus = Literal["active", "inactive"]


class RequestorCreate(BaseModel):
    name: str
    title_department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    preferred_notification_method: NotificationMethod = "both"
    facility_id: Optional[UUID] = None
    status: RequestorStatus = "active"
    notes: Optional[str] = None


class RequestorUpdate(BaseModel):
    name: Optional[str] = None
    title_department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    preferred_notification_method: Optional[NotificationMethod] = None
    facility_id: Optional[UUID] = None
    status: Optional[RequestorStatus] = None
    notes: Optional[str] = None


class RequestorResponse(BaseModel):
    id: UUID
    name: str
    title_department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    preferred_notification_method: NotificationMethod
    facility_id: Optional[UUID] = None
    status: RequestorStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
