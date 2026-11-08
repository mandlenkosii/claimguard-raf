-- T-BR25-2: manager access does not expose investigation evidence.
begin;
select plan(4);
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select is_empty($$ select 1 from public.risk_evidence $$,'T-BR25-2 risk_evidence');
select is_empty($$ select 1 from public.investigation_notes $$,'T-BR25-2 investigation_notes');
select is_empty($$ select 1 from public.risk_reviews $$,'T-BR25-2 risk_reviews');
select is_empty($$ select 1 from public.documents $$,'T-BR25-2 documents');
reset role;
select * from finish();
rollback;
