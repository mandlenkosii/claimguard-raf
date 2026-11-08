-- T-BR2-1, T-BR4-3: drafts and the status guard.
begin;
select plan(3);
select lives_ok($$ insert into public.claims (claimant_id,created_by) values ('b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001') $$,'T-BR2-1 a claim with only a claimant can be stored');
select is((select status from public.claims where created_by='00000000-0000-4000-8000-000000000001' order by created_at desc limit 1),'draft','T-BR2-1 it is stored as draft');
select throws_ok($$ update public.claims set status='settlement' where id='c0000000-0000-4000-8000-000000000002' $$,'P0001',null,'T-BR4-3 guard_claim_status rejects a direct status update');
select * from finish();
rollback;
