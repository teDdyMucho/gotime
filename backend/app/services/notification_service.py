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
) -> None:
    """POST to n8n manual-alert webhook."""
    notification_type = _MESSAGE_TYPE_MAP.get(message_type, "general")
    log_notification(
        trip_id=trip_id or "",
        requestor_id=requestor_id,
        notification_type=notification_type,
        method=preferred_method,
        sent_by=sent_by,
        message_preview=f"Manual alert — {message_type.replace('_', ' ')}",
    )

    url = f"{settings.n8n_webhook_base_url}{settings.n8n_manual_alert_webhook}"
    payload = {
        "message_type": message_type,
        "recipient_ids": recipient_ids,
        "trip_id": trip_id,
    }
    await _post_webhook(url, payload)


async def _post_webhook(url: str, payload: dict) -> None:
    if not settings.n8n_webhook_base_url:
        return
    headers = {}
    if settings.n8n_api_key:
        headers["X-N8N-API-KEY"] = settings.n8n_api_key
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
    except Exception:
        pass
