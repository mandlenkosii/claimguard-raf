-- T-SETUP-3: the local database runs pgTAP and has the public schema.
begin;
select plan(1);

select has_schema('public', 'T-SETUP-3 the public schema exists');

select * from finish();
rollback;
