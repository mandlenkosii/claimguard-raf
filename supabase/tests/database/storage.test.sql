-- T-DB-7, T-BR29-2: private buckets and upload limits.
begin;
select plan(7);
select is((select public from storage.buckets where id='claim-documents'),false,'T-DB-7 claim-documents exists and is private');
select is((select public from storage.buckets where id='message-attachments'),false,'T-DB-7 message-attachments exists and is private');
select is((select file_size_limit from storage.buckets where id='claim-documents'),10485760::bigint,'T-BR29-2 bucket size limit is 10 MB');
select throws_ok($$ update public.document_versions set size_bytes=10485761 where storage_path like 'claims/c0000000-0000-4000-8000-000000000001/%' $$,'23514',null,'T-BR29-2 column check rejects over 10 MB');
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ insert into storage.objects (bucket_id,name,owner_id,metadata) values ('claim-documents','claims/c0000000-0000-4000-8000-000000000002/x/v1/a.exe','00000000-0000-4000-8000-000000000001','{"mimetype":"application/x-msdownload","size":10}') $$,'42501',null,'T-BR29-2 policy rejects a bad MIME type');
select throws_ok($$ insert into storage.objects (bucket_id,name,owner_id,metadata) values ('claim-documents','claims/c0000000-0000-4000-8000-000000000002/x/v1/b.pdf','00000000-0000-4000-8000-000000000001','{"mimetype":"application/pdf","size":10485761}') $$,'42501',null,'T-BR29-2 policy rejects over 10 MB');
select lives_ok($$ insert into storage.objects (bucket_id,name,owner_id,metadata) values ('claim-documents','claims/c0000000-0000-4000-8000-000000000002/x/v1/c.pdf','00000000-0000-4000-8000-000000000001','{"mimetype":"application/pdf","size":100}') $$,'T-BR29-2 a valid PDF is accepted');
reset role;
select * from finish();
rollback;
