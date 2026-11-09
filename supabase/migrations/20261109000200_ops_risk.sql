-- Phase 7: risk queue, investigation workspace, alert changes and recorded reviews (OP27–OP31).

-- OP24, amended: an issue that predates automatic alerts also gets its alert, once per claim and rule.
create or replace function public.save_readiness_assessment(p_claim uuid, p_result jsonb, p_triggered_by uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_assessment uuid;
  v_issue jsonb;
  v_check uuid;
  v_alert jsonb;
  v_alert_id uuid;
  v_existing boolean;
begin
  perform pg_advisory_xact_lock(hashtext('readiness_' || p_claim::text));

  insert into public.readiness_assessments (claim_id, rules_version, input_hash, score, category_scores, blocking_count, warning_count, resolved_count, triggered_by)
  values (p_claim, p_result->>'rules_version', p_result->>'input_hash', (p_result->>'score')::integer, p_result->'category_scores', 0, 0, 0, p_triggered_by)
  returning id into v_assessment;

  insert into public.claim_checks (assessment_id, claim_id, rule_id, rule_version, result, details)
  select v_assessment, p_claim, c->>'rule_id', c->>'rule_version', c->>'result', coalesce(c->'details', '{}'::jsonb)
  from jsonb_array_elements(p_result->'checks') c;

  update public.claim_issues i set status = 'resolved', updated_by = null
  where i.claim_id = p_claim and i.status in ('open', 'under_review')
    and i.rule_id in (select c->>'rule_id' from jsonb_array_elements(p_result->'checks') c)
    and not exists (select 1 from jsonb_array_elements(p_result->'issues') r where r->>'rule_id' = i.rule_id and r->>'issue_key' = i.issue_key);

  for v_issue in select * from jsonb_array_elements(p_result->'issues') loop
    select id into v_check from public.claim_checks
    where assessment_id = v_assessment and rule_id = v_issue->>'rule_id' and details->>'key' = v_issue->>'issue_key' limit 1;

    update public.claim_issues set title = v_issue->>'title', explanation = v_issue->>'explanation', corrective_action = v_issue->>'corrective_action',
      impact = v_issue->>'impact', evidence = v_issue->'evidence', check_id = v_check
    where claim_id = p_claim and rule_id = v_issue->>'rule_id' and issue_key = v_issue->>'issue_key' and status in ('open', 'under_review');
    v_existing := found;

    if not v_existing then
      if exists (
        select 1 from public.claim_issues
        where claim_id = p_claim and rule_id = v_issue->>'rule_id' and issue_key = v_issue->>'issue_key'
          and status in ('resolved', 'dismissed') and updated_by is not null and evidence = v_issue->'evidence'
      ) then continue; end if;

      insert into public.claim_issues (claim_id, rule_id, issue_key, check_id, title, explanation, corrective_action, impact, evidence)
      values (p_claim, v_issue->>'rule_id', v_issue->>'issue_key', v_check, v_issue->>'title', v_issue->>'explanation', v_issue->>'corrective_action', v_issue->>'impact', v_issue->'evidence');
    end if;

    select a into v_alert from jsonb_array_elements(p_result->'alerts') a
    where a->>'rule_id' = v_issue->>'rule_id' and a->>'issue_key' = v_issue->>'issue_key' limit 1;
    if v_alert is null then continue; end if;
    if v_existing and exists (select 1 from public.risk_alerts where claim_id = p_claim and rule_id = v_alert->>'rule_id') then continue; end if;

    insert into public.risk_alerts (claim_id, rule_id, indicator_type, severity, title, explanation)
    values (p_claim, v_alert->>'rule_id', v_alert->>'indicator_type', v_alert->>'severity', v_alert->>'title', v_alert->>'explanation')
    returning id into v_alert_id;

    insert into public.risk_evidence (alert_id, document_version_id, extracted_field_id, claim_field, description)
    select v_alert_id, (e->>'version_id')::uuid, (e->>'field_id')::uuid,
      case when e->>'version_id' is null then e->>'field' end,
      left(concat(e->>'source', ': ', coalesce(e->>'value', e->>'field')), 500)
    from jsonb_array_elements(v_issue->'evidence') e;
  end loop;

  perform public.refresh_readiness_counts(p_claim);
  update public.claims set readiness_stale = false where id = p_claim;
  return v_assessment;
end;
$$;

create function public.require_investigator() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_user() or not public.has_role('investigator') then
    raise exception 'You do not have access to this page' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.require_investigator() from public, anon, authenticated;

create function public.get_investigators() returns table (id uuid, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_investigator();
  return query
    select p.id, p.first_name || ' ' || p.surname
    from public.profiles p join public.user_roles ur on ur.user_id = p.id and ur.role_key = 'investigator'
    where p.account_status = 'active' order by 2;
end;
$$;

-- OP27. Unassigned alerts are listed to those who may assign them; the evidence stays closed until then (Section 18 #61).
create function public.risk_queue(p_tab text, p_severity text default null, p_status text default null, p_indicator text default null, p_assignee uuid default null, p_min_age integer default null, p_page integer default 1, p_page_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  perform public.require_investigator();
  with visible as (
    select r.id, r.reference, r.claim_id, c.reference as claim_reference, cl.first_name || ' ' || cl.surname as claimant_name, r.indicator_type, r.severity, r.status,
      r.assigned_to, p.first_name || ' ' || p.surname as assignee_name, r.created_at, extract(day from now() - r.created_at)::integer as age_days, public.can_access_alert(r.id) as can_open
    from public.risk_alerts r
    join public.claims c on c.id = r.claim_id
    join public.claimants cl on cl.id = c.claimant_id
    left join public.profiles p on p.id = r.assigned_to
    where public.can_access_alert(r.id) or (r.assigned_to is null and public.has_permission('investigations.review'))
  ), tab as (
    select * from visible v
    where case p_tab
      when 'assigned' then v.assigned_to = auth.uid()
      when 'unassigned' then v.assigned_to is null
      when 'escalated' then v.status = 'ESCALATED'
      else true
    end
  ), queue as (
    select * from tab t
    where (p_status is not null and t.status = p_status or p_status is null and (p_tab = 'all' or t.status in ('OPEN', 'UNDER_REVIEW', 'ESCALATED')))
      and (p_severity is null or t.severity = p_severity)
      and (p_indicator is null or t.indicator_type = p_indicator)
      and (p_assignee is null or t.assigned_to = p_assignee)
      and (p_min_age is null or t.age_days >= p_min_age)
  ), page as (
    select * from queue
    order by array_position(array['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], severity), created_at desc
    limit p_page_size offset greatest(p_page - 1, 0) * p_page_size
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'total', (select count(*) from queue),
    'counts', jsonb_build_object(
      'LOW', (select count(*) from tab where severity = 'LOW' and status in ('OPEN', 'UNDER_REVIEW', 'ESCALATED')),
      'MEDIUM', (select count(*) from tab where severity = 'MEDIUM' and status in ('OPEN', 'UNDER_REVIEW', 'ESCALATED')),
      'HIGH', (select count(*) from tab where severity = 'HIGH' and status in ('OPEN', 'UNDER_REVIEW', 'ESCALATED')),
      'CRITICAL', (select count(*) from tab where severity = 'CRITICAL' and status in ('OPEN', 'UNDER_REVIEW', 'ESCALATED'))
    )
  ) into v_result;
  return v_result;
end;
$$;

-- S19.
create function public.get_claim_alerts(p_claim uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_investigator();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'reference', r.reference, 'rule_id', r.rule_id, 'rule_version', vr.version, 'title', r.title, 'explanation', r.explanation,
      'severity', r.severity, 'status', r.status, 'indicator_type', r.indicator_type, 'created_at', r.created_at,
      'assignee_name', p.first_name || ' ' || p.surname,
      'evidence_count', (select count(*) from public.risk_evidence e where e.alert_id = r.id)
    ) order by array_position(array['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], r.severity), r.created_at desc)
    from public.risk_alerts r
    left join public.validation_rules vr on vr.id = r.rule_id
    left join public.profiles p on p.id = r.assigned_to
    where r.claim_id = p_claim and public.can_access_alert(r.id)
  ), '[]'::jsonb);
end;
$$;

-- OP28.
create function public.get_alert_workspace(p_alert uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_alert public.risk_alerts;
begin
  perform public.require_investigator();
  select * into v_alert from public.risk_alerts where id = p_alert;
  if not found or not public.can_access_alert(p_alert) then
    raise exception 'You do not have access to this alert' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'alert', (
      select jsonb_build_object('id', v_alert.id, 'reference', v_alert.reference, 'title', v_alert.title, 'explanation', v_alert.explanation, 'severity', v_alert.severity, 'status', v_alert.status,
        'indicator_type', v_alert.indicator_type, 'created_at', v_alert.created_at, 'assigned_to', v_alert.assigned_to,
        'assignee_name', (select p.first_name || ' ' || p.surname from public.profiles p where p.id = v_alert.assigned_to))
    ),
    'claim', (
      select jsonb_build_object('id', c.id, 'reference', c.reference, 'status', c.status, 'claimant_name', cl.first_name || ' ' || cl.surname)
      from public.claims c join public.claimants cl on cl.id = c.claimant_id where c.id = v_alert.claim_id
    ),
    'rule', (select jsonb_build_object('id', r.id, 'name', r.name, 'version', r.version) from public.validation_rules r where r.id = v_alert.rule_id),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'description', e.description, 'source', coalesce(c.name, 'Claim record'), 'field', coalesce(f.field_key, e.claim_field, 'file'),
        'value', coalesce(f.value, nullif(substring(e.description from ': (.*)$'), '')), 'document_id', d.id, 'version_id', v.id, 'filename', v.filename,
        'storage_path', v.storage_path, 'mime_type', v.mime_type, 'source_page', f.source_page
      ) order by e.description)
      from public.risk_evidence e
      left join public.extracted_fields f on f.id = e.extracted_field_id
      left join public.document_extractions x on x.id = f.extraction_id
      left join public.document_versions v on v.id = coalesce(e.document_version_id, x.document_version_id)
      left join public.documents d on d.id = v.document_id
      left join public.document_categories c on c.key = d.category_key
      where e.alert_id = p_alert
    ), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'filename', v.filename, 'category_name', c.name) order by c.name)
      from public.documents d
      join public.document_categories c on c.key = d.category_key
      join lateral (select * from public.document_versions y where y.document_id = d.id and y.confirmed order by y.version desc limit 1) v on true
      where d.claim_id = v_alert.claim_id and d.deleted_at is null
    ), '[]'::jsonb),
    'issues', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'rule_id', i.rule_id, 'title', i.title, 'status', i.status) order by i.created_at)
      from public.claim_issues i where i.claim_id = v_alert.claim_id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'change_type', h.change_type, 'old_value', h.old_value,
        'new_value', case when h.change_type = 'assignment' then (select p.first_name || ' ' || p.surname from public.profiles p where p.id::text = h.new_value) else h.new_value end,
        'actor_name', a.first_name || ' ' || a.surname, 'reason', h.reason, 'created_at', h.created_at
      ) order by h.created_at desc)
      from public.risk_alert_history h left join public.profiles a on a.id = h.actor_id
      where h.alert_id = p_alert
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'body', n.body, 'author_name', a.first_name || ' ' || a.surname,
        'author_role', (select ur.role_key from public.user_roles ur where ur.user_id = n.author_id and ur.role_key = 'investigator' limit 1),
        'corrects_note_id', n.corrects_note_id, 'created_at', n.created_at
      ) order by n.created_at)
      from public.investigation_notes n join public.profiles a on a.id = n.author_id
      where n.alert_id = p_alert
    ), '[]'::jsonb),
    'review', (
      select jsonb_build_object('outcome', r.outcome, 'finding_summary', r.finding_summary, 'rationale', r.rationale, 'next_action', r.next_action, 'next_action_due', r.next_action_due,
        'resulting_status', r.resulting_status, 'recorder_name', a.first_name || ' ' || a.surname, 'recorded_at', r.recorded_at)
      from public.risk_reviews r join public.profiles a on a.id = r.recorded_by
      where r.alert_id = p_alert order by r.recorded_at desc limit 1
    ),
    'investigators', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name)) from public.get_investigators() i), '[]'::jsonb),
    'can_assign', public.has_permission('investigations.review')
  );
end;
$$;

-- OP29: the only way to change an alert (SEC15). Outcomes go through record_risk_review.
create function public.update_risk_alert(p_alert uuid, p_assigned_to uuid default null, p_status text default null, p_severity text default null, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_alert public.risk_alerts;
  v_can_open boolean;
  v_reason text := nullif(btrim(p_reason), '');
begin
  perform public.require_investigator();
  select * into v_alert from public.risk_alerts where id = p_alert for update;
  if not found then
    raise exception 'You do not have access to this alert' using errcode = '42501';
  end if;
  v_can_open := public.can_access_alert(p_alert);

  if p_assigned_to is null and p_status is null and p_severity is null then
    raise exception 'Nothing to update' using errcode = '22023';
  end if;

  if p_assigned_to is not null then
    if not public.has_permission('investigations.review') or not (v_can_open or v_alert.assigned_to is null) then
      raise exception 'You may not assign this alert' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
      where ur.user_id = p_assigned_to and ur.role_key = 'investigator' and p.account_status = 'active'
    ) then
      raise exception 'Alerts can only be assigned to an active investigator' using errcode = '22023';
    end if;
  end if;

  if p_severity is not null then
    if v_alert.assigned_to is distinct from auth.uid() then
      raise exception 'Only the assigned investigator can change severity' using errcode = '42501';
    end if;
    if v_reason is null then
      raise exception 'Please give a reason.' using errcode = '22023';
    end if;
  end if;

  if p_status is not null then
    if not v_can_open then
      raise exception 'You do not have access to this alert' using errcode = '42501';
    end if;
    if p_status = 'UNDER_REVIEW' and v_alert.status = 'OPEN' then
      if v_alert.assigned_to is distinct from auth.uid() then
        raise exception 'Only the assigned investigator can start a review' using errcode = '42501';
      end if;
    elsif p_status = 'ESCALATED' and v_alert.status in ('OPEN', 'UNDER_REVIEW') then
      if v_reason is null then
        raise exception 'Please give a reason.' using errcode = '22023';
      end if;
    else
      raise exception 'That status change is not allowed' using errcode = '22023';
    end if;
  end if;

  perform set_config('app.change_reason', coalesce(v_reason, ''), true);
  update public.risk_alerts set
    assigned_to = coalesce(p_assigned_to, assigned_to),
    status = coalesce(p_status, status),
    severity = coalesce(p_severity, severity)
  where id = p_alert;
end;
$$;

-- OP31: a person's recorded outcome. It changes the alert and never the claim (BR18).
create function public.record_risk_review(p_alert uuid, p_outcome text, p_finding_summary text, p_rationale text, p_evidence_ids uuid[], p_next_action text, p_next_action_due date, p_resulting_status text, p_confirmed boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_alert public.risk_alerts;
  v_review uuid;
begin
  perform public.require_investigator();
  select * into v_alert from public.risk_alerts where id = p_alert for update;
  if not found or not public.can_access_alert(p_alert) then
    raise exception 'You do not have access to this alert' using errcode = '42501';
  end if;
  if v_alert.status not in ('UNDER_REVIEW', 'ESCALATED') then
    raise exception 'A review can only be recorded on an alert under review or escalated' using errcode = '22023';
  end if;
  if p_confirmed is not true then
    raise exception 'Please confirm this outcome is based on your own review of the evidence.' using errcode = '22023';
  end if;
  if nullif(btrim(p_finding_summary), '') is null or nullif(btrim(p_rationale), '') is null or nullif(btrim(p_next_action), '') is null then
    raise exception 'This field is required.' using errcode = '22023';
  end if;

  insert into public.risk_reviews (alert_id, outcome, finding_summary, rationale, evidence_ids, next_action, next_action_due, resulting_status, confirmed, recorded_by)
  values (p_alert, p_outcome, btrim(p_finding_summary), btrim(p_rationale), coalesce(p_evidence_ids, '{}'), btrim(p_next_action), p_next_action_due, p_resulting_status, true, auth.uid())
  returning id into v_review;

  perform set_config('app.change_reason', left(btrim(p_rationale), 500), true);
  update public.risk_alerts set status = p_resulting_status where id = p_alert;
  insert into public.risk_alert_history (alert_id, change_type, old_value, new_value, actor_id, reason)
  values (p_alert, 'outcome', null, p_outcome, auth.uid(), left(btrim(p_rationale), 500));
  return v_review;
end;
$$;

revoke all on function public.get_investigators(), public.risk_queue(text, text, text, text, uuid, integer, integer, integer), public.get_claim_alerts(uuid), public.get_alert_workspace(uuid),
  public.update_risk_alert(uuid, uuid, text, text, text), public.record_risk_review(uuid, text, text, text, uuid[], text, date, text, boolean) from public, anon;
grant execute on function public.get_investigators(), public.risk_queue(text, text, text, text, uuid, integer, integer, integer), public.get_claim_alerts(uuid), public.get_alert_workspace(uuid),
  public.update_risk_alert(uuid, uuid, text, text, text), public.record_risk_review(uuid, text, text, text, uuid[], text, date, text, boolean) to authenticated;
