from fastapi import APIRouter, Depends, Query
from app.core.security import require_dispatcher_or_above
from app.db.supabase import get_supabase
from collections import Counter

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


@router.get("/by-pay-source")
def by_pay_source(
    date_from: str = Query(""),
    date_to: str = Query(""),
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    query = db.table("trip_requests").select("pay_source_id, review_state, expected_revenue, final_revenue")
    if date_from:
        query = query.gte("trip_date", date_from)
    if date_to:
        query = query.lte("trip_date", date_to)
    trips = query.execute().data

    pay_sources_result = db.table("pay_sources").select("id, name").execute()
    ps_map = {p["id"]: p["name"] for p in pay_sources_result.data}

    grouped: dict = {}
    for t in trips:
        psid = t.get("pay_source_id") or "__none__"
        if psid not in grouped:
            grouped[psid] = {
                "pay_source_id": psid if psid != "__none__" else None,
                "pay_source_name": ps_map.get(psid, "Unknown") if psid != "__none__" else "No Pay Source",
                "total": 0, "accepted": 0, "declined": 0, "completed": 0,
                "canceled": 0, "arrived_canceled": 0, "completed_revenue": 0.0,
            }
        grouped[psid]["total"] += 1
        state = t.get("review_state", "")
        if state in grouped[psid]:
            grouped[psid][state] += 1
        if state == "completed":
            grouped[psid]["completed_revenue"] += float(t.get("final_revenue") or t.get("expected_revenue") or 0)
    return list(grouped.values())


@router.get("/quality")
def quality(
    date_from: str = Query(""),
    date_to: str = Query(""),
    facility_id: str = Query(""),
    user: dict = Depends(require_dispatcher_or_above),
):
    db = get_supabase()
    query = db.table("trip_requests").select(
        "review_state, decline_reason, cancellation_reason, missing_info_flag, intake_date, reviewed_at"
    )
    if date_from:
        query = query.gte("trip_date", date_from)
    if date_to:
        query = query.lte("trip_date", date_to)
    if facility_id:
        query = query.eq("facility_id", facility_id)
    trips = query.execute().data

    total = len(trips)
    missing_count = sum(1 for t in trips if t.get("missing_info_flag"))
    returned_count = sum(1 for t in trips if t.get("review_state") == "returned")

    decline_reasons = Counter(
        t["decline_reason"] for t in trips
        if t.get("review_state") == "declined" and t.get("decline_reason")
    )
    cancel_reasons = Counter(
        t["cancellation_reason"] for t in trips
        if t.get("review_state") in ("canceled", "arrived_canceled") and t.get("cancellation_reason")
    )

    # Avg turnaround: hours between intake_date and reviewed_at for reviewed trips
    turnaround_hours = []
    from datetime import datetime, timezone
    for t in trips:
        if t.get("intake_date") and t.get("reviewed_at") and t.get("review_state") not in ("pending", "returned"):
            try:
                intook = datetime.fromisoformat(t["intake_date"].replace("Z", "+00:00"))
                reviewed = datetime.fromisoformat(t["reviewed_at"].replace("Z", "+00:00"))
                diff = (reviewed - intook).total_seconds() / 3600
                if 0 <= diff <= 720:  # cap at 30 days to ignore outliers
                    turnaround_hours.append(diff)
            except Exception:
                pass

    avg_turnaround_hours = round(sum(turnaround_hours) / len(turnaround_hours), 2) if turnaround_hours else 0

    return {
        "missing_info_rate": round((missing_count / total * 100), 1) if total else 0,
        "missing_info_count": missing_count,
        "return_rate": round((returned_count / total * 100), 1) if total else 0,
        "returned_count": returned_count,
        "avg_turnaround_hours": avg_turnaround_hours,
        "decline_reasons": [{"reason": k, "count": v} for k, v in decline_reasons.most_common()],
        "cancellation_reasons": [{"reason": k, "count": v} for k, v in cancel_reasons.most_common()],
    }
