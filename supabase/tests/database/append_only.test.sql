-- T-BR19-1, T-BR19-2: append-only notes and reviews.
begin;
select plan(6);
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000006","role":"authenticated"}';
insert into public.investigation_notes (id,alert_id,author_id,body) values ('11000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000006','note');
insert into public.risk_reviews (id,alert_id,outcome,finding_summary,rationale,next_action,resulting_status,confirmed) values ('11000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','no_issue_explained','a','b','c','RESOLVED',true);
select throws_ok($$ update public.investigation_notes set body='changed' where id='11000000-0000-4000-8000-000000000001' $$,'P0001',null,'T-BR19-1 note update fails');
select throws_ok($$ delete from public.investigation_notes where id='11000000-0000-4000-8000-000000000001' $$,'P0001',null,'T-BR19-1 note delete fails');
select throws_ok($$ update public.risk_reviews set rationale='changed' where id='11000000-0000-4000-8000-000000000002' $$,'P0001',null,'T-BR19-2 review update fails');
select throws_ok($$ delete from public.risk_reviews where id='11000000-0000-4000-8000-000000000002' $$,'P0001',null,'T-BR19-2 review delete fails');
select is((select recorded_by from public.risk_reviews where id='11000000-0000-4000-8000-000000000002'),'00000000-0000-4000-8000-000000000006'::uuid,'T-BR19-2 recorded_by is set');
select isnt((select recorded_at from public.risk_reviews where id='11000000-0000-4000-8000-000000000002'),null,'T-BR19-2 recorded_at is set');
select * from finish();
rollback;
