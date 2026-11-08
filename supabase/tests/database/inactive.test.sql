-- T-BR24-1, T-SEC-29: suspended or disabled accounts see nothing.
begin;
select plan(3);
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
select isnt_empty($$ select 1 from public.claims $$,'T-SEC-29a the active claimant reads own claim');
reset role;
update public.profiles set account_status='suspended' where id='00000000-0000-4000-8000-000000000002';
set local role authenticated; set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is_empty($$ select 1 from public.claims $$,'T-SEC-29b the suspended claimant reads nothing');
select is_empty($$
 select 1 from public.organisations union all select 1 from public.profiles union all select 1 from public.roles union all select 1 from public.permissions union all select 1 from public.role_permissions
 union all select 1 from public.user_roles union all select 1 from public.organisation_members union all select 1 from public.legal_practitioners union all select 1 from public.claimants union all select 1 from public.client_relationships
 union all select 1 from public.claims union all select 1 from public.claim_parties union all select 1 from public.claim_vehicles union all select 1 from public.claim_assignments union all select 1 from public.document_categories
 union all select 1 from public.documents union all select 1 from public.document_versions union all select 1 from public.document_extractions union all select 1 from public.extracted_fields union all select 1 from public.extracted_field_corrections
 union all select 1 from public.validation_rules union all select 1 from public.readiness_settings union all select 1 from public.readiness_assessments union all select 1 from public.claim_checks union all select 1 from public.claim_issues union all select 1 from public.claim_issue_history
 union all select 1 from public.risk_alerts union all select 1 from public.risk_evidence union all select 1 from public.risk_alert_history union all select 1 from public.investigation_notes union all select 1 from public.risk_reviews
 union all select 1 from public.information_requests union all select 1 from public.request_responses union all select 1 from public.request_status_history union all select 1 from public.message_threads union all select 1 from public.messages union all select 1 from public.message_attachments
 union all select 1 from public.claim_timeline_events union all select 1 from public.notifications union all select 1 from public.notification_preferences union all select 1 from public.audit_logs
 union all select 1 from public.claim_summaries union all select 1 from public.claim_risk_flags union all select 1 from public.claims_list
$$,'T-BR24-1 every protected table returns no rows');
reset role;
select * from finish();
rollback;
