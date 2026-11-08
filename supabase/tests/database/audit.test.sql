-- T-BR26-1, 2, 3: audit logs.
begin;
select plan(9);
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
insert into public.claims (id,claimant_id,created_by) values ('13000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
insert into public.documents (id,claim_id,category_key,uploaded_by) values ('13000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','proof_of_earnings','00000000-0000-4000-8000-000000000003');
insert into public.user_roles (user_id,role_key,assigned_by,reason) values ('00000000-0000-4000-8000-000000000001','manager','00000000-0000-4000-8000-000000000008','test');
select isnt_empty($$ select 1 from public.audit_logs where action='CLAIM_CREATED' and resource_id='13000000-0000-4000-8000-000000000001' and actor_id='00000000-0000-4000-8000-000000000008' and created_at is not null $$,'T-BR26-1 claim insert audited');
select isnt_empty($$ select 1 from public.audit_logs where action='DOCUMENT_UPLOADED' and resource_id='13000000-0000-4000-8000-000000000002' and actor_id='00000000-0000-4000-8000-000000000008' $$,'T-BR26-1 document insert audited');
select isnt_empty($$ select 1 from public.audit_logs where action='ROLE_CHANGED' and resource_type='user_role' and actor_id='00000000-0000-4000-8000-000000000008' $$,'T-BR26-1 role change audited');
select throws_ok($$ update public.audit_logs set action='X' $$,'P0001',null,'T-BR26-2 update fails for the owner role');
select throws_ok($$ delete from public.audit_logs $$,'P0001',null,'T-BR26-2 delete fails for the owner role');
set local role authenticated;
select throws_ok($$ update public.audit_logs set action='X' $$,'42501',null,'T-BR26-2 update fails for the admin user');
select throws_ok($$ delete from public.audit_logs $$,'42501',null,'T-BR26-2 delete fails for the admin user');
reset role;
insert into public.document_extractions (id,document_version_id,status,extracted_text) select '13000000-0000-4000-8000-000000000003', id, 'succeeded', 'SECRETTEXTVALUE' from public.document_versions limit 1;
update public.claims set accident_description='SECRETDESCRIPTION' where id='13000000-0000-4000-8000-000000000001';
select is_empty($$ select 1 from public.audit_logs a where a::text like '%SECRETTEXTVALUE%' $$,'T-BR26-3 no audit row contains extracted_text');
select is_empty($$ select 1 from public.audit_logs a where a::text like '%SECRETDESCRIPTION%' or a::text ilike '%encrypted_password%' $$,'T-BR26-3 no audit row contains free text or passwords');
select * from finish();
rollback;

