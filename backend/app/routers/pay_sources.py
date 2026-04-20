from fastapi import APIRouter, Depends, HTTPException
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


class PaySourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None
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
    result = db.table("pay_sources").insert(body.model_dump(mode='json', exclude_none=True)).execute()
    return result.data[0]


@router.patch("/{pay_source_id}", response_model=PaySourceResponse)
def update_pay_source(
    pay_source_id: UUID,
    body: PaySourceUpdate,
    user: dict = Depends(require_admin),
):
    db = get_supabase()
    existing = db.table("pay_sources").select("*").eq("id", str(pay_source_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Pay source not found")
    data = body.model_dump(mode='json', exclude_none=True)
    result = db.table("pay_sources").update(data).eq("id", str(pay_source_id)).execute()
    return result.data[0]


@router.delete("/{pay_source_id}", status_code=204)
def delete_pay_source(
    pay_source_id: UUID,
    user: dict = Depends(require_admin),
):
    db = get_supabase()
    existing = db.table("pay_sources").select("*").eq("id", str(pay_source_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Pay source not found")
    db.table("pay_sources").delete().eq("id", str(pay_source_id)).execute()
