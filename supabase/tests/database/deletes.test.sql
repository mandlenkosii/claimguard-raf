-- T-DB-6, T-DB-11: delete behaviour.
begin;
select plan(9);
select throws_like($$ delete from public.claimants where id='b0000000-0000-4000-8000-000000000001' $$,'%foreign key constraint%','T-DB-6 a claimant with a claim cannot be deleted');
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data) values
 ('10000000-0000-4000-8000-000000000011','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t6a@example.com','{"account_type":"claimant","first_name":"A","surname":"B","popia_consent":true}','{}'),
 ('10000000-0000-4000-8000-000000000012','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t6b@example.com','{"account_type":"claimant","first_name":"C","surname":"D","popia_consent":true}','{}');
insert into public.organisation_members (organisation_id, profile_id) values ('a0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000011');
insert into public.notifications (recipient_id,type,title,summary,link) values ('10000000-0000-4000-8000-000000000011','message','t','s','/');
delete from public.profiles where id='10000000-0000-4000-8000-000000000011';
select is_empty($$ select 1 from public.user_roles where user_id='10000000-0000-4000-8000-000000000011' $$,'T-DB-6 user_roles cascade');
select is_empty($$ select 1 from public.organisation_members where profile_id='10000000-0000-4000-8000-000000000011' $$,'T-DB-6 memberships cascade');
select is_empty($$ select 1 from public.notifications where recipient_id='10000000-0000-4000-8000-000000000011' $$,'T-DB-6 notifications cascade');
insert into public.claim_timeline_events (claim_id,event_type,actor_id,summary) values ('c0000000-0000-4000-8000-000000000001','claim_updated','10000000-0000-4000-8000-000000000012','t11');
select throws_like($$ delete from public.profiles where id='10000000-0000-4000-8000-000000000012' $$,'%foreign key constraint%','T-DB-11 a profile with history is refused by the foreign key');
select throws_like($$ delete from auth.users where id='10000000-0000-4000-8000-000000000012' $$,'%foreign key constraint%','T-DB-11 its auth user is refused by the foreign key');
select is((select actor_id from public.claim_timeline_events where summary='t11'),'10000000-0000-4000-8000-000000000012'::uuid,'T-DB-11 the history row is unchanged');
select lives_ok($$ update public.profiles set account_status='disabled' where id='10000000-0000-4000-8000-000000000012' $$,'T-DB-11 the user can be disabled instead');
select is((select account_status from public.profiles where id='10000000-0000-4000-8000-000000000012'),'disabled','T-DB-11 the account is disabled');
select * from finish();
rollback;
