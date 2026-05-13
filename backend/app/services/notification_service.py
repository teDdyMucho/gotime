import httpx
from app.core.config import get_settings

settings = get_settings()

_DECISION_TYPE_MAP = {
    "accept":  "accepted",
    "decline": "declined",
    "return":  "returned",
}



def _log(
    trip_id: str,
    message_type: str,
    channel: str,
    triggered_by: str,
    recipient_ids: list[str] | None = None,
    status: str = "sent",
    error_detail: str | None = None,
    provider_message_id: str | None = None,
) -> None:
    from app.db.supabase import get_supabase
    try:
        get_supabase().table("notification_log").insert({
            "trip_id":             trip_id,
            "message_type":        message_type,
            "channel":             channel,
            "triggered_by":        triggered_by or None,
            "recipient_ids":       recipient_ids or [],
            "status":              status,
            "error_detail":        error_detail,
            "provider_message_id": provider_message_id,
        }).execute()
    except Exception:
        pass


async def _post_webhook(url: str, payload: dict) -> tuple[bool, str | None]:
    """POST to n8n. Returns (success, error_detail)."""
    if not settings.n8n_webhook_base_url:
        return False, "n8n not configured"
    headers = {}
    if settings.n8n_api_key:
        headers["X-N8N-API-KEY"] = settings.n8n_api_key
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            return True, None
    except httpx.HTTPStatusError as e:
        return False, f"HTTP {e.response.status_code}: {e.response.text[:200]}"
    except Exception as e:
        return False, str(e)[:200]


async def trigger_manual_alert(
    message_type: str,
    recipient_ids: list[str],
    trip_id: str | None = None,
    requestor_id: str = "",
    preferred_method: str = "email",
    sent_by: str = "",
    custom_message: str | None = None,
) -> None:
    from app.db.supabase import get_supabase
    db = get_supabase()

    # Fetch requestor details
    requestor_data: dict = {}
    if requestor_id:
        r = db.table("requestors").select(
            "name,phone,email,preferred_notification_method"
        ).eq("id", requestor_id).execute()
        if r.data:
            requestor_data = r.data[0]

    # Fetch trip details
    trip_data: dict = {}
    if trip_id:
        t = db.table("trip_requests").select(
            "trip_date,appointment_type"
        ).eq("id", trip_id).execute()
        if t.data:
            trip_data = t.data[0]

    channel = requestor_data.get("preferred_notification_method", preferred_method)

    payload = {
        "message_type":    message_type,
        "recipient_ids":   recipient_ids,
        "trip_id":         trip_id,
        "trip_date":       trip_data.get("trip_date"),
        "requestor_id":    requestor_id,
        "requestor_name":  requestor_data.get("name"),
        "requestor_phone": requestor_data.get("phone"),
        "requestor_email": requestor_data.get("email"),
        "method":          channel,
        "message":         custom_message,
    }

    url = f"{settings.n8n_webhook_base_url}{settings.n8n_manual_alert_webhook}"
    success, error = await _post_webhook(url, payload)

    _log(
        trip_id=trip_id or "",
        message_type=message_type,
        channel=channel,
        triggered_by=sent_by,
        recipient_ids=recipient_ids,
        status="sent" if success else "failed",
        error_detail=error,
    )


async def trigger_trip_decision(
    trip_id: str,
    decision: str,
    requestor_id: str,
    preferred_method: str,
    decline_reason: str | None = None,
    clarification_reason: str | None = None,
    review_notes: str | None = None,
    sent_by: str = "",
) -> None:
    from app.db.supabase import get_supabase
    db = get_supabase()

    # Fetch requestor details
    requestor_data: dict = {}
    if requestor_id:
        r = db.table("requestors").select(
            "name,phone,email,preferred_notification_method"
        ).eq("id", requestor_id).execute()
        if r.data:
            requestor_data = r.data[0]

    trip_data: dict = {}
    t = db.table("trip_requests").select("trip_date").eq("id", trip_id).execute()
    if t.data:
        trip_data = t.data[0]

    channel = requestor_data.get("preferred_notification_method", preferred_method)
    message_type = _DECISION_TYPE_MAP.get(decision, "general")

    base = {
        "trip_id":                       trip_id,
        "decision":                      decision,
        "requestor_id":                  requestor_id,
        "requestor_name":                requestor_data.get("name"),
        "requestor_phone":               requestor_data.get("phone"),
        "requestor_email":               requestor_data.get("email"),
        "trip_date":                     trip_data.get("trip_date"),
        "preferred_notification_method": channel,
    }

    if decision == "accept":
        payload = {**base, "review_notes": review_notes}
    elif decision == "decline":
        payload = {**base, "decline_reason": decline_reason, "review_notes": review_notes}
    elif decision == "return":
        payload = {**base, "clarification_reason": clarification_reason, "review_notes": review_notes}
    else:
        payload = base

    url = f"{settings.n8n_webhook_base_url}{settings.n8n_trip_decision_webhook}"
    success, error = await _post_webhook(url, payload)

    _log(
        trip_id=trip_id,
        message_type=message_type,
        channel=channel,
        triggered_by=sent_by,
        recipient_ids=[requestor_id],
        status="sent" if success else "failed",
        error_detail=error,
    )


async def trigger_trip_canceled(
    trip_id: str,
    requestor_id: str,
    preferred_method: str,
    cancellation_reason: str,
    sent_by: str = "",
) -> None:
    from app.db.supabase import get_supabase
    db = get_supabase()

    requestor_data: dict = {}
    if requestor_id:
        r = db.table("requestors").select(
            "name,phone,email,preferred_notification_method"
        ).eq("id", requestor_id).execute()
        if r.data:
            requestor_data = r.data[0]

    trip_data: dict = {}
    t = db.table("trip_requests").select("trip_date").eq("id", trip_id).execute()
    if t.data:
        trip_data = t.data[0]

    channel = requestor_data.get("preferred_notification_method", preferred_method)

    payload = {
        "trip_id":             trip_id,
        "requestor_id":        requestor_id,
        "requestor_name":      requestor_data.get("name"),
        "requestor_phone":     requestor_data.get("phone"),
        "requestor_email":     requestor_data.get("email"),
        "trip_date":           trip_data.get("trip_date"),
        "preferred_notification_method": channel,
        "cancellation_reason": cancellation_reason,
    }

    url = f"{settings.n8n_webhook_base_url}{settings.n8n_trip_canceled_webhook}"
    success, error = await _post_webhook(url, payload)

    _log(
        trip_id=trip_id,
        message_type="canceled",
        channel=channel,
        triggered_by=sent_by,
        recipient_ids=[requestor_id],
        status="sent" if success else "failed",
        error_detail=error,
    )
