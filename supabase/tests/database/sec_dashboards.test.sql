-- T-SEC-31: each role sees metrics for its own scope only.
begin;
select plan(6);
set local role authenticated;

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select ok((public.get_dashboard_metrics('lawyer')->>'claims_total')::integer >= 1,'T-SEC-31a lawyer gets firm metrics');
select is(public.get_dashboard_metrics('manager'),'{}'::jsonb,'T-SEC-31b lawyer asking for manager metrics gets nothing');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public.get_dashboard_metrics('manager'),'{}'::jsonb,'T-SEC-31b claimant asking for manager metrics gets nothing');
select is(public.get_outstanding_work('lawyer'),'[]'::jsonb,'T-SEC-31b claimant asking for lawyer work gets nothing');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select ok((public.get_dashboard_metrics('manager')->>'claims_total')::integer >= 5,'T-SEC-31a manager gets totals');
select is(public.get_outstanding_work('manager'),'[]'::jsonb,'T-SEC-31a the manager has no work list');
reset role;
select * from finish();
rollback;
