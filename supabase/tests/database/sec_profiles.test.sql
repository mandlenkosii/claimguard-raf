-- T-SEC-25: profiles.
begin;
select plan(5);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
update public.profiles set first_name='Thandi' where id='00000000-0000-4000-8000-000000000001';
select is((select first_name from public.profiles where id='00000000-0000-4000-8000-000000000001'),'Thandi','T-SEC-25a user updates own first name');
select throws_ok($$ update public.profiles set account_status='active' where id='00000000-0000-4000-8000-000000000001' $$,'42501',null,'T-SEC-25b cannot update own account_status');
select throws_ok($$ update public.profiles set account_type='staff' where id='00000000-0000-4000-8000-000000000001' $$,'42501',null,'T-SEC-25b cannot update own account_type');
update public.profiles set first_name='Hacked' where id='00000000-0000-4000-8000-000000000002';
select is_empty($$ select 1 from public.profiles where id='00000000-0000-4000-8000-000000000002' $$,'T-SEC-25b cannot read another user''s profile');
reset role;
select isnt((select first_name from public.profiles where id='00000000-0000-4000-8000-000000000002'),'Hacked','T-SEC-25b cannot update another user''s profile');
select * from finish();
rollback;
