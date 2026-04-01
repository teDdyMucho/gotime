from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List
from app.core.security import require_dispatcher_or_above
from app.db.supabase import get_supabase
from app.services.notification_service import trigger_manual_alert

router = APIRouter(prefix="/trips", tags=["Notifications"])


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

    recipient_ids = body.recipient_ids or [trip.data[0]["requestor_id"]]
    await trigger_manual_alert(
        message_type=body.message_type,
        recipient_ids=recipient_ids,
        trip_id=str(trip_id),
    )
    return {"status": "notification triggered", "trip_id": str(trip_id)}
