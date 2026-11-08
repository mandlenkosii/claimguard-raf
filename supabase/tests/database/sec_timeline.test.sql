-- T-SEC-23: timeline.
begin;
select plan(5);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select isnt_empty($$ select 1 from public.claim_timeline_events where claim_id='c0000000-0000-4000-8000-000000000002' $$,'T-SEC-23a claimant reads own claim timeline');
select is_empty($$ select 1 from public.claim_timeline_events where claim_id='c0000000-0000-4000-8000-000000000003' $$,'T-SEC-23b claimant cannot read another claim''s timeline');
select throws_ok($$ insert into public.claim_timeline_events (claim_id,event_type,summary) values ('c0000000-0000-4000-8000-000000000002','claim_updated','x') $$,'42501',null,'T-SEC-23b cannot insert events');
select throws_ok($$ update public.claim_timeline_events set summary='x' $$,'42501',null,'T-SEC-23b cannot update events');
select throws_ok($$ delete from public.claim_timeline_events $$,'42501',null,'T-SEC-23b cannot delete events');
reset role;
select * from finish();
rollback;
