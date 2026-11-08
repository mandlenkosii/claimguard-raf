-- Migration 9: row level security and every Section 9 policy. Every policy requires is_active_user() (SEC29).

-- Summary views. They are security invoker; their rows come from checked definer functions,
-- so managers and administrators get summary columns with no access to the base tables (SEC5, SEC6).
create function public.claim_summary_rows()
returns table (id uuid, reference text, status text, readiness_score integer, blocking_count integer, warning_count integer, open_request_count integer, assignment_count integer, created_at timestamptz, updated_at timestamptz, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.reference, c.status, ra.score, ra.blocking_count, ra.warning_count,
    (select count(*)::integer from public.information_requests r where r.claim_id = c.id and r.status <> 'closed'),
    (select count(*)::integer from public.claim_assignments a where a.claim_id = c.id and a.ended_at is null),
    c.created_at, c.updated_at, c.submitted_at
  from public.claims c
  left join lateral (select score, blocking_count, warning_count from public.readiness_assessments x where x.claim_id = c.id order by assessed_at desc limit 1) ra on true
  where public.is_active_user() and (public.has_role('manager') or public.has_role('admin'));
$$;
create view public.claim_summaries with (security_invoker = true) as select * from public.claim_summary_rows();

-- SEC14 "Limited": the neutral flag only, plus the final outcome label for officers.
create function public.claim_risk_flag_rows()
returns table (claim_id uuid, flag text, outcome_label text)
language sql stable security definer set search_path = '' as $$
  select r.claim_id,
    case when bool_or(r.status in ('OPEN','UNDER_REVIEW','ESCALATED')) then 'Under review' end,
    case when public.has_role('raf_officer') then (
      select rr.outcome from public.risk_reviews rr join public.risk_alerts a on a.id = rr.alert_id
      where a.claim_id = r.claim_id order by rr.recorded_at desc limit 1
    ) end
  from public.risk_alerts r
  where public.is_active_user() and (public.has_role('raf_officer') or public.has_role('lawyer')) and public.can_access_claim(r.claim_id)
  group by r.claim_id;
$$;
create view public.claim_risk_flags with (security_invoker = true) as select * from public.claim_risk_flag_rows();

create view public.claims_list with (security_invoker = true) as
  select c.id, c.reference, c.status, cl.first_name || ' ' || cl.surname as claimant_name, c.representing_organisation_id,
         ra.score as readiness_score, ra.blocking_count, c.created_at, c.updated_at
  from public.claims c
  join public.claimants cl on cl.id = c.claimant_id
  left join lateral (select x.score, x.blocking_count from public.readiness_assessments x where x.claim_id = c.id order by x.assessed_at desc limit 1) ra on true
  union all
  select s.id, s.reference, s.status, null, null, s.readiness_score, s.blocking_count, s.created_at, s.updated_at
  from public.claim_summaries s;

-- RLS on for every table.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- SEC34: anonymous users get nothing; signed-in users get only what is granted below, still limited by RLS.
revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
revoke all on all routines in schema public from anon, authenticated, public;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on routines from anon, authenticated;
alter default privileges for role postgres revoke execute on routines from public;

grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all routines in schema public to service_role;

grant execute on function public.is_active_user(), public.has_role(text), public.has_permission(text), public.has_permission_scope(text, text),
  public.is_org_member(uuid), public.is_own_claimant(uuid), public.is_firm_client(uuid), public.is_claim_owner(uuid), public.is_authorised_lawyer(uuid), public.is_assigned_officer(uuid),
  public.can_access_claim(uuid), public.can_edit_claim(uuid), public.can_upload_document(uuid), public.is_claim_participant(uuid),
  public.can_access_alert(uuid), public.path_claim_id(text), public.claim_summary_rows(), public.claim_risk_flag_rows()
to authenticated;

-- Column privileges (SEC8, SEC22, SEC25): status, reference and account fields are never directly writable.
grant update (first_name, surname, mobile, preferred_language, preferred_contact_method) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant update (claimant_role, accident_date, accident_time, accident_province, accident_town, accident_location, police_station, cas_number, accident_description, injuries_summary) on public.claims to authenticated;
grant insert, update on public.organisations, public.organisation_members, public.legal_practitioners to authenticated;
grant insert, update on public.claim_parties, public.claim_vehicles to authenticated;
grant insert on public.claimants, public.client_relationships, public.message_attachments to authenticated;
-- Server-owned fields stay out of these grants: processing state, confirmation, hashes and timestamps (BR19, BR21, BR28).
grant insert (id, claim_id, category_key, uploaded_by) on public.documents to authenticated;
grant insert (id, document_id, version, storage_path, filename, mime_type, size_bytes, uploaded_by) on public.document_versions to authenticated;
grant insert (id, alert_id, author_id, body, corrects_note_id) on public.investigation_notes to authenticated;
grant insert (id, claim_id, title, created_by) on public.message_threads to authenticated;
grant insert (id, thread_id, claim_id, author_id, body) on public.messages to authenticated;
grant insert, update on public.notification_preferences to authenticated;
grant update on public.validation_rules, public.readiness_settings, public.role_permissions to authenticated;

-- Access model.
create policy orgs_select on public.organisations for select to authenticated using (public.is_active_user() and (public.is_org_member(id) or public.has_role('admin')));
create policy orgs_insert on public.organisations for insert to authenticated with check (public.is_active_user() and public.has_role('admin'));
create policy orgs_update on public.organisations for update to authenticated using (public.is_active_user() and public.has_role('admin')) with check (public.is_active_user() and public.has_role('admin'));
create policy org_members_select on public.organisation_members for select to authenticated using (public.is_active_user() and (profile_id = auth.uid() or public.is_org_member(organisation_id) or public.has_role('admin')));
create policy org_members_insert on public.organisation_members for insert to authenticated with check (public.is_active_user() and public.has_role('admin'));
create policy org_members_update on public.organisation_members for update to authenticated using (public.is_active_user() and public.has_role('admin')) with check (public.is_active_user() and public.has_role('admin'));
create policy practitioners_select on public.legal_practitioners for select to authenticated using (public.is_active_user() and (profile_id = auth.uid() or public.is_org_member(organisation_id) or public.has_role('admin')));
create policy practitioners_insert on public.legal_practitioners for insert to authenticated with check (public.is_active_user() and public.has_role('admin'));
create policy practitioners_update on public.legal_practitioners for update to authenticated using (public.is_active_user() and public.has_role('admin')) with check (public.is_active_user() and public.has_role('admin'));
create policy profiles_select on public.profiles for select to authenticated using (public.is_active_user() and (id = auth.uid() or public.has_role('admin')));
create policy profiles_update on public.profiles for update to authenticated using (public.is_active_user() and id = auth.uid()) with check (public.is_active_user() and id = auth.uid());
create policy roles_select on public.roles for select to authenticated using (public.is_active_user());
create policy permissions_select on public.permissions for select to authenticated using (public.is_active_user());
create policy role_permissions_select on public.role_permissions for select to authenticated using (public.is_active_user());
create policy settings_update on public.role_permissions for update to authenticated using (public.is_active_user() and public.has_role('admin')) with check (public.is_active_user() and public.has_role('admin'));
create policy user_roles_select on public.user_roles for select to authenticated using (public.is_active_user() and (user_id = auth.uid() or public.has_role('admin')));

-- Clients and claims.
create policy clients_select on public.claimants for select to authenticated using (
  public.is_active_user() and (
    public.is_own_claimant(id)
    or public.is_firm_client(id)
    or exists (select 1 from public.claims c where c.claimant_id = claimants.id and public.can_access_claim(c.id))
  )
);
create policy clients_insert on public.claimants for insert to authenticated with check (public.is_active_user() and public.has_role('lawyer') and created_by = auth.uid());
create policy client_relationships_select on public.client_relationships for select to authenticated using (
  public.is_active_user() and (
    (public.has_role('lawyer') and public.is_org_member(organisation_id))
    or public.is_own_claimant(claimant_id)
    or exists (select 1 from public.claims c where c.claimant_id = client_relationships.claimant_id and c.representing_organisation_id = client_relationships.organisation_id and public.can_access_claim(c.id))
  )
);
create policy client_relationships_insert on public.client_relationships for insert to authenticated with check (public.is_active_user() and public.has_role('lawyer') and public.is_org_member(organisation_id));
create policy claims_select on public.claims for select to authenticated using (public.is_active_user() and public.can_access_claim(id));
create policy claims_update on public.claims for update to authenticated using (public.is_active_user() and public.can_edit_claim(id)) with check (public.is_active_user() and public.can_edit_claim(id));
create policy claim_parties_select on public.claim_parties for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy claim_parties_insert on public.claim_parties for insert to authenticated with check (public.is_active_user() and public.can_edit_claim(claim_id));
create policy claim_parties_update on public.claim_parties for update to authenticated using (public.is_active_user() and public.can_edit_claim(claim_id)) with check (public.is_active_user() and public.can_edit_claim(claim_id));
create policy claim_vehicles_select on public.claim_vehicles for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy claim_vehicles_insert on public.claim_vehicles for insert to authenticated with check (public.is_active_user() and public.can_edit_claim(claim_id));
create policy claim_vehicles_update on public.claim_vehicles for update to authenticated using (public.is_active_user() and public.can_edit_claim(claim_id)) with check (public.is_active_user() and public.can_edit_claim(claim_id));
create policy claim_assignments_select on public.claim_assignments for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));

-- Documents.
create policy document_categories_select on public.document_categories for select to authenticated using (public.is_active_user());
create policy documents_select on public.documents for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy documents_insert on public.documents for insert to authenticated with check (public.is_active_user() and public.can_upload_document(claim_id) and uploaded_by = auth.uid());
create policy document_versions_select on public.document_versions for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.documents d where d.id = document_id and public.can_access_claim(d.claim_id))
);
create policy document_versions_insert on public.document_versions for insert to authenticated with check (
  public.is_active_user() and uploaded_by = auth.uid()
  and exists (select 1 from public.documents d where d.id = document_id and public.can_upload_document(d.claim_id) and storage_path like 'claims/' || d.claim_id::text || '/%')
);
create policy document_extractions_select on public.document_extractions for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.document_versions v join public.documents d on d.id = v.document_id where v.id = document_version_id and public.can_access_claim(d.claim_id))
);
create policy extracted_fields_select on public.extracted_fields for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.document_extractions e join public.document_versions v on v.id = e.document_version_id join public.documents d on d.id = v.document_id where e.id = extraction_id and public.can_access_claim(d.claim_id))
);
create policy field_corrections_select on public.extracted_field_corrections for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.extracted_fields f join public.document_extractions e on e.id = f.extraction_id join public.document_versions v on v.id = e.document_version_id join public.documents d on d.id = v.document_id where f.id = field_id and public.can_access_claim(d.claim_id))
);

-- Readiness.
create policy rules_select on public.validation_rules for select to authenticated using (public.is_active_user());
create policy rules_update on public.validation_rules for update to authenticated using (public.is_active_user() and public.has_role('admin')) with check (public.is_active_user() and public.has_role('admin'));
create policy readiness_settings_select on public.readiness_settings for select to authenticated using (public.is_active_user());
create policy readiness_settings_update on public.readiness_settings for update to authenticated using (public.is_active_user() and public.has_role('admin')) with check (public.is_active_user() and public.has_role('admin'));
create policy readiness_select on public.readiness_assessments for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy checks_select on public.claim_checks for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy issues_select on public.claim_issues for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy issue_history_select on public.claim_issue_history for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.claim_issues i where i.id = issue_id and public.can_access_claim(i.claim_id))
);

-- Risk and investigation (SEC14, SEC16).
create policy alerts_select on public.risk_alerts for select to authenticated using (public.is_active_user() and public.can_access_alert(id));
create policy evidence_select on public.risk_evidence for select to authenticated using (public.is_active_user() and public.can_access_alert(alert_id));
create policy alert_history_select on public.risk_alert_history for select to authenticated using (public.is_active_user() and public.can_access_alert(alert_id));
create policy notes_select on public.investigation_notes for select to authenticated using (public.is_active_user() and public.can_access_alert(alert_id));
create policy notes_insert on public.investigation_notes for insert to authenticated with check (public.is_active_user() and public.can_access_alert(alert_id) and author_id = auth.uid());
create policy reviews_select on public.risk_reviews for select to authenticated using (public.is_active_user() and public.can_access_alert(alert_id));

-- Requests and messaging.
create policy requests_select on public.information_requests for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy responses_select on public.request_responses for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.information_requests r where r.id = request_id and public.can_access_claim(r.claim_id))
);
create policy request_history_select on public.request_status_history for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.information_requests r where r.id = request_id and public.can_access_claim(r.claim_id))
);
create policy threads_select on public.message_threads for select to authenticated using (public.is_active_user() and public.is_claim_participant(claim_id));
create policy threads_insert on public.message_threads for insert to authenticated with check (public.is_active_user() and public.is_claim_participant(claim_id) and created_by = auth.uid());
create policy messages_select on public.messages for select to authenticated using (public.is_active_user() and public.is_claim_participant(claim_id));
create policy messages_insert on public.messages for insert to authenticated with check (public.is_active_user() and public.is_claim_participant(claim_id) and author_id = auth.uid());
create policy attachments_select on public.message_attachments for select to authenticated using (
  public.is_active_user() and exists (select 1 from public.messages m where m.id = message_id and public.is_claim_participant(m.claim_id))
);
create policy attachments_insert on public.message_attachments for insert to authenticated with check (
  public.is_active_user() and exists (select 1 from public.messages m where m.id = message_id and public.is_claim_participant(m.claim_id))
);

-- Timeline, notifications and audit.
create policy timeline_select on public.claim_timeline_events for select to authenticated using (public.is_active_user() and public.can_access_claim(claim_id));
create policy notifications_select on public.notifications for select to authenticated using (public.is_active_user() and recipient_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (public.is_active_user() and recipient_id = auth.uid()) with check (public.is_active_user() and recipient_id = auth.uid());
create policy preferences_select on public.notification_preferences for select to authenticated using (public.is_active_user() and user_id = auth.uid());
create policy preferences_insert on public.notification_preferences for insert to authenticated with check (public.is_active_user() and user_id = auth.uid());
create policy preferences_update on public.notification_preferences for update to authenticated using (public.is_active_user() and user_id = auth.uid()) with check (public.is_active_user() and user_id = auth.uid());
create policy audit_select on public.audit_logs for select to authenticated using (
  public.is_active_user() and (public.has_role('admin') or (claim_id is not null and public.has_permission('audit.view') and public.can_access_claim(claim_id)))
);
