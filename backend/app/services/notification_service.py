import httpx
from app.core.config import get_settings

settings = get_settings()

_DECISION_TYPE_MAP = {
    "accept": "accepted",
    "decline": "declined",
    "return": "returned",
}

_MESSAGE_TYPE_MAP = {
    "trip_decision": "general",
    "trip_canceled": "canceled",
    "manual_alert": "general",
    "general_service_alert": "general",
}


def log_notification(
    trip_id: str,
    requestor_id: str,
    notification_type: str,
    method: str,
    sent_by: str,
    message_preview: str | None = None,
) -> None:
    """Insert a record into notification_log immediately when a notification is triggered."""
    from app.db.supabase import get_supabase
    try:
        db = get_supabase()
        db.table("notification_log").insert({
            "trip_id": trip_id,
            "requestor_id": requestor_id,
            "notification_type": notification_type,
            "method": method,
            "status": "pending" if settings.n8n_webhook_base_url else "failed",
            "message_preview": message_preview,
            "sent_by": sent_by,
        }).execute()
    except Exception:
        pass


async def trigger_trip_decision(
    trip_id: str,
    decision: str,
    requestor_id: str,
    preferred_method: str,
    decline_reason: str | None = None,
    sent_by: str = "",
) -> None:
    """POST to n8n trip-decision webhook."""
    notification_type = _DECISION_TYPE_MAP.get(decision, "general")
    preview = f"Trip {notification_type}"
    if decline_reason:
        preview += f" — {decline_reason.replace('_', ' ')}"

    log_notification(
        trip_id=trip_id,
        requestor_id=requestor_id,
        notification_type=notification_type,
        method=preferred_method,
        sent_by=sent_by,
        message_preview=preview,
    )

    url = f"{settings.n8n_webhook_base_url}{settings.n8n_trip_decision_webhook}"
    payload = {
        "trip_id": trip_id,
        "decision": decision,
        "requestor_id": requestor_id,
        "preferred_notification_method": preferred_method,
        "decline_reason": decline_reason,
    }
    await _post_webhook(url, payload)


async def trigger_trip_canceled(
    trip_id: str,
    requestor_id: str,
    preferred_method: str,
    cancellation_reason: str,
    sent_by: str = "",
) -> None:
    """POST to n8n trip-canceled webhook."""
    log_notification(
        trip_id=trip_id,
        requestor_id=requestor_id,
        notification_type="canceled",
        method=preferred_method,
        sent_by=sent_by,
        message_preview=f"Trip canceled — {cancellation_reason.replace('_', ' ')}",
    )

    url = f"{settings.n8n_webhook_base_url}{settings.n8n_trip_canceled_webhook}"
    payload = {
        "trip_id": trip_id,
        "requestor_id": requestor_id,
        "preferred_notification_method": preferred_method,
        "cancellation_reason": cancellation_reason,
    }
    await _post_webhook(url, payload)


async def trigger_manual_alert(
    message_type: str,
    recipient_ids: list[str],
    trip_id: str | None = None,
    requestor_id: str = "",
    preferred_method: str = "email",
    sent_by: str = "",
    custom_message: str | None = None,
) -> None:
    """POST to n8n manual-alert webhook."""
    notification_type = _MESSAGE_TYPE_MAP.get(message_type, "general")
    preview = custom_message if custom_message else f"Manual alert — {message_type.replace('_', ' ')}"
    log_notification(
        trip_id=trip_id or "",
        requestor_id=requestor_id,
        notification_type=notification_type,
        method=preferred_method,
        sent_by=sent_by,
        message_preview=preview,
    )

    url = f"{settings.n8n_webhook_base_url}{settings.n8n_manual_alert_webhook}"

    # Fetch requestor details to include in payload for n8n
    from app.db.supabase import get_supabase
    db = get_supabase()
    requestor_data = {}
    if requestor_id:
        r = db.table("requestors").select("name,phone,email,preferred_notification_method").eq("id", requestor_id).execute()
        if r.data:
            requestor_data = r.data[0]

    # Fetch trip details
    trip_data = {}
    if trip_id:
        t = db.table("trip_requests").select("trip_date,appointment_type,client_id,facility_id").eq("id", trip_id).execute()
        if t.data:
            trip_data = t.data[0]

    payload = {
        "message_type": message_type,
        "recipient_ids": recipient_ids,
        "trip_id": trip_id,
        "trip_date": trip_data.get("trip_date"),
        "requestor_id": requestor_id,
        "requestor_name": requestor_data.get("name"),
        "requestor_phone": requestor_data.get("phone"),
        "requestor_email": requestor_data.get("email"),
        "method": requestor_data.get("preferred_notification_method", preferred_method),
        "message": custom_message,
        "custom_message": custom_message,
    }
    await _post_webhook(url, payload)


async def _post_webhook(url: str, payload: dict) -> None:
    if not settings.n8n_webhook_base_url:
        return
    headers = {}
    if settings.n8n_api_key:
        headers["X-N8N-API-KEY"] = settings.n8n_api_key
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
