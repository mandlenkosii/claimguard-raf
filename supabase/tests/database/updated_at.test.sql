-- T-DB-4: updated_at changes on update.
begin;
select plan(1);
update public.organisations set updated_at = '2000-01-01' where id='a0000000-0000-4000-8000-000000000001';
select isnt((select updated_at from public.organisations where id='a0000000-0000-4000-8000-000000000001'),'2000-01-01'::timestamptz,'T-DB-4 the trigger sets updated_at');
select * from finish();
rollback;
