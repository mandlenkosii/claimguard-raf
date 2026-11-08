-- T-BR4-1, T-BR4-2, T-BR5-1, T-BR6-1, T-SEC-9: the workflow function.
begin;
select plan(13);
select is((select count(*)::int from public.workflow_matrix()),16,'T-BR4-1 the matrix has 16 (from, to, role) rows');
insert into public.claims (id,claimant_id,created_by,status) values ('17000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','submitted');
insert into public.claim_assignments (claim_id,profile_id,assignment_role,assigned_by) values ('17000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005','raf_officer','00000000-0000-4000-8000-000000000008');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select public.transition_claim_status('c0000000-0000-4000-8000-000000000002','settlement','Trying to skip ahead') ->> 'ok'),'false','T-BR4-2 an invalid (from, to, role) is refused');
reset role;
select is((select status from public.claims where id='c0000000-0000-4000-8000-000000000002'),'documents_needed','T-BR4-2 nothing changes');
select isnt_empty($$ select 1 from public.claim_timeline_events where claim_id='c0000000-0000-4000-8000-000000000002' and event_type='status_change_blocked' and to_status='settlement' $$,'T-BR6-1 a blocked event is logged');
select isnt_empty($$ select 1 from public.audit_logs where claim_id='c0000000-0000-4000-8000-000000000002' and action='STATUS_CHANGE_BLOCKED' and outcome='denied' $$,'T-BR6-1 a denied audit row is written');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select public.transition_claim_status('c0000000-0000-4000-8000-000000000001','submitted','Ready to lodge') ->> 'ok'),'true','T-BR5-1 a valid transition succeeds');
reset role;
select is((select status from public.claims where id='c0000000-0000-4000-8000-000000000001'),'submitted','T-BR5-1 the status changed');
select isnt((select submitted_at from public.claims where id='c0000000-0000-4000-8000-000000000001'),null,'T-BR5-1 submitted_at is set');
select isnt_empty($$ select 1 from public.claim_timeline_events where claim_id='c0000000-0000-4000-8000-000000000001' and event_type='status_changed' and from_status='ready' and to_status='submitted' and actor_id='00000000-0000-4000-8000-000000000003' and reason='Ready to lodge' and created_at is not null $$,'T-BR5-1 the timeline holds from, to, actor, time and reason');
select isnt_empty($$ select 1 from public.audit_logs where claim_id='c0000000-0000-4000-8000-000000000001' and action='STATUS_CHANGED' and actor_id='00000000-0000-4000-8000-000000000003' and reason='Ready to lodge' and change_summary = '{"from":"ready","to":"submitted"}'::jsonb $$,'T-BR5-1 the audit row holds from, to, actor and reason');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
select is((select public.transition_claim_status('17000000-0000-4000-8000-000000000001','raf_review','Starting review') ->> 'status'),'raf_review','T-SEC-9a the assigned officer moves Submitted to RAF Review');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select public.transition_claim_status('17000000-0000-4000-8000-000000000001','assessment','Not mine to do') ->> 'ok'),'false','T-SEC-9b the claimant cannot');
select throws_ok($$ update public.claims set status='closed' where id='17000000-0000-4000-8000-000000000001' $$,'42501',null,'T-SEC-9b a direct update is rejected');
reset role;
select * from finish();
rollback;
