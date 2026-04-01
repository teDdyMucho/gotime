from fastapi import APIRouter, Depends, Query
from app.core.security import require_dispatcher_or_above
from app.db.supabase import get_supabase
from fastapi.responses import StreamingResponse
import csv
import io

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/summary")
def summary(
    date_from: str = Query(""),
    date_to: str = Query(""),
    facility_id: str = Query(""),
    pay_source_id: str = Query(""),
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    query = db.table("trip_requests").select("review_state, outcome_category")
    if date_from:
        query = query.gte("trip_date", date_from)
    if date_to:
        query = query.lte("trip_date", date_to)
    if facility_id:
        query = query.eq("facility_id", facility_id)
    if pay_source_id:
        query = query.eq("pay_source_id", pay_source_id)
    result = query.execute()
    trips = result.data

    counts = {
        "total": len(trips),
        "pending": 0, "accepted": 0, "declined": 0,
        "completed": 0, "canceled": 0, "arrived_canceled": 0, "returned": 0,
    }
    for t in trips:
        state = t.get("review_state", "pending")
        if state in counts:
            counts[state] += 1
    return counts


@router.get("/by-facility")
def by_facility(
    date_from: str = Query(""),
    date_to: str = Query(""),
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    query = db.table("trip_requests").select("facility_id, review_state, expected_revenue, final_revenue")
    if date_from:
        query = query.gte("trip_date", date_from)
    if date_to:
        query = query.lte("trip_date", date_to)
    trips = query.execute().data

    facilities_query = db.table("facilities").select("id, name").execute()
    facility_map = {f["id"]: f["name"] for f in facilities_query.data}

    grouped: dict = {}
    for t in trips:
        fid = t["facility_id"]
        if fid not in grouped:
            grouped[fid] = {"facility_id": fid, "facility_name": facility_map.get(fid, "Unknown"),
                            "total": 0, "accepted": 0, "declined": 0, "completed": 0,
                            "canceled": 0, "arrived_canceled": 0}
        grouped[fid]["total"] += 1
        state = t.get("review_state", "")
        if state in grouped[fid]:
            grouped[fid][state] += 1
    return list(grouped.values())


@router.get("/revenue")
def revenue(
    date_from: str = Query(""),
    date_to: str = Query(""),
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    query = db.table("trip_requests").select("review_state, expected_revenue, final_revenue")
    if date_from:
        query = query.gte("trip_date", date_from)
    if date_to:
        query = query.lte("trip_date", date_to)
    trips = query.execute().data

    result = {"expected_total": 0, "accepted_revenue": 0, "completed_revenue": 0,
              "declined_opportunity": 0, "canceled_revenue": 0}
    for t in trips:
        exp = float(t.get("expected_revenue") or 0)
        fin = float(t.get("final_revenue") or exp)
        state = t.get("review_state", "")
        result["expected_total"] += exp
        if state == "accepted":
            result["accepted_revenue"] += exp
        elif state == "completed":
            result["completed_revenue"] += fin
        elif state == "declined":
            result["declined_opportunity"] += exp
        elif state in ("canceled", "arrived_canceled"):
            result["canceled_revenue"] += exp
    return result
