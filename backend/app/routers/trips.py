from fastapi import APIRouter, Depends, HTTPException, Query, Request
from uuid import UUID
from datetime import datetime, timezone
from app.models.trip import TripCreate, TripReviewAction, TripCancelAction, TripResponse
from app.core.security import require_intake_or_above, require_dispatcher_or_above
from app.db.supabase import get_supabase
from app.services.audit_service import log_event
from app.services.notification_service import trigger_trip_decision, trigger_trip_canceled

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.post("", response_model=TripResponse, status_code=201)
def create_trip(
    body: TripCreate,
    request: Request,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    data = body.model_dump(exclude_none=True)
    # Convert date/time fields to strings
    for field in ["trip_date", "appointment_time", "requested_pickup_time"]:
        if field in data and data[field]:
            data[field] = str(data[field])
    if "expected_revenue" in data:
        data["expected_revenue"] = float(data["expected_revenue"])
    data["intake_staff_user_id"] = user["user_id"]
    data["intake_date"] = datetime.now(timezone.utc).isoformat()
    data["review_state"] = "pending"
    data["created_by"] = user["user_id"]
    data["updated_by"] = user["user_id"]
    result = db.table("trip_requests").insert(data).execute()
    log_event("trip_request", result.data[0]["id"], "create", user["user_id"],
              ip_address=request.client.host if request.client else None,
              new_value={"review_state": "pending"})
    return result.data[0]


@router.get("", response_model=list[TripResponse])
def list_trips(
    review_state: str = Query("", description="Filter by review_state"),
    facility_id: str = Query(""),
    pay_source_id: str = Query(""),
    urgency_level: str = Query(""),
    missing_info_flag: bool = Query(None),
    trip_date: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, le=200),
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    offset = (page - 1) * page_size
    query = db.table("trip_requests").select("*")
    if review_state:
        query = query.eq("review_state", review_state)
    if facility_id:
        query = query.eq("facility_id", facility_id)
    if pay_source_id:
        query = query.eq("pay_source_id", pay_source_id)
    if urgency_level:
        query = query.eq("urgency_level", urgency_level)
    if missing_info_flag is not None:
        query = query.eq("missing_info_flag", missing_info_flag)
    if trip_date:
        query = query.eq("trip_date", trip_date)
    result = query.order("trip_date").order("intake_date").range(offset, offset + page_size - 1).execute()
    return result.data


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: UUID,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    result = db.table("trip_requests").select("*").eq("id", str(trip_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    log_event("trip_request", str(trip_id), "access", user["user_id"])
    return result.data[0]


@router.patch("/{trip_id}/review", response_model=TripResponse)
async def review_trip(
    trip_id: UUID,
    body: TripReviewAction,
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    existing = db.table("trip_requests").select("*").eq("id", str(trip_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = existing.data[0]
    if trip["review_state"] not in ("pending", "returned"):
        raise HTTPException(status_code=400, detail=f"Trip is already in state '{trip['review_state']}'")

    # Validate reason code requirements
    if body.action == "decline" and not body.decline_reason:
        raise HTTPException(status_code=422, detail="decline_reason is required when declining a trip")
    if body.action == "return" and not body.clarification_reason:
        raise HTTPException(status_code=422, detail="clarification_reason is required when returning a trip")

    state_map = {"accept": "accepted", "decline": "declined", "return": "returned"}
    new_state = state_map[body.action]

    update_data = {
        "review_state": new_state,
        "reviewed_by": user["user_id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "review_notes": body.review_notes,
        "updated_by": user["user_id"],
    }
    if body.action == "accept":
        update_data["outcome_category"] = "accepted"
        if body.final_revenue is not None:
            update_data["final_revenue"] = float(body.final_revenue)
    if body.action == "decline":
        update_data["decline_reason"] = body.decline_reason
        update_data["outcome_category"] = "declined"
    if body.action == "return":
        update_data["clarification_reason"] = body.clarification_reason

    result = db.table("trip_requests").update(update_data).eq("id", str(trip_id)).execute()
    log_event("trip_request", str(trip_id), "update", user["user_id"],
              old_value={"review_state": trip["review_state"]},
              new_value={"review_state": new_state})

    # Trigger notification via n8n
    requestor = db.table("requestors").select("preferred_notification_method").eq(
        "id", trip["requestor_id"]).execute()
    preferred_method = requestor.data[0]["preferred_notification_method"] if requestor.data else "both"
    await trigger_trip_decision(
        trip_id=str(trip_id),
        decision=body.action,
        requestor_id=trip["requestor_id"],
        preferred_method=preferred_method,
        decline_reason=body.decline_reason,
    )
    return result.data[0]


@router.patch("/{trip_id}/cancel", response_model=TripResponse)
async def cancel_trip(
    trip_id: UUID,
    body: TripCancelAction,
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    existing = db.table("trip_requests").select("*").eq("id", str(trip_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = existing.data[0]
    new_state = "arrived_canceled" if body.cancellation_reason == "arrived_cancel" else "canceled"

    update_data = {
        "review_state": new_state,
        "cancellation_reason": body.cancellation_reason,
        "outcome_category": new_state,
        "review_notes": body.review_notes,
        "updated_by": user["user_id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    result = db.table("trip_requests").update(update_data).eq("id", str(trip_id)).execute()
    log_event("trip_request", str(trip_id), "update", user["user_id"],
              old_value={"review_state": trip["review_state"]},
              new_value={"review_state": new_state})

    requestor = db.table("requestors").select("preferred_notification_method").eq(
        "id", trip["requestor_id"]).execute()
    preferred_method = requestor.data[0]["preferred_notification_method"] if requestor.data else "both"
    await trigger_trip_canceled(
        trip_id=str(trip_id),
        requestor_id=trip["requestor_id"],
        preferred_method=preferred_method,
        cancellation_reason=body.cancellation_reason,
    )
    return result.data[0]
