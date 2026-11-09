-- Phase 10: administration (OP41–OP47, OP49).

-- Audit rows written by triggers now carry the reason given to the function that caused them (BR26).
create or replace function public.write_audit(p_action text, p_resource_type text, p_resource_id text, p_claim uuid, p_summary jsonb, p_reason text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, claim_id, change_summary, reason)
  values (auth.uid(), public.current_actor_role(), p_action, p_resource_type, p_resource_id, p_claim, p_summary, coalesce(p_reason, nullif(current_setting('app.change_reason', true), '')));
$$;

create function public.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_user() or not public.has_role('admin') then
    raise exception 'You do not have access to this page' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.require_admin() from public, anon, authenticated;

-- OP41.
create function public.admin_list_users(p_role text default null, p_organisation uuid default null, p_status text default null, p_search text default null, p_page integer default 1, p_page_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_search text := nullif(btrim(p_search), '');
begin
  perform public.require_admin();
  with users as (
    select p.id, p.first_name || ' ' || p.surname as name, p.email, p.account_status,
      coalesce((select array_agg(ur.role_key order by ur.role_key) from public.user_roles ur where ur.user_id = p.id), '{}') as roles,
      (select o.name from public.organisation_members m join public.organisations o on o.id = m.organisation_id where m.profile_id = p.id order by o.name limit 1) as organisation,
      a.last_sign_in_at,
      exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified') as mfa
    from public.profiles p
    left join auth.users a on a.id = p.id
    where (p_role is null or exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role_key = p_role))
      and (p_organisation is null or exists (select 1 from public.organisation_members m where m.profile_id = p.id and m.organisation_id = p_organisation))
      and (v_search is null or p.email ilike '%' || v_search || '%' or (p.first_name || ' ' || p.surname) ilike '%' || v_search || '%')
  ), filtered as (
    select * from users where p_status is null or account_status = p_status
  ), page as (
    select * from filtered order by name limit p_page_size offset greatest(p_page - 1, 0) * p_page_size
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page) order by name) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'counts', jsonb_build_object(
      'active', (select count(*) from users where account_status = 'active'),
      'invited', (select count(*) from users where account_status = 'invited'),
      'suspended', (select count(*) from users where account_status = 'suspended'),
      'disabled', (select count(*) from users where account_status = 'disabled')
    )
  ) into v_result;
  return v_result;
end;
$$;

-- OP43 (SEC26): always with a reason, and never on yourself (BR23).
create function public.admin_set_user_roles(p_user uuid, p_roles text[], p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := nullif(btrim(p_reason), '');
  v_removed text;
begin
  perform public.require_admin();
  if p_user = auth.uid() then
    raise exception 'Admins cannot assign roles to themselves.' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'Please give a reason.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'User not found' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_roles) r (key) where not exists (select 1 from public.roles x where x.key = r.key)) then
    raise exception 'Unknown role' using errcode = '22023';
  end if;

  perform set_config('app.change_reason', v_reason, true);

  for v_removed in select role_key from public.user_roles where user_id = p_user and not (role_key = any (p_roles)) loop
    delete from public.user_roles where user_id = p_user and role_key = v_removed;
    perform public.write_audit('ROLE_CHANGED', 'user_role', p_user::text, null, jsonb_build_object('removed', v_removed), v_reason);
  end loop;

  insert into public.user_roles (user_id, role_key, assigned_by, reason)
  select p_user, r.key, auth.uid(), v_reason from unnest(p_roles) r (key)
  on conflict (user_id, role_key) do nothing;

  -- A self-registered practitioner stays pending until given the lawyer role (Section 18 #8).
  if 'lawyer' = any (p_roles) then
    update public.legal_practitioners set verification_status = 'verified' where profile_id = p_user;
    insert into public.organisation_members (organisation_id, profile_id)
    select organisation_id, profile_id from public.legal_practitioners where profile_id = p_user
    on conflict do nothing;
  end if;
end;
$$;

-- OP44: takes effect at once, because every policy checks is_active_user (BR24).
create function public.admin_set_account_status(p_user uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := nullif(btrim(p_reason), '');
begin
  perform public.require_admin();
  if p_user = auth.uid() then
    raise exception 'Admins cannot change their own account status.' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'Please give a reason.' using errcode = '22023';
  end if;
  if p_status not in ('active', 'suspended', 'disabled') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;
  perform set_config('app.change_reason', v_reason, true);
  update public.profiles set account_status = p_status where id = p_user;
  if not found then
    raise exception 'User not found' using errcode = '22023';
  end if;
end;
$$;

-- OP46, OP47 (SEC24): every row for administrators; one claim for officers with audit.view.
create function public.get_audit_log(p_claim uuid default null, p_actor_role text default null, p_category text default null, p_outcome text default null, p_from date default null, p_to date default null, p_page integer default 1, p_page_size integer default 25) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not public.is_active_user() or not (public.has_role('admin') or (p_claim is not null and public.has_role('raf_officer') and public.has_permission('audit.view') and public.can_access_claim(p_claim))) then
    raise exception 'You do not have access to this page' using errcode = '42501';
  end if;

  with filtered as (
    select l.id, l.created_at, a.first_name || ' ' || a.surname as actor_name, l.actor_role, l.action, l.resource_type, l.resource_id, l.outcome, l.change_summary, l.reason, l.session_ref
    from public.audit_logs l left join public.profiles a on a.id = l.actor_id
    where (p_claim is null or l.claim_id = p_claim)
      and (p_actor_role is null or l.actor_role = p_actor_role)
      and (p_outcome is null or l.outcome = p_outcome)
      and (p_from is null or (l.created_at at time zone 'Africa/Johannesburg')::date >= p_from)
      and (p_to is null or (l.created_at at time zone 'Africa/Johannesburg')::date <= p_to)
      and (p_category is null or case p_category
        when 'access' then l.resource_type in ('user_role', 'profile', 'user')
        when 'configuration' then l.resource_type in ('organisation', 'validation_rule', 'readiness_settings')
        when 'claim' then l.resource_type in ('claim', 'claim_assignment', 'information_request', 'request_response', 'message')
        when 'document' then l.resource_type like 'document%' or l.resource_type like 'extracted%'
        when 'risk' then l.resource_type like 'risk%'
        else false
      end)
  ), page as (
    select * from filtered order by id desc limit p_page_size offset greatest(p_page - 1, 0) * p_page_size
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page) order by id desc) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'counts', jsonb_build_object('total', (select count(*) from filtered), 'denied', (select count(*) from filtered where outcome = 'denied'))
  ) into v_result;
  return v_result;
end;
$$;

-- OP49: the database check on S43.
create function public.health_check() returns boolean
language sql stable set search_path = '' as $$
  select true;
$$;

revoke all on function public.admin_list_users(text, uuid, text, text, integer, integer), public.admin_set_user_roles(uuid, text[], text), public.admin_set_account_status(uuid, text, text),
  public.get_audit_log(uuid, text, text, text, date, date, integer, integer), public.health_check() from public, anon;
grant execute on function public.admin_list_users(text, uuid, text, text, integer, integer), public.admin_set_user_roles(uuid, text[], text), public.admin_set_account_status(uuid, text, text),
  public.get_audit_log(uuid, text, text, text, date, date, integer, integer), public.health_check() to authenticated;
