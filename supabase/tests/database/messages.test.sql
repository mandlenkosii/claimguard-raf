-- T-BR21-1, T-SEC-21, T-SEC-33: messaging.
begin;
select plan(8);
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ insert into public.messages (thread_id,claim_id,author_id,body) values ('f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005','forged') $$,'42501',null,'T-BR21-1 a message cannot be written as someone else');
select lives_ok($$ insert into public.messages (id,thread_id,claim_id,body) values ('12000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','hello') $$,'T-SEC-21a claimant posts on own claim');
select isnt_empty($$ select 1 from public.messages where thread_id='f0000000-0000-4000-8000-000000000001' $$,'T-SEC-21a claimant reads own claim messages');
select lives_ok($$ insert into public.message_attachments (message_id,storage_path,filename,mime_type,size_bytes) values ('12000000-0000-4000-8000-000000000001','claims/c0000000-0000-4000-8000-000000000003/m/a.pdf','a.pdf','application/pdf',10) $$,'T-SEC-33a participant inserts an attachment');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is_empty($$ select 1 from public.messages where thread_id='f0000000-0000-4000-8000-000000000001' $$,'T-SEC-21b second claimant cannot read');
select throws_ok($$ insert into public.messages (thread_id,claim_id,body) values ('f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','intrude') $$,'42501',null,'T-SEC-21b second claimant cannot post');
select throws_ok($$ insert into public.message_attachments (message_id,storage_path,filename,mime_type,size_bytes) values ('12000000-0000-4000-8000-000000000001','claims/c0000000-0000-4000-8000-000000000003/m/b.pdf','b.pdf','application/pdf',10) $$,'42501',null,'T-SEC-33b non-participant cannot attach');
select is_empty($$ select 1 from public.message_attachments $$,'T-SEC-33b non-participant cannot read attachments');
reset role;
select * from finish();
rollback;
