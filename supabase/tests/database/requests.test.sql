-- T-BR20-2: a response never closes a request.
begin;
select plan(1);
insert into public.request_responses (request_id,author_id,body) values ('d0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','response');
select isnt((select status from public.information_requests where id='d0000000-0000-4000-8000-000000000001'),'closed','T-BR20-2 the response insert does not close the request');
select * from finish();
rollback;
