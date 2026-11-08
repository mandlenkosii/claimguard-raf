-- T-SEC-28: client relationships.
begin;
select plan(2);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select isnt_empty($$ select 1 from public.client_relationships where organisation_id='a0000000-0000-4000-8000-000000000001' $$,'T-SEC-28a lawyer reads own firm''s client relationships');
select is_empty($$ select 1 from public.client_relationships where organisation_id='a0000000-0000-4000-8000-000000000002' $$,'T-SEC-28b lawyer cannot read the second firm''s');
reset role;
select * from finish();
rollback;
