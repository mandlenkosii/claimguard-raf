-- T-DB-9, T-BR37-1: seed data.
begin;
select plan(7);
select is((select count(*)::int from public.claims where reference in ('CG-2026-000140','CG-2026-000141','CG-2026-000142','CG-2026-000143','CG-2026-000144')),5,'T-DB-9 the five PRD 12.2 claims exist');
select is((select count(*)::int from public.profiles where email in ('claimant.demo@example.com','claimant2.demo@example.com','lawyer.demo@example.com','lawyer2.demo@example.com','officer.demo@example.com','investigator.demo@example.com','manager.demo@example.com','admin.demo@example.com')),8,'T-DB-9 the eight demo accounts exist');
select is((select count(*)::int from public.risk_alerts where reference='RA-2026-00031'),1,'T-DB-9 alert RA-2026-00031 exists');
select is((select c.first_name||' '||c.surname from public.claims cl join public.claimants c on c.id=cl.claimant_id where cl.reference='CG-2026-000142'),'Sipho Ndlovu','T-DB-9 CG-2026-000142 belongs to Sipho Ndlovu');
select is_empty($$ select email from public.profiles where email not like '%@example.com' $$,'T-BR37-1 every profile email is @example.com');
select is_empty($$ select email from public.claimants where email is not null and email not like '%@example.com' $$,'T-BR37-1 every claimant email is @example.com');
select is_empty($$ select id_number from public.claimants where id_number is not null and id_number not like 'SYN%' $$,'T-BR37-1 every claimant id_number is marked synthetic');
select * from finish();
rollback;
