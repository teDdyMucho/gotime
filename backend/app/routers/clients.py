from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from app.models.client import ClientCreate, ClientUpdate, ClientResponse
from app.core.security import require_intake_or_above
from app.db.supabase import get_supabase
from app.services.audit_service import log_event
from app.services.encryption import encrypt_record, decrypt_record, CLIENT_PHI_FIELDS

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=list[ClientResponse])
def list_clients(
    search: str = Query("", description="Search by name"),
    facility_id: str = Query(""),
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    query = db.table("clients").select("*")
    # NOTE: When PHI encryption is active, full_name is stored encrypted so
    # DB-level ILIKE won't work. We load all records and filter in Python instead.
    if facility_id:
        query = query.eq("primary_facility_id", facility_id)
    result = query.order("full_name").execute()
    decrypted = [decrypt_record(row, CLIENT_PHI_FIELDS) for row in result.data]
    if search:
        search_lower = search.lower()
        decrypted = [r for r in decrypted if search_lower in (r.get("full_name") or "").lower()]
    return decrypted


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    body: ClientCreate,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    data = body.model_dump(mode='json', exclude_none=True)
    data["created_by"] = user["user_id"]
    data["updated_by"] = user["user_id"]
    data = encrypt_record(data, CLIENT_PHI_FIELDS)
    result = db.table("clients").insert(data).execute()
    log_event("client", result.data[0]["id"], "create", user["user_id"])
    return decrypt_record(result.data[0], CLIENT_PHI_FIELDS)


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
    return decrypt_record(result.data[0], CLIENT_PHI_FIELDS)


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
    data = body.model_dump(mode='json', exclude_none=True)
    data["updated_by"] = user["user_id"]
    data = encrypt_record(data, CLIENT_PHI_FIELDS)
    result = db.table("clients").update(data).eq("id", str(client_id)).execute()
    log_event("client", str(client_id), "update", user["user_id"])
    return decrypt_record(result.data[0], CLIENT_PHI_FIELDS)


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: UUID,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    existing = db.table("clients").select("id").eq("id", str(client_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Client not found")
    try:
        db.table("clients").delete().eq("id", str(client_id)).execute()
    except Exception as e:
        if "foreign key" in str(e).lower() or "23503" in str(e):
            raise HTTPException(status_code=409, detail="Cannot delete — this client has linked trips. Remove them first.")
        raise HTTPException(status_code=500, detail=str(e))
    log_event("client", str(client_id), "delete", user["user_id"])
