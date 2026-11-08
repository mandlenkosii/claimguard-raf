-- T-DB-3, T-BR1-2, T-BR1-3: server-generated references.
begin;
select plan(6);
insert into public.risk_alerts (claim_id, indicator_type, severity, title, explanation) values
 ('c0000000-0000-4000-8000-000000000001','date_inconsistency','HIGH','t3 one','x'),
 ('c0000000-0000-4000-8000-000000000001','date_inconsistency','HIGH','t3 two','x');
select matches((select reference from public.risk_alerts where title='t3 one'),'^RA-[0-9]{4}-[0-9]{5}$','T-DB-3 first alert reference format');
select matches((select reference from public.risk_alerts where title='t3 two'),'^RA-[0-9]{4}-[0-9]{5}$','T-DB-3 second alert reference format');
select isnt((select reference from public.risk_alerts where title='t3 one'),(select reference from public.risk_alerts where title='t3 two'),'T-DB-3 alert references are unique');
insert into public.claims (claimant_id, created_by, reference, accident_description) values ('b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','HACKED-REF','t1r3');
select matches((select reference from public.claims where accident_description='t1r3'),'^CG-[0-9]{4}-[0-9]{6}$','T-BR1-3 the trigger replaces a supplied reference');
select isnt((select reference from public.claims where accident_description='t1r3'),'HACKED-REF','T-BR1-3 the supplied reference is ignored');
alter table public.claims disable trigger set_claim_reference;
select throws_ok($$ insert into public.claims (claimant_id, created_by, reference) values ('b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','CG-2026-000142') $$, '23505', null, 'T-BR1-2 a duplicate reference is rejected');
select * from finish();
rollback;
