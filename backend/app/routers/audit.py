from fastapi import APIRouter, Depends, Query
from app.core.security import require_admin
from app.db.supabase import get_supabase

router = APIRouter(prefix="/audit-log", tags=["Audit Log"])


@router.get("")
def get_audit_log(
    entity_type: str = Query(""),
    entity_id: str = Query(""),
    action: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, le=500),
    user: dict = Depends(require_admin),
):
    db = get_supabase()
    offset = (page - 1) * page_size
    query = db.table("audit_log").select("*")
    if entity_type:
        query = query.eq("entity_type", entity_type)
    if entity_id:
        query = query.eq("entity_id", entity_id)
    if action:
        query = query.eq("action", action)
    result = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    return result.data
