import httpx
from app.core.config import get_settings

settings = get_settings()


async def trigger_trip_decision(
    trip_id: str,
    decision: str,
    requestor_id: str,
    preferred_method: str,
    decline_reason: str | None = None,
) -> None:
    """POST to n8n trip-decision webhook."""
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
) -> None:
    """POST to n8n trip-canceled webhook."""
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
) -> None:
    """POST to n8n manual-alert webhook."""
    url = f"{settings.n8n_webhook_base_url}{settings.n8n_manual_alert_webhook}"
    payload = {
        "message_type": message_type,
        "recipient_ids": recipient_ids,
        "trip_id": trip_id,
    }
    await _post_webhook(url, payload)


async def _post_webhook(url: str, payload: dict) -> None:
    headers = {}
    if settings.n8n_api_key:
        headers["X-N8N-API-KEY"] = settings.n8n_api_key
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
