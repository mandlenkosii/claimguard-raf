-- T-BR15-1, 2, 3: claim issues.
begin;
select plan(5);
select throws_ok($$ update public.claim_issues set status='x' where claim_id='c0000000-0000-4000-8000-000000000003' $$,'23514',null,'T-BR15-1 invalid issue status rejected');
select throws_ok($$ update public.claim_issues set status='dismissed' where claim_id='c0000000-0000-4000-8000-000000000003' $$,'23514',null,'T-BR15-2 dismissing without a reason fails');
select lives_ok($$ update public.claim_issues set status='dismissed', dismiss_reason='Clerical spelling' where claim_id='c0000000-0000-4000-8000-000000000003' $$,'T-BR15-2 dismissing with a reason works');
update public.claim_issues set status='resolved', dismiss_reason=null where claim_id='c0000000-0000-4000-8000-000000000003';
select isnt_empty($$ select 1 from public.claim_issue_history h join public.claim_issues i on i.id=h.issue_id where i.claim_id='c0000000-0000-4000-8000-000000000003' and h.from_status='dismissed' and h.to_status='resolved' $$,'T-BR15-3 a history row exists');
select isnt_empty($$ select 1 from public.claim_issues where claim_id='c0000000-0000-4000-8000-000000000003' and status='resolved' $$,'T-BR15-3 the issue row remains');
select * from finish();
rollback;
