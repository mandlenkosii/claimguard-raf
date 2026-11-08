-- T-DB-8: operations only allowed through functions.
begin;
select plan(11);
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$ insert into public.claims (claimant_id,created_by) values ('b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003') $$,'42501',null,'T-DB-8 claims');
select throws_ok($$ insert into public.claim_assignments (claim_id,profile_id,assignment_role,assigned_by) values ('c0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','lawyer','00000000-0000-4000-8000-000000000003') $$,'42501',null,'T-DB-8 claim_assignments');
select throws_ok($$ insert into public.user_roles (user_id,role_key,reason) values ('00000000-0000-4000-8000-000000000003','admin','x') $$,'42501',null,'T-DB-8 user_roles');
select throws_ok($$ insert into public.risk_reviews (alert_id,outcome,finding_summary,rationale,next_action,resulting_status,confirmed) values ('e0000000-0000-4000-8000-000000000001','no_issue_explained','a','b','c','RESOLVED',true) $$,'42501',null,'T-DB-8 risk_reviews');
select throws_ok($$ insert into public.information_requests (claim_id,title,description,recipient_type) values ('c0000000-0000-4000-8000-000000000001','t','d','claimant') $$,'42501',null,'T-DB-8 information_requests insert');
select throws_ok($$ update public.information_requests set status='closed' $$,'42501',null,'T-DB-8 information_requests.status');
select throws_ok($$ update public.risk_alerts set status='DISMISSED' $$,'42501',null,'T-DB-8 risk_alerts');
select throws_ok($$ insert into public.documents (claim_id,category_key,uploaded_by,processing_status) values ('c0000000-0000-4000-8000-000000000003','proof_of_earnings','00000000-0000-4000-8000-000000000003','processed') $$,'42501',null,'T-DB-8 a user cannot set a document as processed');
select throws_ok($$ insert into public.document_versions (document_id,version,storage_path,filename,mime_type,size_bytes,uploaded_by,confirmed) select id,9,'claims/c0000000-0000-4000-8000-000000000003/x/v9/a.pdf','a.pdf','application/pdf',10,'00000000-0000-4000-8000-000000000003',true from public.documents where claim_id='c0000000-0000-4000-8000-000000000003' limit 1 $$,'42501',null,'T-DB-8 a user cannot mark an upload confirmed (BR28)');
select throws_ok($$ insert into public.messages (thread_id,claim_id,body,created_at) values ('f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','backdated','2000-01-01') $$,'42501',null,'T-DB-8 a user cannot backdate a message (BR21)');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000006","role":"authenticated"}';
select throws_ok($$ insert into public.investigation_notes (alert_id,body,created_at) values ('e0000000-0000-4000-8000-000000000001','backdated','2000-01-01') $$,'42501',null,'T-DB-8 a user cannot backdate a note (BR19)');
reset role;
select * from finish();
rollback;
