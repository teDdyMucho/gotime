from pydantic import BaseModel, field_validator
from uuid import UUID
from typing import Optional, Literal, Any
from datetime import date, time, datetime
from decimal import Decimal

IntakeChannel = Literal["phone", "email", "fax", "portal", "internal"]
TripType = Literal["one_way", "round_trip", "multi_trip"]
UrgencyLevel = Literal["standard", "urgent", "emergency"]
ReviewState = Literal["pending", "accepted", "declined", "returned", "canceled", "completed", "arrived_canceled"]
MobilityLevel = Literal["ambulatory", "wheelchair", "stretcher", "other"]

DeclineReason = Literal[
    "outside_service_area", "no_availability", "insufficient_notice",
    "missing_authorization", "unsupported_mobility", "pay_source_issue",
    "duplicate_request", "request_incomplete", "requestor_unreachable",
    "not_operationally_feasible", "other"
]

CancellationReason = Literal[
    "facility_canceled", "requestor_canceled", "client_canceled",
    "no_show", "appointment_changed", "authorization_issue",
    "duplicate_booking", "operational_issue", "arrived_cancel",
    "inclement_weather", "other"
]

OutcomeCategory = Literal["accepted", "declined", "completed", "canceled", "arrived_canceled"]


class TripCreate(BaseModel):
    # Intake section
    intake_channel: IntakeChannel
    requestor_id: UUID
    facility_id: Optional[UUID] = None        # Nullable — N/A for walk-in / no-facility
    callback_phone: Optional[str] = None
    reply_email: Optional[str] = None
    # Client section
    client_id: UUID
    pickup_address: Optional[str] = None      # PHI — auto-filled from facility
    dropoff_address: Optional[str] = None     # PHI
    dropoff_location_name: Optional[str] = None  # e.g. "Mass General Hospital"
    dropoff_notes: Optional[str] = None       # Floor/suite/dept
    mobility_level: Optional[MobilityLevel] = None
    escort_needed: bool = False
    special_notes: Optional[str] = None       # PHI
    # Trip section
    trip_date: date
    appointment_time: Optional[time] = None
    requested_pickup_time: Optional[time] = None
    will_call: bool = False
    trip_type: TripType = "one_way"
    return_time: Optional[str] = None         # Return pickup time for round trips
    return_details: Optional[str] = None      # Legacy — kept for backward compat
    trip_legs: Optional[list] = None          # Additional legs for multi-trip (JSON)
    urgency_level: UrgencyLevel = "standard"
    appointment_type: Optional[str] = None    # PHI
    # Financial section
    pay_source_id: Optional[UUID] = None
    expected_revenue: Optional[Decimal] = None
    trip_order_id: Optional[str] = None
    billing_notes: Optional[str] = None
    # Quality section
    intake_notes: Optional[str] = None        # Shown as "Dispatch Notes" in UI
    missing_info_flag: bool = False
    internal_warning: Optional[str] = None


class TripReviewAction(BaseModel):
    action: Literal["accept", "decline", "return"]
    review_notes: Optional[str] = None
    decline_reason: Optional[DeclineReason] = None
    clarification_reason: Optional[str] = None
    final_revenue: Optional[Decimal] = None


class TripCancelAction(BaseModel):
    cancellation_reason: CancellationReason
    review_notes: Optional[str] = None


class TripResponse(BaseModel):
    id: UUID
    intake_channel: IntakeChannel
    intake_date: datetime
    intake_staff_user_id: Optional[UUID] = None
    requestor_id: UUID
    facility_id: Optional[UUID] = None
    callback_phone: Optional[str] = None
    reply_email: Optional[str] = None
    client_id: UUID
    pickup_address: Optional[str] = None
    dropoff_address: Optional[str] = None
    dropoff_location_name: Optional[str] = None
    dropoff_notes: Optional[str] = None
    mobility_level: Optional[MobilityLevel] = None
    escort_needed: bool
    special_notes: Optional[str] = None
    trip_date: date
    appointment_time: Optional[time] = None
    requested_pickup_time: Optional[time] = None
    will_call: bool
    trip_type: TripType
    return_time: Optional[str] = None
    return_details: Optional[str] = None
    trip_legs: Optional[list] = None
    urgency_level: UrgencyLevel
    appointment_type: Optional[str] = None
    pay_source_id: Optional[UUID] = None
    expected_revenue: Optional[Decimal] = None
    trip_order_id: Optional[str] = None
    billing_notes: Optional[str] = None
    priority_category: Optional[str] = None
    intake_notes: Optional[str] = None
    missing_info_flag: bool
    internal_warning: Optional[str] = None
    review_state: ReviewState
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    decline_reason: Optional[DeclineReason] = None
    clarification_reason: Optional[str] = None
    cancellation_reason: Optional[CancellationReason] = None
    outcome_category: Optional[OutcomeCategory] = None
    final_revenue: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('appointment_time', 'requested_pickup_time', mode='before')
    @classmethod
    def strip_time_tz(cls, v: Any) -> Any:
        if isinstance(v, str) and '+' in v:
            return v.split('+')[0]
        return v

    class Config:
        from_attributes = True
