-- T-DB-2: handle_new_user.
begin;
select plan(8);
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t2a@example.com','{"account_type":"claimant","first_name":"Test","surname":"Claimant","popia_consent":true}','{}'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t2b@example.com','{"account_type":"legal_practitioner","first_name":"Test","surname":"Lawyer","popia_consent":true,"firm_name":"Test Firm T2","practice_number":"P-1"}','{}'),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t2c@example.com','{"account_type":"claimant","first_name":"Test","surname":"Admin","popia_consent":true,"role":"admin","roles":["admin"]}','{}'),
 ('10000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t2d@example.com','{"account_type":"staff","first_name":"Test","surname":"Staff","popia_consent":true}','{}');
select is((select account_type from public.profiles where id='10000000-0000-4000-8000-000000000001'),'claimant','T-DB-2 claimant profile created');
select results_eq($$ select role_key from public.user_roles where user_id='10000000-0000-4000-8000-000000000001' $$, $$ values ('claimant'::text) $$, 'T-DB-2 claimant role granted');
select is((select verification_status from public.legal_practitioners where profile_id='10000000-0000-4000-8000-000000000002'),'pending','T-DB-2 pending practitioner row created');
select is_empty($$ select 1 from public.user_roles where user_id='10000000-0000-4000-8000-000000000002' $$, 'T-DB-2 practitioner gets no role');
select is((select account_type from public.profiles where id='10000000-0000-4000-8000-000000000002'),'legal_practitioner','T-DB-2 practitioner profile created');
select is_empty($$ select 1 from public.user_roles where user_id='10000000-0000-4000-8000-000000000003' and role_key <> 'claimant' $$, 'T-DB-2 metadata asking for admin grants nothing');
select is((select account_type from public.profiles where id='10000000-0000-4000-8000-000000000004'),'claimant','T-DB-2 sign-up metadata cannot create a staff account');
select is_empty($$ select 1 from public.user_roles where user_id='10000000-0000-4000-8000-000000000004' and role_key <> 'claimant' $$, 'T-DB-2 staff metadata grants no staff role');
select * from finish();
rollback;
