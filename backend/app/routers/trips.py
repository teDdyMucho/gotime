from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
import csv, io
from app.models.trip import TripCreate, TripReviewAction, TripCancelAction, TripResponse
from app.core.security import require_intake_or_above, require_dispatcher_or_above
from app.db.supabase import get_supabase
from app.services.audit_service import log_event
from app.services.notification_service import trigger_trip_decision, trigger_trip_canceled
from app.services.encryption import encrypt_record, decrypt_record, TRIP_PHI_FIELDS

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.post("", response_model=TripResponse, status_code=201)
def create_trip(
    body: TripCreate,
    request: Request,
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    data = body.model_dump(mode='json', exclude_none=True)
    if "expected_revenue" in data:
        data["expected_revenue"] = float(data["expected_revenue"])
    data["intake_staff_user_id"] = user["user_id"]
    data["intake_date"] = datetime.now(timezone.utc).isoformat()
    data["review_state"] = "pending"
    data = encrypt_record(data, TRIP_PHI_FIELDS)
    result = db.table("trip_requests").insert(data).execute()
    log_event("trip_request", result.data[0]["id"], "create", user["user_id"],
              ip_address=request.client.host if request.client else None,
              new_value={"review_state": "pending"})
    return decrypt_record(result.data[0], TRIP_PHI_FIELDS)


@router.get("", response_model=list[TripResponse])
def list_trips(
    review_state: str = Query("", description="Filter by review_state"),
    facility_id: str = Query(""),
    pay_source_id: str = Query(""),
    urgency_level: str = Query(""),
    missing_info_flag: Optional[bool] = Query(None),
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
    return [decrypt_record(row, TRIP_PHI_FIELDS) for row in result.data]


@router.get("/export")
def export_trips_csv(
    review_state: str = Query(""),
    facility_id: str = Query(""),
    pay_source_id: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
    user: dict = Depends(require_dispatcher_or_above),
):
    """Export filtered trips as a CSV download."""
    db = get_supabase()
    query = db.table("trip_requests").select("*")
    if review_state:
        query = query.eq("review_state", review_state)
    if facility_id:
        query = query.eq("facility_id", facility_id)
    if pay_source_id:
        query = query.eq("pay_source_id", pay_source_id)
    if date_from:
        query = query.gte("trip_date", date_from)
    if date_to:
        query = query.lte("trip_date", date_to)
    raw_trips = query.order("trip_date").execute().data
    trips = [decrypt_record(t, TRIP_PHI_FIELDS) for t in raw_trips]

    # Build lookup maps for human-readable names
    facilities   = {f["id"]: f["name"] for f in db.table("facilities").select("id,name").execute().data}
    requestors   = {r["id"]: r["name"] for r in db.table("requestors").select("id,name").execute().data}
    clients      = {c["id"]: c["full_name"] for c in db.table("clients").select("id,full_name").execute().data}
    pay_sources  = {p["id"]: p["name"] for p in db.table("pay_sources").select("id,name").execute().data}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Trip ID", "Trip Date", "Intake Date", "State", "Urgency",
        "Client", "Facility", "Requestor", "Pay Source",
        "Appointment Type", "Trip Type",
        "Pickup Address", "Dropoff Address",
        "Expected Revenue", "Final Revenue",
        "Decline Reason", "Cancellation Reason",
        "Missing Info", "Trip Order ID", "Review Notes",
    ])
    for t in trips:
        writer.writerow([
            t.get("id", ""),
            t.get("trip_date", ""),
            t.get("intake_date", "")[:10] if t.get("intake_date") else "",
            t.get("review_state", ""),
            t.get("urgency_level", ""),
            clients.get(t.get("client_id", ""), ""),
            facilities.get(t.get("facility_id", ""), ""),
            requestors.get(t.get("requestor_id", ""), ""),
            pay_sources.get(t.get("pay_source_id", ""), ""),
            t.get("appointment_type", ""),
            t.get("trip_type", ""),
            t.get("pickup_address", ""),
            t.get("dropoff_address", ""),
            t.get("expected_revenue", ""),
            t.get("final_revenue", ""),
            t.get("decline_reason", ""),
            t.get("cancellation_reason", ""),
            "Yes" if t.get("missing_info_flag") else "No",
            t.get("trip_order_id", ""),
            t.get("review_notes", ""),
        ])

    output.seek(0)
    filename = f"gotime_trips_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


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
    return decrypt_record(result.data[0], TRIP_PHI_FIELDS)


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
        clarification_reason=body.clarification_reason if body.action == "return" else None,
        review_notes=body.review_notes,
        sent_by=user["user_id"],
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
        sent_by=user["user_id"],
    )
    return result.data[0]
