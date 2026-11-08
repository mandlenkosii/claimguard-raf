-- T-BR23-1, T-BR23-2: role assignment.
begin;
select plan(2);
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ insert into public.user_roles (user_id,role_key,reason) values ('00000000-0000-4000-8000-000000000001','admin','self') $$,'42501',null,'T-BR23-1 a non-admin cannot insert into user_roles');
reset role;
select throws_ok($$ insert into public.user_roles (user_id,role_key,assigned_by,reason) values ('00000000-0000-4000-8000-000000000001','manager','00000000-0000-4000-8000-000000000001','self') $$,'23514',null,'T-BR23-2 assigned_by cannot equal user_id for a non-claimant role');
select * from finish();
rollback;
