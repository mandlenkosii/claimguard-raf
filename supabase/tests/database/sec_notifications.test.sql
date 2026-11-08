-- T-SEC-22: notifications.
begin;
select plan(5);
insert into public.notifications (id,recipient_id,type,title,summary,link) values ('16000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','message','t','s','/');
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select isnt_empty($$ select 1 from public.notifications where id='16000000-0000-4000-8000-000000000001' $$,'T-SEC-22a user reads own notification');
update public.notifications set read_at=now() where id='16000000-0000-4000-8000-000000000001';
select isnt((select read_at from public.notifications where id='16000000-0000-4000-8000-000000000001'),null,'T-SEC-22a user marks it read');
select throws_ok($$ update public.notifications set title='changed' where id='16000000-0000-4000-8000-000000000001' $$,'42501',null,'T-SEC-22b no other column may change');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is_empty($$ select 1 from public.notifications where id='16000000-0000-4000-8000-000000000001' $$,'T-SEC-22b another user cannot read it');
update public.notifications set read_at=null where id='16000000-0000-4000-8000-000000000001';
reset role;
select isnt((select read_at from public.notifications where id='16000000-0000-4000-8000-000000000001'),null,'T-SEC-22b another user cannot change it');
select * from finish();
rollback;
