from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from app.models.facility import FacilityCreate, FacilityUpdate, FacilityResponse
from app.core.security import get_current_user, require_admin, require_intake_or_above
from app.db.supabase import get_supabase
from app.services.audit_service import log_event

router = APIRouter(prefix="/facilities", tags=["Facilities"])


@router.get("", response_model=list[FacilityResponse])
def list_facilities(
    status: str = Query("active", description="Filter by status: active | inactive | all"),
    search: str = Query("", description="Search by name"),
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    query = db.table("facilities").select("*")
    if status != "all":
        query = query.eq("status", status)
    if search:
        query = query.ilike("name", f"%{search}%")
    result = query.order("name").execute()
    return result.data


@router.post("", response_model=FacilityResponse, status_code=201)
def create_facility(
    body: FacilityCreate,
    user: dict = Depends(require_admin),
):
    db = get_supabase()
    # Duplicate check
    existing = db.table("facilities").select("id").ilike("name", body.name).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail=f"Facility '{body.name}' already exists")
    data = body.model_dump(mode='json', exclude_none=True)
    data["created_by"] = user["user_id"]
    data["updated_by"] = user["user_id"]
    result = db.table("facilities").insert(data).execute()
    log_event("facility", result.data[0]["id"], "create", user["user_id"], new_value=result.data[0])
    return result.data[0]


@router.patch("/{facility_id}", response_model=FacilityResponse)
def update_facility(
    facility_id: UUID,
    body: FacilityUpdate,
    user: dict = Depends(require_admin),
):
    db = get_supabase()
    existing = db.table("facilities").select("*").eq("id", str(facility_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Facility not found")
    data = body.model_dump(mode='json', exclude_none=True)
    data["updated_by"] = user["user_id"]
    result = db.table("facilities").update(data).eq("id", str(facility_id)).execute()
    log_event("facility", str(facility_id), "update", user["user_id"],
              old_value=existing.data[0], new_value=result.data[0])
    return result.data[0]
