-- Phase 9: role dashboards and outstanding work (OP39, OP40). Counts come from real rows, within the caller's scope (BR31, SEC31).

create function public.dashboard_claim_ids(p_role text) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.claims c
  where case p_role
    when 'claimant' then public.is_claim_owner(c.id)
    when 'lawyer' then public.is_authorised_lawyer(c.id)
    when 'raf_officer' then public.is_assigned_officer(c.id)
    when 'manager' then true
    else false
  end;
$$;
revoke all on function public.dashboard_claim_ids(text) from public, anon, authenticated;

-- A caller who does not hold the role gets nothing. Totals only: no names or evidence.
create function public.get_dashboard_metrics(p_role text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_result jsonb;
begin
  if not public.is_active_user() or not public.has_role(p_role) or p_role not in ('claimant', 'lawyer', 'raf_officer', 'manager') then
    return '{}'::jsonb;
  end if;

  with scope as (
    select c.id, c.status from public.claims c where c.id in (select public.dashboard_claim_ids(p_role))
  ), statuses as (
    select status, count(*) as total from scope group by status
  ), requests as (
    select r.* from public.information_requests r where r.claim_id in (select id from scope)
  )
  select jsonb_build_object(
    'claims_total', (select count(*) from scope),
    'by_status', coalesce((select jsonb_object_agg(status, total) from statuses), '{}'::jsonb),
    'ready_claims', (select count(*) from scope where status = 'ready'),
    'average_readiness', (
      select round(avg(a.score))::integer from scope s
      join lateral (select x.score from public.readiness_assessments x where x.claim_id = s.id order by x.assessed_at desc limit 1) a on true
    ),
    'blocking_issues', (select count(*) from public.claim_issues i where i.claim_id in (select id from scope) and i.impact = 'blocking' and i.status in ('open', 'under_review')),
    'open_requests', (select count(*) from requests where status <> 'closed'),
    'overdue_requests', (select count(*) from requests where status <> 'closed' and due_date < v_today),
    'awaiting_review', (select count(*) from requests where status in ('responded', 'under_review')),
    'open_alerts', case when p_role = 'manager' then (select count(*) from public.risk_alerts a where a.status in ('OPEN', 'UNDER_REVIEW', 'ESCALATED')) end
  ) into v_result;
  return v_result;
end;
$$;

-- Built from open requests and unresolved issues only (Section 18 #16).
create function public.get_outstanding_work(p_role text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_user() or not public.has_role(p_role) or p_role not in ('claimant', 'lawyer', 'raf_officer') then
    return '[]'::jsonb;
  end if;

  return coalesce((
    with scope as (
      select c.id, c.reference, cl.first_name || ' ' || cl.surname as claimant_name
      from public.claims c join public.claimants cl on cl.id = c.claimant_id
      where c.id in (select public.dashboard_claim_ids(p_role))
    ), work as (
      select 'issue' as kind, i.id, i.title, s.id as claim_id, s.reference as claim_reference, s.claimant_name, null::date as due_date, i.status, i.impact, i.rule_id,
        case when i.status = 'under_review' then 'in_progress' else 'todo' end as work_column, i.created_at
      from public.claim_issues i join scope s on s.id = i.claim_id
      where i.status in ('open', 'under_review')
      union all
      select 'request', r.id, r.title, s.id, s.reference, s.claimant_name, r.due_date, r.status, null, null,
        case
          when r.status in ('responded', 'under_review') then 'in_progress'
          when r.recipient_type = 'claimant' then 'waiting'
          else 'todo'
        end,
        r.created_at
      from public.information_requests r join scope s on s.id = r.claim_id
      where r.status <> 'closed' and (p_role <> 'claimant' or (r.status = 'pending' and r.recipient_type = 'claimant'))
    )
    select jsonb_agg(jsonb_build_object(
      'kind', kind, 'id', id, 'title', title, 'claim_id', claim_id, 'claim_reference', claim_reference, 'claimant_name', claimant_name, 'due_date', due_date,
      'status', status, 'impact', impact, 'rule_id', rule_id, 'column', work_column
    ) order by due_date nulls last, created_at desc)
    from work
  ), '[]'::jsonb);
end;
$$;

-- S09.
create function public.get_claimant_home() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_claim public.claims;
begin
  if public.is_active_user() and public.has_role('claimant') then
    select * into v_claim from public.claims c where public.is_claim_owner(c.id) order by c.created_at desc limit 1;
  end if;
  if v_claim.id is null then
    return jsonb_build_object('claim', null, 'open_requests', '[]'::jsonb, 'recent_messages', '[]'::jsonb, 'recent_activity', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'claim', (
      select jsonb_build_object('id', v_claim.id, 'reference', v_claim.reference, 'status', v_claim.status, 'readiness_score', a.score, 'blocking_count', coalesce(a.blocking_count, 0))
      from (select 1) one left join lateral (select x.score, x.blocking_count from public.readiness_assessments x where x.claim_id = v_claim.id order by x.assessed_at desc limit 1) a on true
    ),
    'open_requests', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'due_date', r.due_date, 'status', r.status) order by r.due_date nulls last)
      from public.information_requests r where r.claim_id = v_claim.id and r.status <> 'closed' and r.recipient_type = 'claimant'
    ), '[]'::jsonb),
    'recent_messages', coalesce((
      select jsonb_agg(row_data order by created_at desc) from (
        select jsonb_build_object('id', m.id, 'body', m.body, 'author_name', p.first_name || ' ' || p.surname, 'author_role', public.profile_role(m.author_id), 'created_at', m.created_at) as row_data, m.created_at
        from public.messages m join public.profiles p on p.id = m.author_id
        where m.claim_id = v_claim.id order by m.created_at desc limit 3
      ) recent
    ), '[]'::jsonb),
    'recent_activity', coalesce((
      select jsonb_agg(row_data order by created_at desc) from (
        select jsonb_build_object('id', e.id, 'summary', e.summary, 'created_at', e.created_at) as row_data, e.created_at
        from public.claim_timeline_events e where e.claim_id = v_claim.id order by e.created_at desc limit 5
      ) recent
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_dashboard_metrics(text), public.get_outstanding_work(text), public.get_claimant_home() from public, anon;
grant execute on function public.get_dashboard_metrics(text), public.get_outstanding_work(text), public.get_claimant_home() to authenticated;
