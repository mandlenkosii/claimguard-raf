-- OP6: the signed-in user's own account state, roles and capabilities.
-- It works for inactive accounts too, so the app can show S08; it only ever returns the caller's own row.
create function public.my_capabilities() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', p.id,
    'email', p.email,
    'first_name', p.first_name,
    'surname', p.surname,
    'account_type', p.account_type,
    'account_status', p.account_status,
    'practitioner_status', (select lp.verification_status from public.legal_practitioners lp where lp.profile_id = p.id),
    'roles', coalesce((
      select jsonb_agg(ur.role_key order by array_position(array['claimant','lawyer','raf_officer','investigator','manager','admin'], ur.role_key))
      from public.user_roles ur where ur.user_id = p.id
    ), '[]'::jsonb),
    'capabilities', coalesce((
      select jsonb_agg(distinct rp.permission_key)
      from public.user_roles ur join public.role_permissions rp on rp.role_key = ur.role_key
      where ur.user_id = p.id and rp.scope <> 'no'
    ), '[]'::jsonb)
  )
  from public.profiles p where p.id = auth.uid();
$$;

revoke all on function public.my_capabilities() from public, anon;
grant execute on function public.my_capabilities() to authenticated, service_role;
