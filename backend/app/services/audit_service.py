from app.db.supabase import get_supabase
from datetime import datetime, timezone
from typing import Any, Optional


def log_event(
    entity_type: str,
    entity_id: str,
    action: str,
    user_id: Optional[str],
    ip_address: Optional[str] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    changed_fields: Optional[list] = None,
) -> None:
    """Write an append-only audit log entry."""
    db = get_supabase()
    db.table("audit_log").insert({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "user_id": user_id,
        "ip_address": ip_address,
        "old_value": old_value,
        "new_value": new_value,
        "changed_fields": changed_fields or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
