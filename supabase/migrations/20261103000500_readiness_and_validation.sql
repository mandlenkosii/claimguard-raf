-- Migration 5: rules, readiness and issues (Section 8.1).
create table public.validation_rules (
  id text primary key check (id ~ '^RULE-[0-9]{3}$'),
  name text not null check (char_length(name) between 1 and 100),
  version text not null check (char_length(version) between 1 and 20),
  claim_type text,
  readiness_category text not null check (readiness_category in ('documentation','required_information','identity','timeline','cross_document')),
  required_inputs jsonb not null default '[]'::jsonb,
  impact text not null check (impact in ('blocking','warning')),
  explanation text not null check (char_length(explanation) between 1 and 500),
  corrective_action text not null check (char_length(corrective_action) between 1 and 300),
  blocks_transition boolean not null,
  creates_risk_alert boolean not null default false,
  risk_indicator text check (risk_indicator in ('identity_mismatch','date_inconsistency','duplicate_hash')),
  risk_severity text check (risk_severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  enabled boolean not null default true,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint rule_001_never_creates_alert check (id <> 'RULE-001' or creates_risk_alert = false)
);
create trigger set_updated_at before update on public.validation_rules for each row execute function public.set_updated_at();

create table public.readiness_settings (
  id boolean primary key default true check (id = true),
  rules_version text not null check (char_length(rules_version) between 1 and 20),
  weight_documentation integer not null default 30 check (weight_documentation between 0 and 100),
  weight_required_information integer not null default 25 check (weight_required_information between 0 and 100),
  weight_identity integer not null default 15 check (weight_identity between 0 and 100),
  weight_timeline integer not null default 15 check (weight_timeline between 0 and 100),
  weight_cross_document integer not null default 15 check (weight_cross_document between 0 and 100),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint weights_total_100 check (weight_documentation + weight_required_information + weight_identity + weight_timeline + weight_cross_document = 100)
);
create trigger set_updated_at before update on public.readiness_settings for each row execute function public.set_updated_at();

create table public.readiness_assessments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  rules_version text not null,
  input_hash text not null,
  score integer not null check (score between 0 and 100),
  category_scores jsonb not null,
  blocking_count integer not null check (blocking_count >= 0),
  warning_count integer not null check (warning_count >= 0),
  resolved_count integer not null check (resolved_count >= 0),
  triggered_by uuid references public.profiles (id),
  assessed_at timestamptz not null default now()
);

create table public.claim_checks (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.readiness_assessments (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  rule_id text not null references public.validation_rules (id),
  rule_version text not null,
  result text not null check (result in ('passed','failed','not_applicable')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.claim_issues (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  rule_id text not null references public.validation_rules (id),
  issue_key text not null check (char_length(issue_key) between 1 and 200),
  check_id uuid references public.claim_checks (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  explanation text not null check (char_length(explanation) between 1 and 1000),
  corrective_action text not null check (char_length(corrective_action) between 1 and 300),
  impact text not null check (impact in ('blocking','warning')),
  status text not null default 'open' check (status in ('open','under_review','resolved','dismissed')),
  dismiss_reason text check (char_length(dismiss_reason) between 1 and 500),
  classification text check (classification in ('extraction_error','genuine_discrepancy')),
  evidence jsonb not null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint dismiss_needs_reason check (status <> 'dismissed' or dismiss_reason is not null),
  constraint discrepancy_needs_evidence check (rule_id not in ('RULE-002','RULE-003','RULE-004') or jsonb_array_length(evidence) >= 1)
);
create trigger set_updated_at before update on public.claim_issues for each row execute function public.set_updated_at();

create table public.claim_issue_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.claim_issues (id) on delete restrict,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles (id) on delete restrict,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.claim_issue_history for each row execute function public.append_only();
