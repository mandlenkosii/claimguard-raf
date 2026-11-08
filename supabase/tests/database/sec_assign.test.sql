-- T-SEC-10: assigning staff.
begin;
select plan(6);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select lives_ok($$ select public.assign_claim_staff('c0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','raf_officer') $$,'T-SEC-10a an administrator assigns an officer');
select is((select count(*)::int from public.claim_summaries where id='c0000000-0000-4000-8000-000000000002' and assignment_count=1),1,'T-SEC-10a the assignment is active');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.assign_claim_staff('c0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','raf_officer') $$,'42501',null,'T-SEC-10b the claimant cannot assign staff');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$ select public.assign_claim_staff('c0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','raf_officer') $$,'42501',null,'T-SEC-10b the lawyer cannot assign staff');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select throws_ok($$ select public.assign_claim_staff('c0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000007','raf_officer') $$,'22023',null,'T-SEC-10 the person must hold the role being assigned');
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$ select public.assign_claim_staff('c0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005','raf_officer') $$,'T-SEC-10a an officer with claims.assign reassigns');
reset role;
select * from finish();
rollback;
