-- ============================================================
-- 014 — Correct Pay Sources Seed
-- Restricts pay_sources to the 4 approved values per GT Feedback v1
-- Run this in the Supabase SQL editor ONCE
-- ============================================================

-- Step 1: Deactivate any pay sources NOT in the approved 4
UPDATE pay_sources
SET status = 'inactive'
WHERE name NOT IN (
  'Medicaid',
  'Facility Contract',
  'FC+Medicaid Pending',
  'Private Pay'
);

-- Step 2: Activate existing rows that match approved names (in case they exist but are inactive)
UPDATE pay_sources SET status = 'active', notes = 'Standard Medicaid non-emergency medical transport'
WHERE name = 'Medicaid';

UPDATE pay_sources SET status = 'active', notes = 'Direct billing under facility contract'
WHERE name = 'Facility Contract';

UPDATE pay_sources SET status = 'active', notes = 'Facility contract rate — Medicaid authorization pending'
WHERE name = 'FC+Medicaid Pending';

UPDATE pay_sources SET status = 'active', notes = 'Direct patient / family billing'
WHERE name = 'Private Pay';

-- Step 3: Insert only the ones that do not already exist (by name)
INSERT INTO pay_sources (name, status, notes)
SELECT 'Medicaid', 'active', 'Standard Medicaid non-emergency medical transport'
WHERE NOT EXISTS (SELECT 1 FROM pay_sources WHERE name = 'Medicaid');

INSERT INTO pay_sources (name, status, notes)
SELECT 'Facility Contract', 'active', 'Direct billing under facility contract'
WHERE NOT EXISTS (SELECT 1 FROM pay_sources WHERE name = 'Facility Contract');

INSERT INTO pay_sources (name, status, notes)
SELECT 'FC+Medicaid Pending', 'active', 'Facility contract rate — Medicaid authorization pending'
WHERE NOT EXISTS (SELECT 1 FROM pay_sources WHERE name = 'FC+Medicaid Pending');

INSERT INTO pay_sources (name, status, notes)
SELECT 'Private Pay', 'active', 'Direct patient / family billing'
WHERE NOT EXISTS (SELECT 1 FROM pay_sources WHERE name = 'Private Pay');
