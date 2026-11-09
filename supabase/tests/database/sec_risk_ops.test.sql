-- T-SEC-15, T-SEC-17: changing alerts and recording reviews.
begin;
select plan(11);
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data) values
 ('10000000-0000-4000-8000-000000000041','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inv41@example.com','{"first_name":"I","surname":"Four"}','{"account_type":"staff"}');
insert into public.user_roles (user_id,role_key,assigned_by,reason) values ('10000000-0000-4000-8000-000000000041','investigator','00000000-0000-4000-8000-000000000008','test');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000006","role":"authenticated"}';
select lives_ok($$ select public.update_risk_alert('e0000000-0000-4000-8000-000000000001', null, null, 'CRITICAL', 'More serious') $$,'T-SEC-15a assigned investigator changes severity');
select throws_ok($$ insert into public.role_permissions (role_key,permission_key,scope) values ('investigator','settings.manage','yes') $$,'42501',null,'T-SEC-15b an investigator cannot grant permissions');
select throws_ok($$ insert into public.user_roles (user_id,role_key,assigned_by,reason) values (auth.uid(),'admin',auth.uid(),'x') $$,'42501',null,'T-SEC-15b an investigator cannot grant roles');
select throws_ok($$ update public.risk_alerts set severity='LOW' $$,'42501',null,'T-SEC-15b no direct update');
select lives_ok($$ select public.record_risk_review('e0000000-0000-4000-8000-000000000001','no_issue_explained','Summary','Rationale','{}','None',null,'ESCALATED',true) $$,'T-SEC-17a investigator with access records a review');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000041","role":"authenticated"}';
select throws_ok($$ select public.record_risk_review('e0000000-0000-4000-8000-000000000001','no_issue_explained','Summary','Rationale','{}','None',null,'RESOLVED',true) $$,'42501',null,'T-SEC-17b investigator without access cannot record');
select throws_ok($$ select public.update_risk_alert('e0000000-0000-4000-8000-000000000001', null, null, 'LOW', 'x') $$,'42501',null,'T-SEC-15b investigator without access cannot change severity');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok($$ select public.update_risk_alert('e0000000-0000-4000-8000-000000000001', null, null, 'LOW', 'x') $$,'42501',null,'T-SEC-15b officer cannot change severity');
select throws_ok($$ select public.record_risk_review('e0000000-0000-4000-8000-000000000001','no_issue_explained','Summary','Rationale','{}','None',null,'RESOLVED',true) $$,'42501',null,'T-SEC-17b officer cannot record');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$ select public.update_risk_alert('e0000000-0000-4000-8000-000000000001', null, null, 'LOW', 'x') $$,'42501',null,'T-SEC-15b lawyer cannot change severity');

set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000007","role":"authenticated"}';
select throws_ok($$ select public.update_risk_alert('e0000000-0000-4000-8000-000000000001', null, null, 'LOW', 'x') $$,'42501',null,'T-SEC-15b manager cannot change severity');
reset role;
select * from finish();
rollback;
