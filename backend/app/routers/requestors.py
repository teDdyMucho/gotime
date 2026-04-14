from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from app.models.requestor import RequestorCreate, RequestorUpdate, RequestorResponse
from app.core.security import require_intake_or_above, require_dispatcher_or_above
from app.db.supabase import get_supabase
from app.services.audit_service import log_event

router = APIRouter(prefix="/requestors", tags=["Requestors"])


@router.get("", response_model=list[RequestorResponse])
def list_requestors(
    facility_id: str = Query("", description="Filter by facility UUID"),
    search: str = Query("", description="Search by name"),
    status: str = Query("active"),
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    query = db.table("requestors").select("*")
    if status != "all":
        query = query.eq("status", status)
    if facility_id:
        query = query.eq("facility_id", facility_id)
    if search:
        query = query.ilike("name", f"%{search}%")
    result = query.order("name").execute()
    return result.data


@router.post("", response_model=RequestorResponse, status_code=201)
def create_requestor(
    body: RequestorCreate,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    data = body.model_dump(mode='json', exclude_none=True)
    result = db.table("requestors").insert(data).execute()
    log_event("requestor", result.data[0]["id"], "create", user["user_id"], new_value=result.data[0])
    return result.data[0]


@router.patch("/{requestor_id}", response_model=RequestorResponse)
def update_requestor(
    requestor_id: UUID,
    body: RequestorUpdate,
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    existing = db.table("requestors").select("*").eq("id", str(requestor_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Requestor not found")
    data = body.model_dump(mode='json', exclude_none=True)
    result = db.table("requestors").update(data).eq("id", str(requestor_id)).execute()
    log_event("requestor", str(requestor_id), "update", user["user_id"],
              old_value=existing.data[0], new_value=result.data[0])
    return result.data[0]
