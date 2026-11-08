-- T-SEC-30: settings.
begin;
select plan(4);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
update public.readiness_settings set rules_version='t30';
select is((select rules_version from public.readiness_settings),'t30','T-SEC-30a admin updates readiness settings');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
update public.readiness_settings set rules_version='officer';
select is((select rules_version from public.readiness_settings),'t30','T-SEC-30b officer cannot update settings');
update public.validation_rules set name='officer' where id='RULE-001';
select isnt((select name from public.validation_rules where id='RULE-001'),'officer','T-SEC-30b officer cannot update rules');
select isnt_empty($$ select 1 from public.validation_rules $$,'T-SEC-30 any active user reads rules');
reset role;
select * from finish();
rollback;
