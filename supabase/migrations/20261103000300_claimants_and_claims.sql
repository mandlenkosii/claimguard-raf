-- Migration 3: claimants, claims, parties, vehicles and assignments (Section 8.1).
create table public.claimants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 100),
  surname text not null check (char_length(surname) between 1 and 100),
  id_number text check (char_length(id_number) <= 20),
  date_of_birth date,
  email text check (char_length(email) <= 254),
  mobile text check (char_length(mobile) <= 20),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.client_relationships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  claimant_id uuid not null references public.claimants (id) on delete cascade,
  assigned_lawyer_id uuid references public.legal_practitioners (profile_id) on delete set null,
  mandate_status text not null default 'pending' check (mandate_status in ('on_file','pending')),
  created_at timestamptz not null default now(),
  unique (organisation_id, claimant_id)
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^CG-[0-9]{4}-[0-9]{6}$'),
  claimant_id uuid not null references public.claimants (id) on delete restrict,
  representing_organisation_id uuid references public.organisations (id) on delete set null,
  status text not null default 'draft' check (status in ('draft','documents_needed','validation','ready','submitted','raf_review','information_required','assessment','negotiation','settlement','closed','withdrawn','rejected','escalated')),
  claim_type text,
  claimant_role text check (claimant_role in ('driver','passenger','pedestrian','cyclist')),
  accident_date date check (accident_date <= current_date),
  accident_time time,
  accident_province text check (accident_province in ('Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape')),
  accident_town text check (char_length(accident_town) <= 100),
  accident_location text check (char_length(accident_location) <= 300),
  police_station text check (char_length(police_station) <= 100),
  cas_number text check (char_length(cas_number) <= 50),
  accident_description text check (char_length(accident_description) <= 4000),
  injuries_summary text check (char_length(injuries_summary) <= 2000),
  readiness_stale boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.claims for each row execute function public.set_updated_at();

-- BR1: the server always sets the reference; numbering restarts each year (Section 18 #31).
create function public.set_claim_reference() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_next integer;
begin
  perform pg_advisory_xact_lock(hashtext('claim_reference_' || v_year));
  select coalesce(max(substr(reference, 9)::integer), 0) + 1 into v_next
  from public.claims where reference like 'CG-' || v_year || '-%';
  new.reference := format('CG-%s-%s', v_year, lpad(v_next::text, 6, '0'));
  return new;
end;
$$;
create trigger set_claim_reference before insert on public.claims for each row execute function public.set_claim_reference();

-- BR4: status changes only inside transition_claim_status (Phase 4), which sets this flag.
-- The current_user check stops a signed-in user from setting the flag themselves.
create function public.guard_claim_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and not (coalesce(current_setting('app.transition_status', true), '') = 'on' and current_user not in ('authenticated', 'anon')) then
    raise exception 'Claim status can only be changed through the workflow' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger guard_claim_status before update on public.claims for each row execute function public.guard_claim_status();

create table public.claim_parties (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  party_type text not null check (party_type in ('claimant','legal_representative','other_driver','other_party')),
  full_name text check (char_length(full_name) <= 200),
  organisation_id uuid references public.organisations (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.claim_vehicles (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  party_id uuid references public.claim_parties (id) on delete set null,
  registration_number text check (char_length(registration_number) <= 20),
  make_model text check (char_length(make_model) <= 100),
  created_at timestamptz not null default now()
);

create table public.claim_assignments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  assignment_role text not null check (assignment_role in ('lawyer','raf_officer','investigator')),
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index claim_assignments_one_active_idx on public.claim_assignments (claim_id, profile_id, assignment_role) where ended_at is null;

-- Access helpers (Section 9 meanings). plpgsql so risk_alerts, created later, can be referenced.
create function public.is_claim_owner(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('claimant') and exists (
    select 1 from public.claims c join public.claimants cl on cl.id = c.claimant_id
    where c.id = p_claim and cl.profile_id = auth.uid()
  );
$$;

create function public.is_authorised_lawyer(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('lawyer') and exists (
    select 1 from public.claims c
    where c.id = p_claim
      and c.representing_organisation_id is not null
      and public.is_org_member(c.representing_organisation_id)
      and (
        exists (select 1 from public.client_relationships r where r.organisation_id = c.representing_organisation_id and r.claimant_id = c.claimant_id and r.assigned_lawyer_id = auth.uid())
        or exists (select 1 from public.claim_assignments a where a.claim_id = c.id and a.profile_id = auth.uid() and a.assignment_role = 'lawyer' and a.ended_at is null)
      )
  );
$$;

create function public.is_assigned_officer(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('raf_officer') and exists (
    select 1 from public.claim_assignments a
    where a.claim_id = p_claim and a.profile_id = auth.uid() and a.assignment_role = 'raf_officer' and a.ended_at is null
  );
$$;

create function public.can_access_claim(p_claim uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.is_claim_owner(p_claim) or public.is_authorised_lawyer(p_claim) or public.is_assigned_officer(p_claim) then
    return true;
  end if;
  if public.has_role('raf_officer') and public.has_permission_scope('claims.view', 'permitted') then
    return true;
  end if;
  if public.has_role('investigator') then
    return exists (select 1 from public.claim_assignments a where a.claim_id = p_claim and a.profile_id = auth.uid() and a.assignment_role = 'investigator' and a.ended_at is null)
        or exists (select 1 from public.risk_alerts r where r.claim_id = p_claim and r.assigned_to = auth.uid());
  end if;
  return false;
end;
$$;

-- SEC8: claim details are editable only before the claim is submitted.
create function public.can_edit_claim(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.claims c where c.id = p_claim and c.status in ('draft','documents_needed','validation','ready'))
    and (public.is_claim_owner(p_claim) or public.is_authorised_lawyer(p_claim)
         or (public.has_role('raf_officer') and public.has_permission('claims.create') and public.can_access_claim(p_claim)));
$$;

-- SEC11: claimant (own), authorised lawyer; officers and investigators only if permitted.
create function public.can_upload_document(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_claim_owner(p_claim) or public.is_authorised_lawyer(p_claim)
    or ((public.has_role('raf_officer') or public.has_role('investigator'))
        and public.has_permission('documents.upload') and public.can_access_claim(p_claim));
$$;

-- Used by the claimants and client_relationships policies, which would otherwise recurse into each other.
create function public.is_own_claimant(p_claimant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('claimant') and exists (select 1 from public.claimants where id = p_claimant and profile_id = auth.uid());
$$;

create function public.is_firm_client(p_claimant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('lawyer') and exists (select 1 from public.client_relationships r where r.claimant_id = p_claimant and public.is_org_member(r.organisation_id));
$$;

-- SEC21: claimant, authorised lawyer and assigned officer (Section 18 #17).
create function public.is_claim_participant(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_claim_owner(p_claim) or public.is_authorised_lawyer(p_claim) or public.is_assigned_officer(p_claim);
$$;

-- Reads the claim id from a storage path; a malformed path yields null, which no policy allows.
create function public.path_claim_id(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  if split_part(p_name, '/', 1) <> 'claims' then
    return null;
  end if;
  return split_part(p_name, '/', 2)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;
