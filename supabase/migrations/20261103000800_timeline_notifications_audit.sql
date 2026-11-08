-- Migration 8: timeline, notifications, audit and automatic triggers (Sections 8.1, 8.5).
create table public.claim_timeline_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete restrict,
  event_type text not null check (event_type in ('claim_created','claim_updated','status_changed','status_change_blocked','document_uploaded','document_version_added','document_processed','validation_run','readiness_assessed','request_sent','response_received','request_closed','assignment_changed','message_posted')),
  actor_id uuid references public.profiles (id) on delete restrict,
  actor_role text,
  summary text not null check (char_length(summary) between 1 and 300),
  from_status text,
  to_status text,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.claim_timeline_events for each row execute function public.append_only();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('request','response','assignment','claim_update','message')),
  claim_id uuid references public.claims (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 300),
  link text not null check (char_length(link) between 1 and 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('request','response','assignment','claim_update','message')),
  in_app boolean not null default true,
  email boolean not null default false,
  primary key (user_id, category)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete restrict,
  actor_role text,
  action text not null check (char_length(action) between 1 and 60),
  resource_type text not null check (char_length(resource_type) between 1 and 60),
  resource_id text,
  claim_id uuid references public.claims (id) on delete restrict,
  change_summary jsonb not null default '{}'::jsonb,
  reason text check (char_length(reason) <= 500),
  outcome text not null default 'success' check (outcome in ('success','denied')),
  session_ref text,
  created_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.audit_logs for each row execute function public.append_only();

-- TXT-60 … TXT-64 (BR22). Same templates as _shared/rules/notificationText.ts.
create function public.notification_text(p_type text, p_reference text, p_status text)
returns table (title text, summary text)
language sql immutable set search_path = '' as $$
  select case p_type
           when 'request' then 'New information request'
           when 'response' then 'New response'
           when 'assignment' then 'Claim assigned'
           when 'claim_update' then 'Claim status updated'
           when 'message' then 'New message'
         end,
         case p_type
           when 'request' then format('You have a new information request on claim %s.', p_reference)
           when 'response' then format('A response was submitted on claim %s.', p_reference)
           when 'assignment' then format('You have been assigned to claim %s.', p_reference)
           when 'claim_update' then format('Claim %s is now %s.', p_reference, p_status)
           when 'message' then format('You have a new message on claim %s.', p_reference)
         end;
$$;

create function public.status_label(p_status text) returns text
language sql immutable set search_path = '' as $$
  select case p_status
    when 'draft' then 'Draft' when 'documents_needed' then 'Documents Needed' when 'validation' then 'Validation'
    when 'ready' then 'Ready' when 'submitted' then 'Submitted' when 'raf_review' then 'RAF Review'
    when 'information_required' then 'Information Required' when 'assessment' then 'Assessment'
    when 'negotiation' then 'Negotiation' when 'settlement' then 'Settlement' when 'closed' then 'Closed'
    when 'withdrawn' then 'Withdrawn' when 'rejected' then 'Rejected' when 'escalated' then 'Escalated'
  end;
$$;

-- The first role in the Section 11 order (Section 18 #23).
create function public.current_actor_role() returns text
language sql stable security definer set search_path = '' as $$
  select role_key from public.user_roles where user_id = auth.uid()
  order by array_position(array['claimant','lawyer','raf_officer','investigator','manager','admin'], role_key) limit 1;
$$;

create function public.claim_participant_ids(p_claim uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select cl.profile_id from public.claims c join public.claimants cl on cl.id = c.claimant_id where c.id = p_claim and cl.profile_id is not null
  union
  select r.assigned_lawyer_id from public.claims c join public.client_relationships r on r.organisation_id = c.representing_organisation_id and r.claimant_id = c.claimant_id where c.id = p_claim and r.assigned_lawyer_id is not null
  union
  select a.profile_id from public.claim_assignments a where a.claim_id = p_claim and a.assignment_role in ('lawyer','raf_officer') and a.ended_at is null;
$$;

create function public.write_audit(p_action text, p_resource_type text, p_resource_id text, p_claim uuid, p_summary jsonb, p_reason text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, claim_id, change_summary, reason)
  values (auth.uid(), public.current_actor_role(), p_action, p_resource_type, p_resource_id, p_claim, p_summary, p_reason);
$$;

create function public.write_timeline(p_claim uuid, p_type text, p_summary text, p_from text default null, p_to text default null, p_reason text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.claim_timeline_events (claim_id, event_type, actor_id, actor_role, summary, from_status, to_status, reason)
  values (p_claim, p_type, auth.uid(), public.current_actor_role(), p_summary, p_from, p_to, p_reason);
$$;

create function public.send_notification(p_recipient uuid, p_type text, p_claim uuid, p_link text, p_status text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (recipient_id, type, claim_id, title, summary, link)
  select p_recipient, p_type, p_claim, t.title, t.summary, p_link
  from public.claims c, public.notification_text(p_type, c.reference, p_status) t
  where c.id = p_claim;
$$;

-- Generic audit. Only the whitelisted, non-sensitive columns in argument 4 are ever copied (BR26).
-- Arguments: insert action, update action, resource type, claim column ('' or @document / @request / @alert),
-- whitelist (comma list), id column.
create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n jsonb := to_jsonb(new);
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  v_summary jsonb := '{}'::jsonb;
  v_col text;
  v_claim uuid;
  v_action text := case when tg_op = 'INSERT' then tg_argv[0] else tg_argv[1] end;
  v_claim_col text := tg_argv[3];
begin
  if v_action = '' then
    return null;
  end if;
  foreach v_col in array string_to_array(tg_argv[4], ',') loop
    if tg_op = 'INSERT' then
      v_summary := v_summary || jsonb_build_object(v_col, n -> v_col);
    elsif (n -> v_col) is distinct from (o -> v_col) then
      v_summary := v_summary || jsonb_build_object(v_col, jsonb_build_object('from', o -> v_col, 'to', n -> v_col));
    end if;
  end loop;
  if tg_op = 'UPDATE' and v_summary = '{}'::jsonb then
    return null;
  end if;

  if v_claim_col = '@document' then
    select claim_id into v_claim from public.documents where id = (n ->> 'document_id')::uuid;
  elsif v_claim_col = '@request' then
    select claim_id into v_claim from public.information_requests where id = (n ->> 'request_id')::uuid;
  elsif v_claim_col = '@alert' then
    select claim_id into v_claim from public.risk_alerts where id = (n ->> 'alert_id')::uuid;
  elsif v_claim_col <> '' then
    v_claim := (n ->> v_claim_col)::uuid;
  end if;

  perform public.write_audit(v_action, tg_argv[2], n ->> tg_argv[5], v_claim, v_summary);
  return null;
end;
$$;

-- Columns whose change counts as a claim edit; values are never copied, only the names.
create function public.claim_changed_fields(o public.claims, n public.claims) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(key order by key), '{}')
  from jsonb_each(to_jsonb(n)) e
  where e.key not in ('updated_at','readiness_stale','reference','status','submitted_at')
    and e.value is distinct from (to_jsonb(o) -> e.key);
$$;

create function public.audit_claim() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_fields text[];
begin
  if tg_op = 'INSERT' then
    perform public.write_audit('CLAIM_CREATED', 'claim', new.id::text, new.id, jsonb_build_object('status', new.status));
  elsif new.status is distinct from old.status then
    perform public.write_audit('STATUS_CHANGED', 'claim', new.id::text, new.id, jsonb_build_object('from', old.status, 'to', new.status), nullif(current_setting('app.change_reason', true), ''));
  else
    v_fields := public.claim_changed_fields(old, new);
    if array_length(v_fields, 1) > 0 then
      perform public.write_audit('CLAIM_UPDATED', 'claim', new.id::text, new.id, jsonb_build_object('fields', to_jsonb(v_fields)));
    end if;
  end if;
  return null;
end;
$$;
create trigger audit_claims after insert or update on public.claims for each row execute function public.audit_claim();

create trigger audit_claim_assignments after insert or update on public.claim_assignments for each row execute function public.audit_row('ASSIGNMENT_CHANGED','ASSIGNMENT_CHANGED','claim_assignment','claim_id','profile_id,assignment_role,ended_at','id');
create trigger audit_documents after insert or update on public.documents for each row execute function public.audit_row('DOCUMENT_UPLOADED','DOCUMENT_UPDATED','document','claim_id','category_key,processing_status,current_version,deleted_at','id');
create trigger audit_document_versions after insert or update on public.document_versions for each row execute function public.audit_row('DOCUMENT_VERSION_ADDED','DOCUMENT_VERSION_UPDATED','document_version','@document','version,mime_type,size_bytes,confirmed,malware_scan_status','id');
create trigger audit_information_requests after insert or update on public.information_requests for each row execute function public.audit_row('REQUEST_CREATED','REQUEST_UPDATED','information_request','claim_id','status,due_date,recipient_type','id');
create trigger audit_request_responses after insert on public.request_responses for each row execute function public.audit_row('RESPONSE_SUBMITTED','','request_response','@request','','id');
create trigger audit_messages after insert on public.messages for each row execute function public.audit_row('MESSAGE_POSTED','','message','claim_id','','id');
create trigger audit_risk_alerts after insert or update on public.risk_alerts for each row execute function public.audit_row('ALERT_CREATED','ALERT_UPDATED','risk_alert','claim_id','severity,status,assigned_to','id');
create trigger audit_risk_reviews after insert on public.risk_reviews for each row execute function public.audit_row('REVIEW_RECORDED','','risk_review','@alert','outcome,resulting_status','id');
create trigger audit_user_roles after insert or update on public.user_roles for each row execute function public.audit_row('ROLE_CHANGED','ROLE_CHANGED','user_role','','role_key,assigned_by','user_id');
create trigger audit_profiles_account_status after update of account_status on public.profiles for each row execute function public.audit_row('','ACCOUNT_STATUS_CHANGED','profile','','account_status','id');
create trigger audit_organisations after insert or update on public.organisations for each row execute function public.audit_row('ORGANISATION_CREATED','ORGANISATION_UPDATED','organisation','','name,type,status','id');
create trigger audit_validation_rules after insert or update on public.validation_rules for each row execute function public.audit_row('RULE_CREATED','RULE_UPDATED','validation_rule','','version,impact,enabled,blocks_transition,creates_risk_alert','id');
create trigger audit_readiness_settings after insert or update on public.readiness_settings for each row execute function public.audit_row('SETTINGS_UPDATED','SETTINGS_UPDATED','readiness_settings','','rules_version,weight_documentation,weight_required_information,weight_identity,weight_timeline,weight_cross_document','id');
create trigger audit_field_corrections after insert on public.extracted_field_corrections for each row execute function public.audit_row('FIELD_CORRECTED','','extracted_field_correction','','field_id','id');

-- Timeline (BR5). Summaries are fixed phrases with no sensitive values (BR26).
create function public.timeline_claim() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_timeline(new.id, 'claim_created', 'Claim created');
  elsif new.status is distinct from old.status then
    perform public.write_timeline(new.id, 'status_changed', format('Status changed from %s to %s', public.status_label(old.status), public.status_label(new.status)), old.status, new.status, nullif(current_setting('app.change_reason', true), ''));
  elsif array_length(public.claim_changed_fields(old, new), 1) > 0 then
    perform public.write_timeline(new.id, 'claim_updated', 'Claim details updated');
  end if;
  return null;
end;
$$;
create trigger timeline_claims after insert or update on public.claims for each row execute function public.timeline_claim();

create function public.timeline_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_timeline(new.claim_id, 'document_uploaded', 'Document uploaded');
  elsif new.processing_status = 'processed' and old.processing_status is distinct from 'processed' then
    perform public.write_timeline(new.claim_id, 'document_processed', 'Document processed');
  end if;
  return null;
end;
$$;
create trigger timeline_documents after insert or update on public.documents for each row execute function public.timeline_document();

create function public.timeline_document_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.version > 1 then
    perform public.write_timeline((select claim_id from public.documents where id = new.document_id), 'document_version_added', 'New document version added');
  end if;
  return null;
end;
$$;
create trigger timeline_document_versions after insert on public.document_versions for each row execute function public.timeline_document_version();

create function public.timeline_readiness() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.write_timeline(new.claim_id, 'readiness_assessed', 'Readiness assessed');
  return null;
end;
$$;
create trigger timeline_readiness_assessments after insert on public.readiness_assessments for each row execute function public.timeline_readiness();

create function public.timeline_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_timeline(new.claim_id, 'request_sent', 'Information request sent');
  elsif new.status = 'closed' and old.status is distinct from 'closed' then
    perform public.write_timeline(new.claim_id, 'request_closed', 'Information request closed');
  end if;
  return null;
end;
$$;
create trigger timeline_information_requests after insert or update on public.information_requests for each row execute function public.timeline_request();

create function public.timeline_response() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.write_timeline((select claim_id from public.information_requests where id = new.request_id), 'response_received', 'Response received');
  return null;
end;
$$;
create trigger timeline_request_responses after insert on public.request_responses for each row execute function public.timeline_response();

create function public.timeline_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.write_timeline(new.claim_id, 'assignment_changed', 'Staff assignment changed');
  return null;
end;
$$;
create trigger timeline_claim_assignments after insert or update on public.claim_assignments for each row execute function public.timeline_assignment();

create function public.timeline_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.write_timeline(new.claim_id, 'message_posted', 'Message posted');
  return null;
end;
$$;
create trigger timeline_messages after insert on public.messages for each row execute function public.timeline_message();

-- History (BR15, BR20, FR-RISK-08).
create function public.history_claim_issue() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.claim_issue_history (issue_id, from_status, to_status, actor_id, reason)
    values (new.id, old.status, new.status, auth.uid(), new.dismiss_reason);
  end if;
  return null;
end;
$$;
create trigger history_claim_issues after update of status on public.claim_issues for each row execute function public.history_claim_issue();

create function public.history_risk_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := nullif(current_setting('app.change_reason', true), '');
begin
  if new.severity is distinct from old.severity then
    insert into public.risk_alert_history (alert_id, change_type, old_value, new_value, actor_id, reason) values (new.id, 'severity', old.severity, new.severity, auth.uid(), v_reason);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.risk_alert_history (alert_id, change_type, old_value, new_value, actor_id, reason) values (new.id, 'assignment', old.assigned_to::text, new.assigned_to::text, auth.uid(), v_reason);
  end if;
  if new.status is distinct from old.status then
    insert into public.risk_alert_history (alert_id, change_type, old_value, new_value, actor_id, reason) values (new.id, 'status', old.status, new.status, auth.uid(), v_reason);
  end if;
  return null;
end;
$$;
create trigger history_risk_alerts after update on public.risk_alerts for each row execute function public.history_risk_alert();

create function public.history_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.request_status_history (request_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, coalesce(auth.uid(), new.created_by));
  end if;
  return null;
end;
$$;
create trigger history_information_requests after update of status on public.information_requests for each row execute function public.history_request();

-- Notifications (BR22): relevant participants only, never the person who acted.
create function public.notify_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recipient uuid;
begin
  for v_recipient in
    select cl.profile_id from public.claims c join public.claimants cl on cl.id = c.claimant_id
    where new.recipient_type = 'claimant' and c.id = new.claim_id and cl.profile_id is not null
    union
    select r.assigned_lawyer_id from public.claims c join public.client_relationships r on r.organisation_id = c.representing_organisation_id and r.claimant_id = c.claimant_id
    where new.recipient_type = 'legal_representative' and c.id = new.claim_id and r.assigned_lawyer_id is not null
    union
    select a.profile_id from public.claim_assignments a
    where new.recipient_type = 'legal_representative' and a.claim_id = new.claim_id and a.assignment_role = 'lawyer' and a.ended_at is null
  loop
    perform public.send_notification(v_recipient, 'request', new.claim_id, format('/claims/%s/requests/%s', new.claim_id, new.id));
  end loop;
  return null;
end;
$$;
create trigger notify_information_requests after insert on public.information_requests for each row execute function public.notify_request();

create function public.notify_response() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.information_requests;
  v_recipient uuid;
begin
  select * into v_request from public.information_requests where id = new.request_id;
  for v_recipient in
    select v_request.created_by
    union
    select a.profile_id from public.claim_assignments a where a.claim_id = v_request.claim_id and a.assignment_role = 'raf_officer' and a.ended_at is null
  loop
    if v_recipient is distinct from new.author_id then
      perform public.send_notification(v_recipient, 'response', v_request.claim_id, format('/claims/%s/requests/%s', v_request.claim_id, v_request.id));
    end if;
  end loop;
  return null;
end;
$$;
create trigger notify_request_responses after insert on public.request_responses for each row execute function public.notify_response();

create function public.notify_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.send_notification(new.profile_id, 'assignment', new.claim_id, format('/claims/%s', new.claim_id));
  return null;
end;
$$;
create trigger notify_claim_assignments after insert on public.claim_assignments for each row execute function public.notify_assignment();

create function public.notify_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recipient uuid;
begin
  for v_recipient in select public.claim_participant_ids(new.claim_id) loop
    if v_recipient is distinct from new.author_id then
      perform public.send_notification(v_recipient, 'message', new.claim_id, format('/claims/%s/messages', new.claim_id));
    end if;
  end loop;
  return null;
end;
$$;
create trigger notify_messages after insert on public.messages for each row execute function public.notify_message();

create function public.notify_claim_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recipient uuid;
begin
  if new.status is distinct from old.status then
    for v_recipient in select public.claim_participant_ids(new.id) loop
      if v_recipient is distinct from auth.uid() then
        perform public.send_notification(v_recipient, 'claim_update', new.id, format('/claims/%s', new.id), public.status_label(new.status));
      end if;
    end loop;
  end if;
  return null;
end;
$$;
create trigger notify_claims after update of status on public.claims for each row execute function public.notify_claim_status();

-- Readiness goes stale when its inputs change (BR12, FR-READY-06).
create function public.mark_claim_stale_on_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if array_length(public.claim_changed_fields(old, new), 1) > 0 then
    new.readiness_stale := true;
  end if;
  return new;
end;
$$;
create trigger mark_readiness_stale before update on public.claims for each row execute function public.mark_claim_stale_on_edit();

create function public.mark_readiness_stale() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_claim uuid;
begin
  if tg_table_name in ('claim_parties', 'claim_vehicles', 'documents') then
    v_claim := new.claim_id;
  elsif tg_table_name = 'document_versions' then
    select claim_id into v_claim from public.documents where id = new.document_id;
  elsif tg_table_name = 'extracted_fields' then
    select d.claim_id into v_claim
    from public.document_extractions e
    join public.document_versions v on v.id = e.document_version_id
    join public.documents d on d.id = v.document_id
    where e.id = new.extraction_id;
  end if;
  update public.claims set readiness_stale = true where id = v_claim and readiness_stale = false;
  return null;
end;
$$;
create trigger mark_readiness_stale after insert or update on public.claim_parties for each row execute function public.mark_readiness_stale();
create trigger mark_readiness_stale after insert or update on public.claim_vehicles for each row execute function public.mark_readiness_stale();
create trigger mark_readiness_stale after insert or update on public.documents for each row execute function public.mark_readiness_stale();
create trigger mark_readiness_stale after insert or update on public.document_versions for each row execute function public.mark_readiness_stale();
create trigger mark_readiness_stale after insert or update on public.extracted_fields for each row execute function public.mark_readiness_stale();
