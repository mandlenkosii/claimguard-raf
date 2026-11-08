-- Migration 7: information requests and messaging (Section 8.1).
create table public.information_requests (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  description text not null check (char_length(description) between 1 and 4000),
  recipient_type text not null check (recipient_type in ('claimant','legal_representative')),
  linked_issue_id uuid references public.claim_issues (id) on delete set null,
  requests_documents boolean not null default false,
  due_date date,
  status text not null default 'pending' check (status in ('pending','responded','under_review','closed')),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  closed_by uuid references public.profiles (id),
  closed_at timestamptz
);

create table public.request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.information_requests (id) on delete restrict,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.request_responses for each row execute function public.append_only();

create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.information_requests (id) on delete restrict,
  from_status text,
  to_status text not null,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.request_status_history for each row execute function public.append_only();

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 150),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (id, claim_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  claim_id uuid not null references public.claims (id) on delete restrict,
  author_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  -- A message's claim must match its thread's claim.
  foreign key (thread_id, claim_id) references public.message_threads (id, claim_id) on delete restrict
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null unique,
  filename text not null check (char_length(filename) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes integer not null check (size_bytes between 1 and 10485760)
);

