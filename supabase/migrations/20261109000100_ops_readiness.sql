-- Phase 6: required-information checks (Section 18 #58), saving an assessment (OP24) and issue updates (OP25).
insert into public.validation_rules (id, name, version, readiness_category, required_inputs, impact, explanation, corrective_action, blocks_transition)
values ('RULE-000', 'Required claim field missing', '1.0.0', 'required_information', '["claim"]', 'blocking', 'A required claim field has not been completed.', 'Complete the missing claim information.', true);

-- The counters on the latest assessment follow the issues, so S18 and the claim header stay honest (BR13).
create function public.refresh_readiness_counts(p_claim uuid) returns void
language sql security definer set search_path = '' as $$
  update public.readiness_assessments a set
    blocking_count = (select count(*) from public.claim_issues i where i.claim_id = p_claim and i.impact = 'blocking' and i.status in ('open', 'under_review')),
    warning_count = (select count(*) from public.claim_issues i where i.claim_id = p_claim and i.impact = 'warning' and i.status in ('open', 'under_review')),
    resolved_count = (select count(*) from public.claim_issues i where i.claim_id = p_claim and i.status = 'resolved')
  where a.id = (select x.id from public.readiness_assessments x where x.claim_id = p_claim order by x.assessed_at desc limit 1);
$$;
revoke all on function public.refresh_readiness_counts(uuid) from public, anon, authenticated;

-- OP24: one transaction, one run per claim at a time, so concurrent uploads cannot duplicate issues (BR34).
create function public.save_readiness_assessment(p_claim uuid, p_result jsonb, p_triggered_by uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_assessment uuid;
  v_issue jsonb;
  v_check uuid;
  v_alert jsonb;
  v_alert_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('readiness_' || p_claim::text));

  insert into public.readiness_assessments (claim_id, rules_version, input_hash, score, category_scores, blocking_count, warning_count, resolved_count, triggered_by)
  values (p_claim, p_result->>'rules_version', p_result->>'input_hash', (p_result->>'score')::integer, p_result->'category_scores', 0, 0, 0, p_triggered_by)
  returning id into v_assessment;

  insert into public.claim_checks (assessment_id, claim_id, rule_id, rule_version, result, details)
  select v_assessment, p_claim, c->>'rule_id', c->>'rule_version', c->>'result', coalesce(c->'details', '{}'::jsonb)
  from jsonb_array_elements(p_result->'checks') c;

  -- An issue whose rule ran and no longer reports it has been fixed.
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
    if found then continue; end if;

    -- A person's decision on this exact evidence stands; new evidence raises the issue again.
    if exists (
      select 1 from public.claim_issues
      where claim_id = p_claim and rule_id = v_issue->>'rule_id' and issue_key = v_issue->>'issue_key'
        and status in ('resolved', 'dismissed') and updated_by is not null and evidence = v_issue->'evidence'
    ) then continue; end if;

    insert into public.claim_issues (claim_id, rule_id, issue_key, check_id, title, explanation, corrective_action, impact, evidence)
    values (p_claim, v_issue->>'rule_id', v_issue->>'issue_key', v_check, v_issue->>'title', v_issue->>'explanation', v_issue->>'corrective_action', v_issue->>'impact', v_issue->'evidence');

    select a into v_alert from jsonb_array_elements(p_result->'alerts') a
    where a->>'rule_id' = v_issue->>'rule_id' and a->>'issue_key' = v_issue->>'issue_key' limit 1;
    if v_alert is null then continue; end if;

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
revoke all on function public.save_readiness_assessment(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.save_readiness_assessment(uuid, jsonb, uuid) to service_role;

-- OP25: the lawyer and the assigned officer resolve, dismiss and classify issues (Section 18 #26).
create function public.update_issue_status(p_issue uuid, p_status text default null, p_reason text default null, p_classification text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_issue public.claim_issues;
  v_reason text := nullif(btrim(p_reason), '');
begin
  select * into v_issue from public.claim_issues where id = p_issue for update;
  if not found or not public.is_active_user() or not (public.is_authorised_lawyer(v_issue.claim_id) or public.is_assigned_officer(v_issue.claim_id)) then
    raise exception 'You do not have access to this issue' using errcode = '42501';
  end if;
  if v_issue.status in ('resolved', 'dismissed') then
    raise exception 'This issue is closed' using errcode = '22023';
  end if;
  if p_status is null and p_classification is null then
    raise exception 'Nothing to update' using errcode = '22023';
  end if;
  if p_status is not null and not (
    (v_issue.status = 'open' and p_status in ('under_review', 'resolved', 'dismissed'))
    or (v_issue.status = 'under_review' and p_status in ('open', 'resolved', 'dismissed'))
  ) then
    raise exception 'That status change is not allowed' using errcode = '22023';
  end if;
  if p_status = 'dismissed' and v_reason is null then
    raise exception 'Please give a reason.' using errcode = '22023';
  end if;

  update public.claim_issues set
    status = coalesce(p_status, status),
    dismiss_reason = case when p_status = 'dismissed' then v_reason else dismiss_reason end,
    classification = coalesce(p_classification, classification),
    updated_by = auth.uid()
  where id = p_issue;

  perform public.refresh_readiness_counts(v_issue.claim_id);
end;
$$;
revoke all on function public.update_issue_status(uuid, text, text, text) from public, anon;
grant execute on function public.update_issue_status(uuid, text, text, text) to authenticated;
