-- Migration 6: risk alerts and investigation (Section 8.1). Alerts are indicators, never fraud findings.
create table public.risk_alerts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^RA-[0-9]{4}-[0-9]{5}$'),
  claim_id uuid not null references public.claims (id) on delete restrict,
  rule_id text references public.validation_rules (id),
  indicator_type text not null check (indicator_type in ('identity_mismatch','date_inconsistency','duplicate_hash')),
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','UNDER_REVIEW','ESCALATED','RESOLVED','DISMISSED')),
  title text not null check (char_length(title) between 1 and 200),
  explanation text not null check (char_length(explanation) between 1 and 1000),
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.risk_alerts for each row execute function public.set_updated_at();

create function public.set_alert_reference() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_next integer;
begin
  perform pg_advisory_xact_lock(hashtext('alert_reference_' || v_year));
  select coalesce(max(substr(reference, 9)::integer), 0) + 1 into v_next
  from public.risk_alerts where reference like 'RA-' || v_year || '-%';
  new.reference := format('RA-%s-%s', v_year, lpad(v_next::text, 5, '0'));
  return new;
end;
$$;
create trigger set_alert_reference before insert on public.risk_alerts for each row execute function public.set_alert_reference();

create table public.risk_evidence (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.risk_alerts (id) on delete cascade,
  document_version_id uuid references public.document_versions (id),
  extracted_field_id uuid references public.extracted_fields (id),
  claim_field text check (char_length(claim_field) <= 100),
  description text not null check (char_length(description) between 1 and 500),
  constraint evidence_has_source check (document_version_id is not null or extracted_field_id is not null or claim_field is not null)
);

create table public.risk_alert_history (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.risk_alerts (id) on delete restrict,
  change_type text not null check (change_type in ('severity','assignment','status','outcome')),
  old_value text,
  new_value text,
  actor_id uuid references public.profiles (id) on delete restrict,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.risk_alert_history for each row execute function public.append_only();

create table public.investigation_notes (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.risk_alerts (id) on delete restrict,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 5000),
  corrects_note_id uuid references public.investigation_notes (id) on delete restrict,
  created_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.investigation_notes for each row execute function public.append_only();

create table public.risk_reviews (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.risk_alerts (id) on delete restrict,
  outcome text not null check (outcome in ('no_issue_explained','extraction_error_corrected','discrepancy_confirmed_referred','escalated_senior')),
  finding_summary text not null check (char_length(finding_summary) between 1 and 2000),
  rationale text not null check (char_length(rationale) between 1 and 4000),
  evidence_ids uuid[] not null default '{}',
  next_action text not null check (char_length(next_action) between 1 and 300),
  next_action_due date,
  resulting_status text not null check (resulting_status in ('RESOLVED','DISMISSED','ESCALATED')),
  confirmed boolean not null check (confirmed = true),
  recorded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  recorded_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.risk_reviews for each row execute function public.append_only();

create function public.can_access_alert(p_alert uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('investigator') and exists (
    select 1 from public.risk_alerts r
    where r.id = p_alert and (
      r.assigned_to = auth.uid()
      or exists (select 1 from public.claim_assignments a where a.claim_id = r.claim_id and a.profile_id = auth.uid() and a.assignment_role = 'investigator' and a.ended_at is null)
      or public.has_permission_scope('risk.view_evidence', 'permitted')
    )
  );
$$;
