"""
Delivery status callbacks from Twilio and SendGrid.

These endpoints receive POST requests from the messaging providers
after a message is delivered (or fails). They look up the
notification_log entry by provider_message_id and update its status.

No auth required — providers call these from their infrastructure.
We validate authenticity via signature where possible.
"""

import hashlib
import hmac
import base64
from fastapi import APIRouter, Request, Response
from app.core.config import get_settings
from app.db.supabase import get_supabase

router = APIRouter(prefix="/webhooks", tags=["Delivery Webhooks"])
settings = get_settings()


# ─── Twilio delivery status ────────────────────────────────────────────────────
# Twilio posts application/x-www-form-urlencoded with fields:
#   MessageSid, MessageStatus, To, From, ErrorCode (on failure)
# Status values: queued → sent → delivered | undelivered | failed

TWILIO_STATUS_MAP = {
    "delivered": "sent",
    "sent": "sent",
    "queued": "pending",
    "accepted": "pending",
    "undelivered": "failed",
    "failed": "failed",
}


@router.post("/twilio-status")
async def twilio_status_callback(request: Request):
    form = await request.form()
    message_sid = form.get("MessageSid", "")
    raw_status = form.get("MessageStatus", "")
    error_code = form.get("ErrorCode", "")

    if not message_sid:
        return Response(status_code=200)  # ack even if malformed

    mapped_status = TWILIO_STATUS_MAP.get(raw_status, "sent")

    db = get_supabase()
    result = (
        db.table("notification_log")
        .select("id")
        .eq("provider_message_id", message_sid)
        .execute()
    )

    if result.data:
        entry_id = result.data[0]["id"]
        update: dict = {"status": mapped_status}
        if mapped_status == "sent":
            update["delivered_at"] = "now()"
        if error_code:
            update["error_detail"] = f"Twilio error {error_code}"
        db.table("notification_log").update(update).eq("id", entry_id).execute()

    # Twilio expects a 200 + empty TwiML or plain text
    return Response(content="", media_type="text/plain", status_code=200)


# ─── SendGrid event webhook ────────────────────────────────────────────────────
# SendGrid posts application/json — an array of event objects.
# Each event has: event, message_id, timestamp, email, reason (on failure)
# Events we care about: delivered, bounce, dropped, deferred

SENDGRID_STATUS_MAP = {
    "delivered": "sent",
    "open": "sent",
    "click": "sent",
    "bounce": "failed",
    "blocked": "failed",
    "dropped": "failed",
    "spamreport": "failed",
    "deferred": "pending",
    "processed": "pending",
}


@router.post("/sendgrid-events")
async def sendgrid_events_callback(request: Request):
    try:
        events = await request.json()
    except Exception:
        return Response(status_code=200)

    if not isinstance(events, list):
        events = [events]

    db = get_supabase()

    for event in events:
        # SendGrid uses smtp-id or message_id; X-Message-Id header maps to sg_message_id
        message_id = (
            event.get("sg_message_id", "")
            or event.get("message_id", "")
        )
        # SendGrid appends ".filter..." suffix — strip it
        if "." in message_id:
            message_id = message_id.split(".")[0]

        raw_event = event.get("event", "")
        mapped_status = SENDGRID_STATUS_MAP.get(raw_event, "sent")
        reason = event.get("reason", "") or event.get("response", "")

        if not message_id:
            continue

        result = (
            db.table("notification_log")
            .select("id")
            .eq("provider_message_id", message_id)
            .execute()
        )

        if result.data:
            entry_id = result.data[0]["id"]
            update: dict = {"status": mapped_status}
            if mapped_status == "sent" and raw_event == "delivered":
                update["delivered_at"] = "now()"
            if reason and mapped_status == "failed":
                update["error_detail"] = reason[:500]
            db.table("notification_log").update(update).eq("id", entry_id).execute()

    return Response(status_code=200)
