-- Phase 8: information requests and messaging (OP32–OP37).

create function public.profile_role(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select ur.role_key from public.user_roles ur where ur.user_id = p_user
  order by array_position(array['claimant', 'lawyer', 'raf_officer', 'investigator', 'manager', 'admin'], ur.role_key) limit 1;
$$;
revoke all on function public.profile_role(uuid) from public, anon, authenticated;

-- OP32 (SEC18).
create function public.create_information_request(p_claim uuid, p_title text, p_description text, p_recipient_type text, p_linked_issue uuid, p_requests_documents boolean, p_due_date date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_request uuid;
begin
  if not public.is_active_user() or not public.has_permission('requests.create') or not public.can_access_claim(p_claim) then
    raise exception 'You may not create a request on this claim' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or nullif(btrim(p_description), '') is null or p_recipient_type not in ('claimant', 'legal_representative') then
    raise exception 'This field is required.' using errcode = '22023';
  end if;
  if p_linked_issue is not null and not exists (select 1 from public.claim_issues where id = p_linked_issue and claim_id = p_claim) then
    raise exception 'The linked issue is not on this claim' using errcode = '22023';
  end if;

  insert into public.information_requests (claim_id, title, description, recipient_type, linked_issue_id, requests_documents, due_date, created_by)
  values (p_claim, btrim(p_title), btrim(p_description), p_recipient_type, p_linked_issue, coalesce(p_requests_documents, false), p_due_date, auth.uid())
  returning id into v_request;
  return v_request;
end;
$$;

create function public.may_respond_to_request(p_request public.information_requests) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_request.created_by is distinct from auth.uid()
    and (public.is_authorised_lawyer(p_request.claim_id) or (p_request.recipient_type = 'claimant' and public.is_claim_owner(p_request.claim_id)));
$$;
revoke all on function public.may_respond_to_request(public.information_requests) from public, anon, authenticated;

-- OP33 (SEC19): a response never closes a request (BR20).
create function public.respond_to_request(p_request uuid, p_body text, p_document_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.information_requests;
  v_response uuid;
  v_documents uuid[] := coalesce(p_document_ids, '{}');
begin
  select * into v_request from public.information_requests where id = p_request for update;
  if not found or not public.is_active_user() or not public.may_respond_to_request(v_request) then
    raise exception 'You may not respond to this request' using errcode = '42501';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request is not waiting for a response' using errcode = '22023';
  end if;
  if nullif(btrim(p_body), '') is null then
    raise exception 'This field is required.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_documents) d (id) where not exists (select 1 from public.documents x where x.id = d.id and x.claim_id = v_request.claim_id)) then
    raise exception 'A document is not on this claim' using errcode = '22023';
  end if;

  insert into public.request_responses (request_id, author_id, body, document_ids) values (p_request, auth.uid(), btrim(p_body), v_documents) returning id into v_response;
  update public.information_requests set status = 'responded' where id = p_request;
  return v_response;
end;
$$;

-- OP34 (SEC20).
create function public.update_request_status(p_request uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.information_requests;
begin
  select * into v_request from public.information_requests where id = p_request for update;
  if not found or not public.is_active_user() or not (v_request.created_by = auth.uid() or public.is_assigned_officer(v_request.claim_id)) then
    raise exception 'You may not change this request' using errcode = '42501';
  end if;
  if not (
    (v_request.status = 'responded' and p_status in ('under_review', 'closed', 'pending'))
    or (v_request.status = 'under_review' and p_status in ('closed', 'pending'))
  ) then
    raise exception 'That status change is not allowed' using errcode = '22023';
  end if;

  update public.information_requests set
    status = p_status,
    closed_by = case when p_status = 'closed' then auth.uid() end,
    closed_at = case when p_status = 'closed' then now() end
  where id = p_request;
end;
$$;

-- S22.
create function public.get_request_detail(p_request uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_request public.information_requests;
begin
  select * into v_request from public.information_requests where id = p_request;
  if not found or not public.is_active_user() or not public.can_access_claim(v_request.claim_id) then
    raise exception 'You do not have access to this request' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'request', (
      select jsonb_build_object(
        'id', v_request.id, 'claim_id', v_request.claim_id, 'claim_reference', c.reference, 'title', v_request.title, 'description', v_request.description, 'recipient_type', v_request.recipient_type,
        'requests_documents', v_request.requests_documents, 'due_date', v_request.due_date, 'status', v_request.status, 'created_at', v_request.created_at, 'closed_at', v_request.closed_at,
        'creator_name', p.first_name || ' ' || p.surname,
        'linked_issue', (select jsonb_build_object('title', i.title, 'rule_id', i.rule_id) from public.claim_issues i where i.id = v_request.linked_issue_id)
      )
      from public.claims c, public.profiles p where c.id = v_request.claim_id and p.id = v_request.created_by
    ),
    'responses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'body', r.body, 'author_name', a.first_name || ' ' || a.surname, 'author_role', public.profile_role(r.author_id), 'created_at', r.created_at,
        'documents', coalesce((
          select jsonb_agg(jsonb_build_object('id', d.id, 'filename', v.filename))
          from public.documents d
          join lateral (select y.filename from public.document_versions y where y.document_id = d.id order by y.version desc limit 1) v on true
          where d.id = any (r.document_ids)
        ), '[]'::jsonb)
      ) order by r.created_at)
      from public.request_responses r join public.profiles a on a.id = r.author_id
      where r.request_id = p_request
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('from_status', h.from_status, 'to_status', h.to_status, 'actor_name', a.first_name || ' ' || a.surname, 'created_at', h.created_at) order by h.created_at)
      from public.request_status_history h join public.profiles a on a.id = h.actor_id
      where h.request_id = p_request
    ), '[]'::jsonb),
    'can_respond', v_request.status = 'pending' and public.may_respond_to_request(v_request),
    'can_review', v_request.status <> 'closed' and (v_request.created_by = auth.uid() or public.is_assigned_officer(v_request.claim_id))
  );
end;
$$;

-- OP37 (SEC21): someone who is not a participant gets nothing.
create function public.get_claim_messaging(p_claim uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_user() or not public.is_claim_participant(p_claim) then
    return jsonb_build_object('is_participant', false, 'threads', '[]'::jsonb, 'participants', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'is_participant', true,
    'threads', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'created_at', t.created_at, 'last_message_at', m.created_at, 'last_message_body', m.body) order by coalesce(m.created_at, t.created_at) desc)
      from public.message_threads t
      left join lateral (select x.body, x.created_at from public.messages x where x.thread_id = t.id order by x.created_at desc limit 1) m on true
      where t.claim_id = p_claim
    ), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.first_name || ' ' || p.surname, 'role', public.profile_role(p.id)) order by p.first_name)
      from public.profiles p where p.id in (select public.claim_participant_ids(p_claim))
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_thread_messages(p_thread uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'body', m.body, 'author_id', m.author_id, 'author_name', a.first_name || ' ' || a.surname, 'author_role', public.profile_role(m.author_id), 'created_at', m.created_at
  ) order by m.created_at), '[]'::jsonb)
  from public.messages m join public.profiles a on a.id = m.author_id
  where m.thread_id = p_thread and public.is_active_user() and public.is_claim_participant(m.claim_id);
$$;

revoke all on function public.create_information_request(uuid, text, text, text, uuid, boolean, date), public.respond_to_request(uuid, text, uuid[]), public.update_request_status(uuid, text),
  public.get_request_detail(uuid), public.get_claim_messaging(uuid), public.get_thread_messages(uuid) from public, anon;
grant execute on function public.create_information_request(uuid, text, text, text, uuid, boolean, date), public.respond_to_request(uuid, text, uuid[]), public.update_request_status(uuid, text),
  public.get_request_detail(uuid), public.get_claim_messaging(uuid), public.get_thread_messages(uuid) to authenticated;
