-- Operations OP9–OP18: creating claims, the workflow, staff assignment and clients.

-- The Must rows of Section 8.3 as (from, to, role). Kept identical to _shared/rules/workflow.ts (T-BR4-1).
create function public.workflow_matrix() returns table (from_status text, to_status text, role_key text)
language sql immutable set search_path = '' as $$
  values ('draft','documents_needed','claimant'),('draft','documents_needed','lawyer'),
         ('documents_needed','validation','claimant'),('documents_needed','validation','lawyer'),
         ('validation','ready','claimant'),('validation','ready','lawyer'),('validation','ready','raf_officer'),
         ('ready','submitted','claimant'),('ready','submitted','lawyer'),
         ('submitted','raf_review','raf_officer'),
         ('raf_review','information_required','raf_officer'),
         ('raf_review','assessment','raf_officer'),
         ('information_required','raf_review','raf_officer'),
         ('assessment','negotiation','raf_officer'),
         ('negotiation','settlement','raf_officer'),
         ('settlement','closed','raf_officer')
$$;

-- "Claimant (own)", "lawyer (authorised)" and "officer (assigned)" from Section 8.3.
create function public.holds_workflow_role(p_role text, p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_role
    when 'claimant' then public.is_claim_owner(p_claim)
    when 'lawyer' then public.is_authorised_lawyer(p_claim)
    when 'raf_officer' then public.is_assigned_officer(p_claim)
    else false
  end;
$$;

-- BR3: the fields required to leave Draft (Section 18 #3), as labels. A claim always has a claimant.
create function public.missing_required_fields(p public.claims) returns text[]
language sql stable set search_path = '' as $$
  select array_remove(array[
    case when p.accident_date is null then 'Accident date' end,
    case when p.accident_province is null then 'Accident province' end,
    case when p.claimant_role is null then 'Claimant role' end,
    case when coalesce(trim(p.accident_description), '') = '' then 'Accident description' end
  ], null);
$$;

-- BR3, BR13, FR-WF-04: why a matrix-valid transition cannot happen yet. Null means it can.
create function public.transition_prerequisite(p public.claims, p_target text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_missing text[];
  v_blocking integer;
begin
  if p_target = 'documents_needed' then
    v_missing := public.missing_required_fields(p);
    if array_length(v_missing, 1) > 0 then
      return jsonb_build_object('code', 'missing_fields', 'missing', to_jsonb(v_missing), 'reason', 'Documents Needed — complete the required claim fields');
    end if;
  elsif p_target = 'validation' then
    if exists (
      select 1 from public.document_categories dc
      where dc.is_required and not exists (select 1 from public.documents d where d.claim_id = p.id and d.category_key = dc.key and d.deleted_at is null)
    ) then
      return jsonb_build_object('code', 'blocked', 'reason', 'Validation — required documents are missing');
    end if;
  elsif p_target = 'ready' then
    select count(*) into v_blocking from public.claim_issues i where i.claim_id = p.id and i.impact = 'blocking' and i.status in ('open','under_review');
    if v_blocking > 0 then
      return jsonb_build_object('code', 'blocked', 'reason', format('Ready — %s blocking issue%s open', v_blocking, case when v_blocking = 1 then '' else 's' end));
    end if;
    if p.readiness_stale then
      return jsonb_build_object('code', 'blocked', 'reason', 'Ready — checks must be re-run first');
    end if;
  end if;
  return null;
end;
$$;

-- OP14: every status this user could ever move the claim to, split into allowed and blocked with a reason.
create function public.allowed_transitions(p_claim uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_claim public.claims;
  v_row record;
  v_block jsonb;
  v_allowed jsonb := '[]'::jsonb;
  v_blocked jsonb := '[]'::jsonb;
begin
  select * into v_claim from public.claims where id = p_claim;
  if not found or not public.is_active_user() or not public.can_access_claim(p_claim) then
    return jsonb_build_object('allowed', v_allowed, 'blocked', v_blocked);
  end if;

  for v_row in
    select * from (
      select distinct on (m.to_status) m.to_status, m.from_status
      from public.workflow_matrix() m
      where public.holds_workflow_role(m.role_key, p_claim) and m.to_status <> v_claim.status
      order by m.to_status, (m.from_status = v_claim.status) desc
    ) t
    order by array_position(array['draft','documents_needed','validation','ready','submitted','raf_review','information_required','assessment','negotiation','settlement','closed'], t.to_status)
  loop
    if v_row.from_status <> v_claim.status then
      v_blocked := v_blocked || jsonb_build_object('status', v_row.to_status, 'label', public.status_label(v_row.to_status),
        'reason', format('%s — claim must be %s first', public.status_label(v_row.to_status), public.status_label(v_row.from_status)));
    else
      v_block := public.transition_prerequisite(v_claim, v_row.to_status);
      if v_block is null then
        v_allowed := v_allowed || jsonb_build_object('status', v_row.to_status, 'label', public.status_label(v_row.to_status));
      else
        v_blocked := v_blocked || jsonb_build_object('status', v_row.to_status, 'label', public.status_label(v_row.to_status), 'reason', v_block ->> 'reason');
      end if;
    end if;
  end loop;
  return jsonb_build_object('allowed', v_allowed, 'blocked', v_blocked);
end;
$$;

-- BR6: a refused attempt is written down.
create function public.log_blocked_transition(p public.claims, p_target text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.write_timeline(p.id, 'status_change_blocked', format('Status change to %s blocked', coalesce(public.status_label(p_target), 'an unknown status')), p.status, p_target, left(p_reason, 500));
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, claim_id, change_summary, reason, outcome)
  values (auth.uid(), public.current_actor_role(), 'STATUS_CHANGE_BLOCKED', 'claim', p.id::text, p.id, jsonb_build_object('from', p.status, 'to', p_target), left(p_reason, 500), 'denied');
end;
$$;

-- OP13. A refusal is returned rather than raised: raising would roll back the blocked-attempt log (BR6, Section 18 #54).
create function public.transition_claim_status(p_claim uuid, p_target text, p_reason text, p_note text default null, p_notify boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_claim public.claims;
  v_reason text := trim(coalesce(p_reason, ''));
  v_block jsonb;
  v_text text;
begin
  select * into v_claim from public.claims where id = p_claim for update;
  if not found or not public.is_active_user() or not public.can_access_claim(p_claim) then
    insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, change_summary, outcome)
    values (auth.uid(), public.current_actor_role(), 'ACCESS_DENIED', 'claim', p_claim::text, jsonb_build_object('attempted', 'status_change'), 'denied');
    return jsonb_build_object('ok', false, 'code', 'no_access');
  end if;

  if v_reason = '' then
    return jsonb_build_object('ok', false, 'code', 'reason_required');
  end if;

  if not exists (
    select 1 from public.workflow_matrix() m
    where m.from_status = v_claim.status and m.to_status = p_target and public.holds_workflow_role(m.role_key, p_claim)
  ) then
    v_text := format('%s is not allowed from %s for your role', coalesce(public.status_label(p_target), 'This status'), public.status_label(v_claim.status));
    perform public.log_blocked_transition(v_claim, p_target, v_text);
    return jsonb_build_object('ok', false, 'code', 'blocked', 'reason', v_text);
  end if;

  v_block := public.transition_prerequisite(v_claim, p_target);
  if v_block is not null then
    perform public.log_blocked_transition(v_claim, p_target, v_block ->> 'reason');
    return jsonb_build_object('ok', false) || v_block;
  end if;

  perform set_config('app.transition_status', 'on', true);
  perform set_config('app.change_reason', left(v_reason || coalesce(' Note to participants: ' || nullif(trim(p_note), ''), ''), 500), true);
  perform set_config('app.skip_notify', case when p_notify then '' else 'on' end, true);
  update public.claims set status = p_target, submitted_at = case when p_target = 'submitted' then now() else submitted_at end where id = p_claim;
  perform set_config('app.transition_status', '', true);
  perform set_config('app.change_reason', '', true);
  perform set_config('app.skip_notify', '', true);

  return jsonb_build_object('ok', true, 'status', p_target);
end;
$$;

create or replace function public.notify_claim_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recipient uuid;
begin
  if new.status is distinct from old.status and coalesce(current_setting('app.skip_notify', true), '') <> 'on' then
    for v_recipient in select public.claim_participant_ids(new.id) loop
      if v_recipient is distinct from auth.uid() then
        perform public.send_notification(v_recipient, 'claim_update', new.id, format('/claims/%s', new.id), public.status_label(new.status));
      end if;
    end loop;
  end if;
  return null;
end;
$$;

-- OP9. The claimant (own), a lawyer (their firm's client), or an officer with permission.
create function public.create_claim(p_claimant_id uuid default null, p_fields jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_claimant uuid := p_claimant_id;
  v_org uuid;
  v_claim public.claims;
begin
  if not public.is_active_user() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if public.has_role('claimant') and (v_claimant is null or public.is_own_claimant(v_claimant)) then
    select id into v_claimant from public.claimants where profile_id = v_uid;
    if v_claimant is null then
      insert into public.claimants (profile_id, first_name, surname, email, mobile, created_by)
      select p.id, p.first_name, p.surname, p.email, p.mobile, p.id from public.profiles p where p.id = v_uid
      returning id into v_claimant;
    end if;
    select organisation_id into v_org from public.client_relationships where claimant_id = v_claimant limit 1;
  elsif public.has_role('lawyer') and v_claimant is not null and public.is_firm_client(v_claimant) then
    select r.organisation_id into v_org from public.client_relationships r where r.claimant_id = v_claimant and public.is_org_member(r.organisation_id) limit 1;
  elsif public.has_role('raf_officer') and public.has_permission('claims.create') and v_claimant is not null then
    select organisation_id into v_org from public.client_relationships where claimant_id = v_claimant limit 1;
  else
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  insert into public.claims (claimant_id, representing_organisation_id, created_by, claimant_role, accident_date, accident_time, accident_province, accident_town, accident_location, police_station, cas_number, accident_description, injuries_summary)
  values (v_claimant, v_org, v_uid,
    nullif(p_fields ->> 'claimant_role', ''), nullif(p_fields ->> 'accident_date', '')::date, nullif(p_fields ->> 'accident_time', '')::time,
    nullif(p_fields ->> 'accident_province', ''), nullif(p_fields ->> 'accident_town', ''), nullif(p_fields ->> 'accident_location', ''),
    nullif(p_fields ->> 'police_station', ''), nullif(p_fields ->> 'cas_number', ''), nullif(p_fields ->> 'accident_description', ''), nullif(p_fields ->> 'injuries_summary', ''))
  returning * into v_claim;

  return jsonb_build_object('id', v_claim.id, 'reference', v_claim.reference);
end;
$$;

-- OP15. Officers with claims.assign and administrators (Section 18 #7).
create function public.assign_claim_staff(p_claim uuid, p_profile uuid, p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_active_user() or not (public.has_role('admin') or (public.has_role('raf_officer') and public.has_permission('claims.assign'))) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_profile and role_key = p_role) then
    raise exception 'That person does not hold this role' using errcode = '22023';
  end if;

  update public.claim_assignments set ended_at = now() where claim_id = p_claim and assignment_role = p_role and ended_at is null and profile_id <> p_profile;
  insert into public.claim_assignments (claim_id, profile_id, assignment_role, assigned_by)
  values (p_claim, p_profile, p_role, auth.uid())
  on conflict (claim_id, profile_id, assignment_role) where ended_at is null do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- OP18. The relationship is always for the lawyer's own firm.
create function public.add_client(p_first_name text, p_surname text, p_id_number text, p_date_of_birth date, p_email text, p_mobile text, p_assigned_lawyer uuid, p_mandate_status text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_claimant uuid;
  v_lawyer uuid := coalesce(p_assigned_lawyer, auth.uid());
begin
  if not public.is_active_user() or not public.has_role('lawyer') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select organisation_id into v_org from public.legal_practitioners where profile_id = auth.uid();
  if not exists (select 1 from public.legal_practitioners where profile_id = v_lawyer and organisation_id = v_org) then
    raise exception 'That attorney is not in your firm' using errcode = '22023';
  end if;

  insert into public.claimants (first_name, surname, id_number, date_of_birth, email, mobile, created_by)
  values (p_first_name, p_surname, nullif(p_id_number, ''), p_date_of_birth, nullif(p_email, ''), nullif(p_mobile, ''), auth.uid())
  returning id into v_claimant;
  insert into public.client_relationships (organisation_id, claimant_id, assigned_lawyer_id, mandate_status) values (v_org, v_claimant, v_lawyer, p_mandate_status);
  return v_claimant;
end;
$$;

-- Names of people on a claim: profiles are private, so these return only what a person with claim access may see.
create function public.get_claim_assignments(p_claim uuid)
returns table (profile_id uuid, display_name text, assignment_role text, assigned_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.profile_id, p.first_name || ' ' || p.surname, a.assignment_role, a.assigned_at
  from public.claim_assignments a join public.profiles p on p.id = a.profile_id
  where a.claim_id = p_claim and a.ended_at is null and public.is_active_user() and public.can_access_claim(p_claim)
  order by a.assigned_at;
$$;

create function public.get_claim_timeline(p_claim uuid)
returns table (id uuid, event_type text, actor_id uuid, actor_name text, actor_role text, summary text, from_status text, to_status text, reason text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.event_type, e.actor_id, p.first_name || ' ' || p.surname, e.actor_role, e.summary, e.from_status, e.to_status, e.reason, e.created_at
  from public.claim_timeline_events e left join public.profiles p on p.id = e.actor_id
  where e.claim_id = p_claim and public.is_active_user() and public.can_access_claim(p_claim)
  order by e.created_at desc;
$$;

create function public.get_firm_lawyers()
returns table (profile_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select lp.profile_id, p.first_name || ' ' || p.surname
  from public.legal_practitioners lp join public.profiles p on p.id = lp.profile_id
  where public.is_active_user() and public.has_role('lawyer') and public.is_org_member(lp.organisation_id) and lp.verification_status = 'verified'
  order by 2;
$$;

-- OP11: columns S10 needs, appended so existing readers keep working.
create or replace view public.claims_list with (security_invoker = true) as
  select c.id, c.reference, c.status, cl.first_name || ' ' || cl.surname as claimant_name, c.representing_organisation_id,
         ra.score as readiness_score, ra.blocking_count, c.created_at, c.updated_at, c.accident_date,
         (select count(*)::integer from public.information_requests r where r.claim_id = c.id and r.status <> 'closed') as open_request_count
  from public.claims c
  join public.claimants cl on cl.id = c.claimant_id
  left join lateral (select x.score, x.blocking_count from public.readiness_assessments x where x.claim_id = c.id order by x.assessed_at desc limit 1) ra on true
  union all
  select s.id, s.reference, s.status, null, null, s.readiness_score, s.blocking_count, s.created_at, s.updated_at, null, s.open_request_count
  from public.claim_summaries s;

-- S31. Runs with the caller's own rights, so RLS decides which claims appear.
create function public.claims_queue(p_tab text, p_page integer, p_page_size integer) returns jsonb
language sql stable set search_path = '' as $$
  with queue as (
    select c.id, c.reference, cl.first_name || ' ' || cl.surname as claimant_name,
      (select p.full_name from public.claim_parties p where p.claim_id = c.id and p.party_type = 'legal_representative' limit 1) as legal_representative,
      c.status, ra.score as readiness_score, ra.blocking_count,
      (select f.flag from public.claim_risk_flags f where f.claim_id = c.id) as risk_flag,
      (select count(*)::integer from public.information_requests r where r.claim_id = c.id and r.status <> 'closed') as open_request_count,
      extract(day from now() - coalesce((select max(e.created_at) from public.claim_timeline_events e where e.claim_id = c.id and e.event_type = 'status_changed'), c.created_at))::integer as days_in_stage
    from public.claims c
    join public.claimants cl on cl.id = c.claimant_id
    left join lateral (select x.score, x.blocking_count from public.readiness_assessments x where x.claim_id = c.id order by x.assessed_at desc limit 1) ra on true
    where case p_tab
      when 'assigned' then exists (select 1 from public.claim_assignments a where a.claim_id = c.id and a.profile_id = auth.uid() and a.assignment_role = 'raf_officer' and a.ended_at is null)
      when 'unassigned' then not exists (select 1 from public.claim_assignments a where a.claim_id = c.id and a.assignment_role = 'raf_officer' and a.ended_at is null)
      else true
    end
  ), page as (
    select * from queue order by days_in_stage desc, reference limit p_page_size offset greatest(p_page - 1, 0) * p_page_size
  )
  select jsonb_build_object('rows', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb), 'total', (select count(*) from queue));
$$;

grant execute on function public.create_claim(uuid, jsonb), public.transition_claim_status(uuid, text, text, text, boolean), public.allowed_transitions(uuid),
  public.assign_claim_staff(uuid, uuid, text), public.add_client(text, text, text, date, text, text, uuid, text), public.get_claim_assignments(uuid),
  public.get_claim_timeline(uuid), public.get_firm_lawyers(), public.claims_queue(text, integer, integer)
to authenticated;
