-- Operations OP20–OP22: confirming uploads and document processing.
create extension if not exists pg_net with schema extensions;

-- Calls process-document on the server (OP21). The address and key live in the Vault, set by
-- scripts/set-vault-secrets.mjs, so they are never written in a migration.
create function public.request_document_processing(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'process_document_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'process_document_key';
  if v_url is null or v_key is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('version_id', p_version),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 30000
  );
end;
$$;

-- OP20 (BR28, BR29): only the uploader, only once the file is really in storage.
create function public.confirm_document_upload(p_version uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_version public.document_versions;
  v_recent integer;
begin
  select * into v_version from public.document_versions where id = p_version;
  if not found or not public.is_active_user() or v_version.uploaded_by is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'code', 'error');
  end if;
  if v_version.confirmed then
    return jsonb_build_object('ok', true);
  end if;

  -- Section 18 #21: at most 10 document uploads per minute per user.
  select count(*) into v_recent from public.document_versions
  where uploaded_by = auth.uid() and confirmed and uploaded_at > now() - interval '1 minute';
  if v_recent >= 10 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  if not exists (select 1 from storage.objects where bucket_id = 'claim-documents' and name = v_version.storage_path) then
    return jsonb_build_object('ok', false, 'code', 'error');
  end if;

  update public.document_versions set confirmed = true where id = p_version;
  perform public.request_document_processing(p_version);
  return jsonb_build_object('ok', true);
end;
$$;

create function public.latest_confirmed_version(p_document uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.document_versions where document_id = p_document and confirmed order by version desc limit 1;
$$;

-- OP22.
create function public.retry_document_processing(p_document uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_document public.documents;
begin
  select * into v_document from public.documents where id = p_document;
  if not found or not public.is_active_user() or not public.can_upload_document(v_document.claim_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_document.processing_status <> 'failed' then
    raise exception 'Only a failed document can be retried' using errcode = '22023';
  end if;
  update public.documents set processing_status = 'processing', processing_error = null where id = p_document;
  perform public.request_document_processing(public.latest_confirmed_version(p_document));
end;
$$;

create function public.mark_document_manual_review(p_document uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_document public.documents;
begin
  select * into v_document from public.documents where id = p_document;
  if not found or not public.is_active_user() or not public.can_upload_document(v_document.claim_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_document.processing_status <> 'failed' then
    raise exception 'Only a failed document can be sent for manual review' using errcode = '22023';
  end if;
  update public.documents set processing_status = 'review_required' where id = p_document;
end;
$$;

-- S15. Confirmed documents only (BR28), with the uploader's name, which profiles RLS would otherwise hide.
create function public.get_claim_documents(p_claim uuid)
returns table (document_id uuid, version_id uuid, category_key text, category_name text, filename text, uploader_name text, uploaded_at timestamptz, processing_status text, processing_error text, storage_path text)
language sql stable security definer set search_path = '' as $$
  select d.id, v.id, d.category_key, c.name, v.filename, p.first_name || ' ' || p.surname, v.uploaded_at, d.processing_status, d.processing_error, v.storage_path
  from public.documents d
  join public.document_categories c on c.key = d.category_key
  join lateral (select * from public.document_versions x where x.document_id = d.id and x.confirmed order by x.version desc limit 1) v on true
  join public.profiles p on p.id = v.uploaded_by
  where d.claim_id = p_claim and d.deleted_at is null and public.is_active_user() and public.can_access_claim(p_claim)
  order by v.uploaded_at desc;
$$;

grant execute on function public.confirm_document_upload(uuid), public.retry_document_processing(uuid), public.mark_document_manual_review(uuid), public.get_claim_documents(uuid) to authenticated;
