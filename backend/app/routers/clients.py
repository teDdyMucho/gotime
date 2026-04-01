from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from app.models.client import ClientCreate, ClientUpdate, ClientResponse
from app.core.security import require_intake_or_above
from app.db.supabase import get_supabase
from app.services.audit_service import log_event

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=list[ClientResponse])
def list_clients(
    search: str = Query("", description="Search by name"),
    facility_id: str = Query(""),
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    query = db.table("clients").select("*")
    if search:
        query = query.ilike("full_name", f"%{search}%")
    if facility_id:
        query = query.eq("primary_facility_id", facility_id)
    result = query.order("full_name").execute()
    log_event("client", "list", "access", user["user_id"])
    return result.data


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    body: ClientCreate,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    data = body.model_dump(exclude_none=True)
    if "date_of_birth" in data and data["date_of_birth"]:
        data["date_of_birth"] = str(data["date_of_birth"])
    data["created_by"] = user["user_id"]
    data["updated_by"] = user["user_id"]
    result = db.table("clients").insert(data).execute()
    log_event("client", result.data[0]["id"], "create", user["user_id"])
    return result.data[0]


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: UUID,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    result = db.table("clients").select("*").eq("id", str(client_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")
    log_event("client", str(client_id), "access", user["user_id"])
    return result.data[0]


@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: UUID,
    body: ClientUpdate,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    existing = db.table("clients").select("*").eq("id", str(client_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Client not found")
    data = body.model_dump(exclude_none=True)
    if "date_of_birth" in data and data["date_of_birth"]:
        data["date_of_birth"] = str(data["date_of_birth"])
    data["updated_by"] = user["user_id"]
    result = db.table("clients").update(data).eq("id", str(client_id)).execute()
    log_event("client", str(client_id), "update", user["user_id"])
    return result.data[0]
