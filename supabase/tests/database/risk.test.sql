-- T-BR16-1, T-BR17-1, T-BR18-1: risk alerts.
begin;
select plan(5);
select throws_ok($$ update public.risk_alerts set severity='SEVERE' where id='e0000000-0000-4000-8000-000000000001' $$,'23514',null,'T-BR16-1 invalid severity rejected');
select throws_ok($$ update public.risk_alerts set status='CLOSED' where id='e0000000-0000-4000-8000-000000000001' $$,'23514',null,'T-BR16-1 invalid status rejected');
select throws_ok($$ insert into public.risk_alerts (claim_id,indicator_type,severity,title) values ('c0000000-0000-4000-8000-000000000001','date_inconsistency','HIGH','no explanation') $$,'23502',null,'T-BR17-1 an alert without explanation fails');
select throws_ok($$ insert into public.risk_evidence (alert_id,description) values ('e0000000-0000-4000-8000-000000000001','no source') $$,'23514',null,'T-BR17-1 evidence with no source fails');
select is_empty($$ select table_name, column_name from information_schema.columns where table_schema='public' and table_name in ('claims','claimants','profiles') and column_name ilike '%fraud%' $$,'T-BR18-1 no column stores a fraud label');
select * from finish();
rollback;
