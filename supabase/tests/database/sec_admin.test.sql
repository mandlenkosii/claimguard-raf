-- T-SEC-26: role assignment.
begin;
select plan(6);
set local role authenticated;

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select lives_ok($$ select public.admin_set_user_roles('00000000-0000-4000-8000-000000000007', array['manager','raf_officer'], 'Test') $$,'T-SEC-26a admin sets another user''s roles');
select throws_ok($$ select public.admin_set_user_roles('00000000-0000-4000-8000-000000000008', array['admin','manager'], 'Self') $$,'42501','Admins cannot assign roles to themselves.','T-SEC-26b admin cannot change their own roles');
select throws_ok($$ select public.admin_set_user_roles('00000000-0000-4000-8000-000000000007', array['not_a_role'], 'Bad') $$,'22023',null,'T-SEC-26a an unknown role is refused');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select throws_ok($$ select public.admin_set_user_roles('00000000-0000-4000-8000-000000000001', array['admin'], 'x') $$,'42501',null,'T-SEC-26b manager cannot');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.admin_set_user_roles('00000000-0000-4000-8000-000000000001', array['admin'], 'x') $$,'42501',null,'T-SEC-26b claimant cannot');
select throws_ok($$ select public.admin_list_users() $$,'42501',null,'T-SEC-25b a claimant cannot list users');
reset role;
select * from finish();
rollback;
