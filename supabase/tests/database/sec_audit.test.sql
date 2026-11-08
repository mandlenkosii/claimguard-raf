-- T-SEC-24: audit logs.
begin;
select plan(4);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select isnt_empty($$ select 1 from public.audit_logs $$,'T-SEC-24a admin reads audit logs');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is_empty($$ select 1 from public.audit_logs $$,'T-SEC-24b claimant cannot');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is_empty($$ select 1 from public.audit_logs $$,'T-SEC-24b lawyer cannot');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select is_empty($$ select 1 from public.audit_logs $$,'T-SEC-24b manager cannot');
reset role;
select * from finish();
rollback;
