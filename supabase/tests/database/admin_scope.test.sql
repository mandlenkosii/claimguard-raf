-- T-BR25-1: administrator access does not grant claim or investigation access.
begin;
select plan(5);
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select is_empty($$ select 1 from public.documents $$,'T-BR25-1 documents');
select is_empty($$ select 1 from storage.objects where bucket_id='claim-documents' $$,'T-BR25-1 storage objects');
select is_empty($$ select 1 from public.risk_alerts $$,'T-BR25-1 risk_alerts');
select is_empty($$ select 1 from public.risk_evidence $$,'T-BR25-1 risk_evidence');
select is_empty($$ select 1 from public.investigation_notes $$,'T-BR25-1 investigation_notes');
reset role;
select * from finish();
rollback;
