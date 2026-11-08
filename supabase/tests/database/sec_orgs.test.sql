-- T-SEC-27: organisations.
begin;
select plan(4);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select lives_ok($$ insert into public.organisations (name,type) values ('T27 Firm','law_firm') $$,'T-SEC-27a admin creates an organisation');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$ insert into public.organisations (name,type) values ('T27 Lawyer Firm','law_firm') $$,'42501',null,'T-SEC-27b lawyer cannot');
select isnt_empty($$ select 1 from public.organisations where id='a0000000-0000-4000-8000-000000000001' $$,'T-SEC-27a member reads own organisation');
select is_empty($$ select 1 from public.organisations where id='a0000000-0000-4000-8000-000000000002' $$,'T-SEC-27b member cannot read another organisation');
reset role;
select * from finish();
rollback;
