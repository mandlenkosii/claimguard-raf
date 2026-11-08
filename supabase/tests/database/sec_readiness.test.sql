-- T-SEC-13: readiness and issues.
begin;
select plan(3);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select isnt_empty($$ select 1 from public.claim_issues where claim_id='c0000000-0000-4000-8000-000000000003' $$,'T-SEC-13a lawyer reads an authorised claim''s issues');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is_empty($$ select 1 from public.claim_issues where claim_id='c0000000-0000-4000-8000-000000000003' $$,'T-SEC-13b second-firm lawyer cannot');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select is_empty($$ select 1 from public.claim_issues union all select 1 from public.readiness_assessments union all select 1 from public.claim_checks $$,'T-SEC-13b manager cannot');
reset role;
select * from finish();
rollback;
