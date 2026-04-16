-- ============================================================
-- 013 — Feedback v1 Schema Changes
-- Based on GT Intake v1 Feedback document, April 2026
-- ============================================================

-- Allow requestors to exist without a facility (walk-in / direct callers)
ALTER TABLE requestors ALTER COLUMN facility_id DROP NOT NULL;

-- Allow trips to be created without a facility (N/A option)
ALTER TABLE trip_requests ALTER COLUMN facility_id DROP NOT NULL;

-- New trip detail fields (Leg 1 restructure)
ALTER TABLE trip_requests
  ADD COLUMN IF NOT EXISTS dropoff_location_name  text,        -- "Drop Off Location Name" (e.g. Mass General Hospital)
  ADD COLUMN IF NOT EXISTS dropoff_notes          text,        -- Floor/suite/dept notes (replaces return_details purpose)
  ADD COLUMN IF NOT EXISTS return_time            text,        -- Return pickup time for round trips
  ADD COLUMN IF NOT EXISTS trip_legs              jsonb;       -- Additional legs for multi-trip

-- Client compliance fields: store first/last name separately for CQ migration
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS first_name  text,
  ADD COLUMN IF NOT EXISTS last_name   text;
