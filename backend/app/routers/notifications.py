from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List
from app.core.security import require_dispatcher_or_above, require_intake_or_above
from app.db.supabase import get_supabase
from app.services.notification_service import trigger_manual_alert

# POST /api/trips/{trip_id}/notify  (kept at /trips for frontend compat)
router = APIRouter(prefix="/trips", tags=["Notifications"])

# GET  /api/notifications  (log list)
log_router = APIRouter(prefix="/notifications", tags=["Notification Log"])


class ManualNotifyRequest(BaseModel):
    message_type: str
    recipient_ids: Optional[List[str]] = None


@router.post("/{trip_id}/notify")
async def manual_notify(
    trip_id: UUID,
    body: ManualNotifyRequest,
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    trip = db.table("trip_requests").select("requestor_id").eq("id", str(trip_id)).execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    requestor_id = trip.data[0]["requestor_id"]
    recipient_ids = body.recipient_ids or [requestor_id]

    requestor = db.table("requestors").select("preferred_notification_method").eq("id", requestor_id).execute()
    preferred_method = requestor.data[0]["preferred_notification_method"] if requestor.data else "email"

    await trigger_manual_alert(
        message_type=body.message_type,
        recipient_ids=recipient_ids,
        trip_id=str(trip_id),
        requestor_id=requestor_id,
        preferred_method=preferred_method,
        sent_by=user["user_id"],
    )
    return {"status": "notification triggered", "trip_id": str(trip_id)}


@log_router.get("")
def list_notifications(
    trip_id: str = Query(""),
    user: dict = Depends(require_intake_or_above),
):
    db = get_supabase()
    query = db.table("notification_log").select("*").order("created_at", desc=True)
    if trip_id:
        query = query.eq("trip_id", trip_id)
    result = query.execute()

    # Map DB column names to what the frontend expects
    mapped = []
    for row in result.data:
        mapped.append({
            "id": row["id"],
            "trip_id": row["trip_id"],
            "requestor_id": row.get("requestor_id") or "",
            "notification_type": row.get("notification_type") or row.get("message_type") or "general",
            "method": row.get("method") or row.get("channel") or "email",
            "status": row.get("status", "sent"),
            "message_preview": row.get("message_preview") or row.get("error_detail"),
            "sent_by": row.get("sent_by") or row.get("triggered_by") or "",
            "created_at": row["created_at"],
        })
    return mapped
