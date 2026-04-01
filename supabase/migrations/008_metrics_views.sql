-- ============================================================
-- 008 — Metrics Views
-- ============================================================

-- Summary counts by review_state
create or replace view v_metrics_summary as
select
  count(*)                                              as total,
  count(*) filter (where review_state = 'pending')      as pending,
  count(*) filter (where review_state = 'accepted')     as accepted,
  count(*) filter (where review_state = 'declined')     as declined,
  count(*) filter (where review_state = 'completed')    as completed,
  count(*) filter (where review_state = 'canceled')     as canceled,
  count(*) filter (where review_state = 'arrived_canceled') as arrived_canceled,
  count(*) filter (where review_state = 'returned')     as returned
from trip_requests;

-- Counts grouped by facility
create or replace view v_metrics_by_facility as
select
  f.id                                                           as facility_id,
  f.name                                                         as facility_name,
  count(t.id)                                                    as total,
  count(t.id) filter (where t.review_state = 'accepted')        as accepted,
  count(t.id) filter (where t.review_state = 'declined')        as declined,
  count(t.id) filter (where t.review_state = 'completed')       as completed,
  count(t.id) filter (where t.review_state = 'canceled')        as canceled
from facilities f
left join trip_requests t on t.facility_id = f.id
group by f.id, f.name
order by total desc;

-- Revenue rollup
create or replace view v_metrics_revenue as
select
  coalesce(sum(expected_revenue), 0)                              as expected_total,
  coalesce(sum(expected_revenue) filter (where review_state = 'accepted'), 0)  as accepted_revenue,
  coalesce(sum(final_revenue) filter (where review_state = 'completed'), 0)    as completed_revenue,
  coalesce(sum(expected_revenue) filter (where review_state = 'declined'), 0)  as declined_opportunity,
  coalesce(sum(expected_revenue) filter (where review_state in ('canceled','arrived_canceled')), 0) as canceled_revenue
from trip_requests;

-- Pay source breakdown
create or replace view v_metrics_by_pay_source as
select
  ps.id                                                           as pay_source_id,
  ps.name                                                         as pay_source_name,
  count(t.id)                                                     as total,
  count(t.id) filter (where t.review_state = 'accepted')         as accepted,
  count(t.id) filter (where t.review_state = 'declined')         as declined,
  coalesce(sum(t.final_revenue) filter (where t.review_state = 'completed'), 0) as completed_revenue
from pay_sources ps
left join trip_requests t on t.pay_source_id = ps.id
group by ps.id, ps.name
order by total desc;
