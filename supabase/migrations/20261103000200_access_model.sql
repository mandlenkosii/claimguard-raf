-- Migration 2: organisations, profiles, roles and permissions (Section 8.1).
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 200),
  type text not null check (type in ('law_firm','raf','other')),
  registration_number text check (char_length(registration_number) <= 50),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.organisations for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  surname text not null check (char_length(surname) between 1 and 100),
  email text not null unique,
  mobile text check (char_length(mobile) <= 20),
  preferred_language text check (char_length(preferred_language) <= 30),
  preferred_contact_method text check (preferred_contact_method in ('email','phone')),
  account_type text not null check (account_type in ('claimant','legal_practitioner','staff')),
  account_status text not null default 'active' check (account_status in ('active','invited','suspended','disabled')),
  popia_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_popia_consent_required check (account_type = 'staff' or popia_consent_at is not null)
);
create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table public.roles (
  key text primary key check (key in ('claimant','lawyer','raf_officer','investigator','manager','admin')),
  name text not null check (char_length(name) between 1 and 50)
);

create table public.permissions (
  key text primary key check (key in ('claims.view','claims.create','documents.upload','readiness.view','risk.view_evidence','requests.create','investigations.review','users.manage','claims.assign','audit.view','extractions.correct','reports.export','settings.manage')),
  description text not null check (char_length(description) between 1 and 200)
);

create table public.role_permissions (
  role_key text not null references public.roles (key) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  scope text not null check (scope in ('own','authorised','assigned','permitted','limited','restricted','summary','aggregated','configuration','admin','investigation','yes','no')),
  primary key (role_key, permission_key)
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_key text not null references public.roles (key) on delete restrict,
  assigned_by uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (user_id, role_key),
  constraint user_roles_no_self_assignment check (role_key = 'claimant' or assigned_by is null or assigned_by <> user_id)
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organisation_id, profile_id)
);

create table public.legal_practitioners (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  practice_number text not null check (char_length(practice_number) between 1 and 50),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);

-- Sign-up metadata is user-controlled: it can only choose claimant or legal practitioner.
-- Staff accounts need app metadata, which only the server can set (OP42, BR23).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_type text;
  v_status text := 'active';
  v_consent timestamptz;
  v_org uuid;
begin
  if app ->> 'account_type' = 'staff' then
    v_type := 'staff';
    v_status := coalesce(app ->> 'account_status', 'active');
  elsif meta ->> 'account_type' = 'legal_practitioner' then
    v_type := 'legal_practitioner';
  else
    v_type := 'claimant';
  end if;

  if coalesce((meta ->> 'popia_consent')::boolean, false) then
    v_consent := now();
  end if;

  insert into public.profiles (id, first_name, surname, email, mobile, account_type, account_status, popia_consent_at)
  values (new.id, meta ->> 'first_name', meta ->> 'surname', new.email, meta ->> 'mobile', v_type, v_status, v_consent);

  if v_type = 'claimant' then
    insert into public.user_roles (user_id, role_key, reason) values (new.id, 'claimant', 'Self-registration');
  elsif v_type = 'legal_practitioner' then
    -- Pending until an administrator assigns the lawyer role (Section 18 #8).
    select id into v_org from public.organisations where lower(name) = lower(meta ->> 'firm_name') limit 1;
    if v_org is null then
      insert into public.organisations (name, type, status) values (meta ->> 'firm_name', 'law_firm', 'inactive') returning id into v_org;
    end if;
    insert into public.legal_practitioners (profile_id, organisation_id, practice_number)
    values (new.id, v_org, meta ->> 'practice_number');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active');
$$;

create function public.has_role(p_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role_key = p_role);
$$;

-- A permission counts as held for any scope except 'no'.
create function public.has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.user_id = auth.uid() and rp.permission_key = p_permission and rp.scope <> 'no'
  );
$$;

create function public.has_permission_scope(p_permission text, p_scope text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.user_id = auth.uid() and rp.permission_key = p_permission and rp.scope = p_scope
  );
$$;

create function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organisation_members where organisation_id = p_org and profile_id = auth.uid());
$$;
