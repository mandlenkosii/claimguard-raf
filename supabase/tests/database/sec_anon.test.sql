-- T-SEC-34: anonymous users.
begin;
select plan(4);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
select isnt_empty($$ select 1 from public.claims $$,'T-SEC-34a an authenticated active user reads permitted rows');
reset role;
select is_empty($$ select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v') and has_table_privilege('anon',c.oid,'select') $$,'T-SEC-34b anon can select from no table or view');
select is_empty($$ select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (has_table_privilege('anon',c.oid,'insert') or has_table_privilege('anon',c.oid,'update') or has_table_privilege('anon',c.oid,'delete')) $$,'T-SEC-34b anon can write to no table');
select is_empty($$ select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon',p.oid,'execute') $$,'T-SEC-34b anon can execute no function in public');
select * from finish();
rollback;

