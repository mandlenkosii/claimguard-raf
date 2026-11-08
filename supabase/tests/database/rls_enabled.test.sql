-- T-DB-1: every table in public has RLS on and at least one policy.
begin;
select plan(3);
select isnt_empty($$ select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' $$, 'T-DB-1 the public schema has tables');
select is_empty($$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$, 'T-DB-1 every table has RLS enabled');
select is_empty($$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not exists (select 1 from pg_policy p where p.polrelid = c.oid) $$, 'T-DB-1 every table has at least one policy');
select * from finish();
rollback;
