-- T-SEC-7: create_claim.
begin;
select plan(7);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select matches((select public.create_claim(null,'{}'::jsonb) ->> 'reference'),'^CG-[0-9]{4}-[0-9]{6}$','T-SEC-7a the claimant creates their own claim');
select throws_ok($$ select public.create_claim('b0000000-0000-4000-8000-000000000002','{}'::jsonb) $$,'42501',null,'T-SEC-7b a claimant cannot create a claim for someone else');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select matches((select public.create_claim('b0000000-0000-4000-8000-000000000003','{"accident_province":"Gauteng"}'::jsonb) ->> 'reference'),'^CG-','T-SEC-7a the lawyer creates a claim for an authorised client');
select throws_ok($$ select public.create_claim('b0000000-0000-4000-8000-000000000004','{}'::jsonb) $$,'42501',null,'T-SEC-7b a lawyer cannot for another firm''s client');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000006","role":"authenticated"}';
select throws_ok($$ select public.create_claim('b0000000-0000-4000-8000-000000000003','{}'::jsonb) $$,'42501',null,'T-SEC-7b investigator denied');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select throws_ok($$ select public.create_claim('b0000000-0000-4000-8000-000000000003','{}'::jsonb) $$,'42501',null,'T-SEC-7b manager denied');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select throws_ok($$ select public.create_claim('b0000000-0000-4000-8000-000000000003','{}'::jsonb) $$,'42501',null,'T-SEC-7b admin denied');
reset role;
select * from finish();
rollback;
