-- ============================================================
-- Seed Data — GoTime Pre-CQ Tool (synthetic, no real PHI)
-- ============================================================

-- Pay Sources
insert into pay_sources (id, name, status, notes) values
  ('a1000000-0000-0000-0000-000000000001', 'Medicaid', 'active', 'Standard Medicaid transport billing'),
  ('a1000000-0000-0000-0000-000000000002', 'Medicare', 'active', 'Medicare Part B non-emergency'),
  ('a1000000-0000-0000-0000-000000000003', 'Private Pay', 'active', 'Direct patient billing'),
  ('a1000000-0000-0000-0000-000000000004', 'BlueCross BlueShield', 'active', 'BCBS managed care'),
  ('a1000000-0000-0000-0000-000000000005', 'United Healthcare', 'active', 'UHC managed care'),
  ('a1000000-0000-0000-0000-000000000006', 'Aetna', 'active', 'Aetna managed care'),
  ('a1000000-0000-0000-0000-000000000007', 'VA Benefits', 'active', 'Veterans Affairs transport benefit')
on conflict (id) do nothing;

-- Facilities
insert into facilities (id, name, facility_type, address, phone, email, status, default_pay_source_id) values
  ('b1000000-0000-0000-0000-000000000001', 'St. Mary''s Medical Center', 'hospital',
   '1200 Medical Blvd, Springfield, ST 00001', '(555) 100-1000', 'transport@stmarys.test', 'active',
   'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002', 'Riverside Dialysis Center', 'clinic',
   '450 River Rd, Springfield, ST 00002', '(555) 200-2000', 'intake@riverside-dialysis.test', 'active',
   'a1000000-0000-0000-0000-000000000002'),
  ('b1000000-0000-0000-0000-000000000003', 'Sunrise Skilled Nursing Facility', 'SNF',
   '300 Sunrise Way, Springfield, ST 00003', '(555) 300-3000', null, 'active',
   'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000004', 'Valley Home Health Agency', 'home_health',
   '88 Valley Ln, Springfield, ST 00004', '(555) 400-4000', null, 'active',
   'a1000000-0000-0000-0000-000000000003'),
  ('b1000000-0000-0000-0000-000000000005', 'Metro Cancer & Oncology Clinic', 'clinic',
   '700 Hope St, Springfield, ST 00005', '(555) 500-5000', 'schedule@metrocancer.test', 'active',
   'a1000000-0000-0000-0000-000000000004')
on conflict (id) do nothing;

-- Requestors
insert into requestors (id, name, title_department, phone, email, preferred_notification_method, facility_id, status) values
  ('c1000000-0000-0000-0000-000000000001', 'Maria Santos', 'Discharge Planning', '(555) 101-1001',
   'm.santos@stmarys.test', 'email', 'b1000000-0000-0000-0000-000000000001', 'active'),
  ('c1000000-0000-0000-0000-000000000002', 'James Reyes', 'Social Work', '(555) 101-1002',
   'j.reyes@stmarys.test', 'both', 'b1000000-0000-0000-0000-000000000001', 'active'),
  ('c1000000-0000-0000-0000-000000000003', 'Linda Chen', 'Dialysis Coordinator', '(555) 201-2001',
   'l.chen@riverside-dialysis.test', 'sms', 'b1000000-0000-0000-0000-000000000002', 'active'),
  ('c1000000-0000-0000-0000-000000000004', 'Robert Kim', 'Nursing Supervisor', '(555) 301-3001',
   null, 'email', 'b1000000-0000-0000-0000-000000000003', 'active'),
  ('c1000000-0000-0000-0000-000000000005', 'Angela Torres', 'Oncology Nurse Navigator', '(555) 501-5001',
   'a.torres@metrocancer.test', 'email', 'b1000000-0000-0000-0000-000000000005', 'active')
on conflict (id) do nothing;

-- Clients (synthetic — no real PHI)
insert into clients (id, full_name, date_of_birth, phone, primary_address, mobility_level, default_pay_source_id, primary_facility_id) values
  ('d1000000-0000-0000-0000-000000000001', 'John Doe', '1945-03-15', '(555) 111-1111',
   '10 Oak St, Springfield, ST 00001', 'ambulatory',
   'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000002', 'Jane Smith', '1938-07-22', '(555) 222-2222',
   '25 Elm Ave, Springfield, ST 00002', 'wheelchair',
   'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000003', 'Robert Johnson', '1952-11-08', '(555) 333-3333',
   '88 Maple Dr, Springfield, ST 00003', 'ambulatory',
   'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003'),
  ('d1000000-0000-0000-0000-000000000004', 'Mary Williams', '1960-05-30', '(555) 444-4444',
   '200 Pine Rd, Springfield, ST 00004', 'stretcher',
   'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000005', 'Carlos Rivera', '1948-09-17', '(555) 555-5555',
   '55 Cedar Blvd, Springfield, ST 00005', 'wheelchair',
   'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000005'),
  ('d1000000-0000-0000-0000-000000000006', 'Patricia Lee', '1935-12-01', '(555) 666-6666',
   '77 Birch Ln, Springfield, ST 00006', 'ambulatory',
   'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- Trip Requests (mixed states for testing)
insert into trip_requests (
  id, intake_channel, intake_date, requestor_id, facility_id, client_id,
  pickup_address, dropoff_address, mobility_level, escort_needed,
  trip_date, appointment_time, requested_pickup_time, will_call,
  trip_type, urgency_level, appointment_type, pay_source_id,
  expected_revenue, review_state, intake_notes
) values
  -- Pending trips
  ('e1000000-0000-0000-0000-000000000001',
   'phone', '2026-04-02',
   'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   '10 Oak St, Springfield, ST 00001', '1200 Medical Blvd, Springfield, ST 00001',
   'ambulatory', false, '2026-04-05', '09:00', '08:30', false,
   'one_way', 'standard', 'Follow-up Visit',
   'a1000000-0000-0000-0000-000000000001', 45.00,
   'pending', 'Patient needs help checking in at desk'),

  ('e1000000-0000-0000-0000-000000000002',
   'fax', '2026-04-02',
   'c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   '25 Elm Ave, Springfield, ST 00002', '450 River Rd, Springfield, ST 00002',
   'wheelchair', false, '2026-04-03', '07:00', '06:15', false,
   'round_trip', 'standard', 'Dialysis',
   'a1000000-0000-0000-0000-000000000002', 90.00,
   'pending', 'Recurring dialysis Monday/Wednesday/Friday'),

  ('e1000000-0000-0000-0000-000000000003',
   'phone', '2026-04-02',
   'c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005',
   'd1000000-0000-0000-0000-000000000005',
   '55 Cedar Blvd, Springfield, ST 00005', '700 Hope St, Springfield, ST 00005',
   'wheelchair', true, '2026-04-04', '10:30', '09:45', false,
   'one_way', 'urgent', 'Chemotherapy',
   'a1000000-0000-0000-0000-000000000004', 65.00,
   'pending', 'Escort required. Patient weak after last treatment'),

  -- Accepted trip
  ('e1000000-0000-0000-0000-000000000004',
   'email', '2026-04-01',
   'c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000003',
   '88 Maple Dr, Springfield, ST 00003', '1200 Medical Blvd, Springfield, ST 00001',
   'ambulatory', false, '2026-04-05', '14:00', '13:30', false,
   'one_way', 'standard', 'Cardiology Consult',
   'a1000000-0000-0000-0000-000000000001', 50.00,
   'accepted', null),

  -- Declined trip
  ('e1000000-0000-0000-0000-000000000005',
   'phone', '2026-04-01',
   'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000004',
   '200 Pine Rd, Springfield, ST 00004', '1200 Medical Blvd, Springfield, ST 00001',
   'stretcher', false, '2026-04-02', '08:00', '07:00', false,
   'one_way', 'emergency', 'Emergency Consult',
   'a1000000-0000-0000-0000-000000000001', 120.00,
   'declined', 'Called in same-day — no stretcher units available'),

  -- Completed trip
  ('e1000000-0000-0000-0000-000000000006',
   'phone', '2026-03-28',
   'c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000006',
   '77 Birch Ln, Springfield, ST 00006', '450 River Rd, Springfield, ST 00002',
   'ambulatory', false, '2026-03-31', '07:00', '06:30', false,
   'round_trip', 'standard', 'Dialysis',
   'a1000000-0000-0000-0000-000000000002', 90.00,
   'completed', null)
on conflict (id) do nothing;

-- Update outcome_category and final_revenue for resolved trips
update trip_requests set
  outcome_category = 'accepted',
  reviewed_at = now() - interval '1 hour'
where id = 'e1000000-0000-0000-0000-000000000004';

update trip_requests set
  outcome_category = 'declined',
  decline_reason = 'no_availability',
  review_notes = 'No stretcher-capable vehicles same day. Advised facility to reschedule.',
  reviewed_at = now() - interval '2 hours'
where id = 'e1000000-0000-0000-0000-000000000005';

update trip_requests set
  outcome_category = 'completed',
  final_revenue = 90.00,
  reviewed_at = now() - interval '5 days'
where id = 'e1000000-0000-0000-0000-000000000006';
