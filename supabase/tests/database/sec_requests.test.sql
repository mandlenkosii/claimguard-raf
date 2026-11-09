-- T-SEC-18, T-SEC-19, T-SEC-20: creating, answering and closing information requests.
begin;
select plan(12);
set local role authenticated;

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$ select public.create_information_request('c0000000-0000-4000-8000-000000000003','T','D','claimant',null,false,null) $$,'T-SEC-18a officer creates a request');
select throws_ok($$ select public.create_information_request('c0000000-0000-4000-8000-000000000002','T','D','claimant',null,false,null) $$,'42501',null,'T-SEC-18b officer not assigned cannot');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.create_information_request('c0000000-0000-4000-8000-000000000003','T','D','claimant',null,false,null) $$,'42501',null,'T-SEC-18b claimant cannot');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select throws_ok($$ select public.create_information_request('c0000000-0000-4000-8000-000000000003','T','D','claimant',null,false,null) $$,'42501',null,'T-SEC-18b manager cannot');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000008","role":"authenticated"}';
select throws_ok($$ select public.create_information_request('c0000000-0000-4000-8000-000000000003','T','D','claimant',null,false,null) $$,'42501',null,'T-SEC-18b admin cannot');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok($$ select public.respond_to_request('d0000000-0000-4000-8000-000000000001','x','{}') $$,'42501',null,'T-SEC-19b the requester cannot respond');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$ select public.respond_to_request('d0000000-0000-4000-8000-000000000001','x','{}') $$,'42501',null,'T-SEC-19b an unrelated lawyer cannot respond');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok($$ select public.respond_to_request('d0000000-0000-4000-8000-000000000001','x','{}') $$,'T-SEC-19a the recipient lawyer responds');
select throws_ok($$ select public.update_request_status('d0000000-0000-4000-8000-000000000001','closed') $$,'42501',null,'T-SEC-20b the responder cannot close');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.update_request_status('d0000000-0000-4000-8000-000000000001','closed') $$,'42501',null,'T-SEC-20b claimant cannot close');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
select lives_ok($$ select public.update_request_status('d0000000-0000-4000-8000-000000000001','closed') $$,'T-SEC-20a the creator closes');
select throws_ok($$ update public.information_requests set status='pending' $$,'42501',null,'T-SEC-20b no direct update');
reset role;
select * from finish();
rollback;
