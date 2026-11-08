-- Migration 4: documents, extractions and private storage (Section 8.1).
create table public.document_categories (
  key text primary key,
  name text not null check (char_length(name) between 1 and 100),
  is_required boolean not null default false
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete restrict,
  category_key text not null references public.document_categories (key),
  current_version integer not null default 1 check (current_version >= 1),
  processing_status text not null default 'uploaded' check (processing_status in ('uploaded','processing','processed','failed','review_required')),
  processing_error text check (char_length(processing_error) <= 500),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete restrict,
  version integer not null check (version >= 1),
  storage_path text not null unique check (storage_path like 'claims/%'),
  filename text not null check (char_length(filename) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  confirmed boolean not null default false,
  malware_scan_status text not null default 'not_scanned' check (malware_scan_status in ('not_scanned','pending','clean','infected')),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  unique (document_id, version)
);

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions (id) on delete cascade,
  provider text not null default 'mock' check (provider in ('mock')),
  status text not null check (status in ('succeeded','failed')),
  extracted_text text,
  error text check (char_length(error) <= 500),
  created_at timestamptz not null default now()
);

create table public.extracted_fields (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references public.document_extractions (id) on delete cascade,
  field_key text not null check (field_key in ('full_name','id_number','date_of_birth','accident_date','admission_date','treating_facility','diagnosis','vehicle_registration','claim_reference')),
  value text check (char_length(value) <= 500),
  confidence numeric(4,3) check (confidence between 0 and 1),
  source_page integer check (source_page >= 1),
  bounding_box jsonb,
  validation_status text not null default 'suggested' check (validation_status in ('suggested','validated','corrected'))
);

create table public.extracted_field_corrections (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.extracted_fields (id) on delete restrict,
  original_value text,
  corrected_value text not null check (char_length(corrected_value) <= 500),
  reason text not null check (char_length(reason) between 1 and 500),
  corrected_by uuid not null references public.profiles (id) on delete restrict,
  corrected_at timestamptz not null default now()
);
create trigger append_only before update or delete on public.extracted_field_corrections for each row execute function public.append_only();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('claim-documents', 'claim-documents', false, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('message-attachments', 'message-attachments', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- BR29, SEC11, SEC12, SEC33. Storage may fill metadata after the insert, so an absent value is
-- allowed here; the bucket limits above still apply to every real upload.
create policy claim_documents_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'claim-documents'
  and public.is_active_user()
  and public.can_upload_document(public.path_claim_id(name))
  and coalesce(metadata ->> 'mimetype', 'application/pdf') in ('application/pdf','image/jpeg','image/png')
  and coalesce((metadata ->> 'size')::bigint, 0) <= 10485760
);

create policy claim_documents_select on storage.objects for select to authenticated
using (bucket_id = 'claim-documents' and public.is_active_user() and public.can_access_claim(public.path_claim_id(name)));

create policy message_attachments_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'message-attachments'
  and public.is_active_user()
  and public.is_claim_participant(public.path_claim_id(name))
  and coalesce(metadata ->> 'mimetype', 'application/pdf') in ('application/pdf','image/jpeg','image/png')
  and coalesce((metadata ->> 'size')::bigint, 0) <= 10485760
);

create policy message_attachments_select on storage.objects for select to authenticated
using (bucket_id = 'message-attachments' and public.is_active_user() and public.is_claim_participant(public.path_claim_id(name)));
