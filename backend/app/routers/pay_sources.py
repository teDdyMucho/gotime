from fastapi import APIRouter, Depends
from app.core.security import require_intake_or_above, require_admin
from app.db.supabase import get_supabase
from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

router = APIRouter(prefix="/pay-sources", tags=["Pay Sources"])


class PaySourceCreate(BaseModel):
    name: str
    status: Literal["active", "inactive"] = "active"
    notes: Optional[str] = None


class PaySourceResponse(BaseModel):
    id: UUID
    name: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


@router.get("", response_model=list[PaySourceResponse])
def list_pay_sources(
    status: str = "active",
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    query = db.table("pay_sources").select("*")
    if status != "all":
        query = query.eq("status", status)
    result = query.order("name").execute()
    return result.data


@router.post("", response_model=PaySourceResponse, status_code=201)
def create_pay_source(
    body: PaySourceCreate,
    user: dict = Depends(require_admin),
):
    db = get_supabase()
    result = db.table("pay_sources").insert(body.model_dump(exclude_none=True)).execute()
    return result.data[0]
