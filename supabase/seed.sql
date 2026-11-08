-- Fictional seed data (Section 8.7, PRD 12.2). No real people, identity numbers or passwords.
-- Demo passwords are set afterwards by scripts/seed-demo-users.mjs from DEMO_USER_PASSWORD.

insert into public.roles (key, name) values
  ('claimant','Claimant'), ('lawyer','Legal practitioner'), ('raf_officer','RAF officer'),
  ('investigator','Risk investigator'), ('manager','Manager'), ('admin','Administrator');

insert into public.permissions (key, description) values
  ('claims.view','View claims'), ('claims.create','Create claims'), ('documents.upload','Upload documents'),
  ('readiness.view','View readiness'), ('risk.view_evidence','View risk evidence'), ('requests.create','Create requests'),
  ('investigations.review','Review investigations'), ('users.manage','Manage users and roles'),
  ('claims.assign','Assign staff to claims'), ('audit.view','View the claim audit log'),
  ('extractions.correct','Correct extracted fields'), ('reports.export','Export reports'), ('settings.manage','Manage settings and rules');

-- PRD Section 4 table with the Section 18 #6 meanings. "If permitted" and "No default" start as 'no'.
insert into public.role_permissions (role_key, permission_key, scope)
select v.role_key, v.permission_key, v.scope from (values
  ('claimant','claims.view','own'), ('lawyer','claims.view','authorised'), ('raf_officer','claims.view','assigned'), ('investigator','claims.view','investigation'), ('manager','claims.view','summary'), ('admin','claims.view','admin'),
  ('claimant','claims.create','own'), ('lawyer','claims.create','authorised'), ('raf_officer','claims.create','no'), ('investigator','claims.create','no'), ('manager','claims.create','no'), ('admin','claims.create','no'),
  ('claimant','documents.upload','own'), ('lawyer','documents.upload','authorised'), ('raf_officer','documents.upload','no'), ('investigator','documents.upload','no'), ('manager','documents.upload','no'), ('admin','documents.upload','no'),
  ('claimant','readiness.view','own'), ('lawyer','readiness.view','authorised'), ('raf_officer','readiness.view','permitted'), ('investigator','readiness.view','investigation'), ('manager','readiness.view','aggregated'), ('admin','readiness.view','configuration'),
  ('claimant','risk.view_evidence','no'), ('lawyer','risk.view_evidence','limited'), ('raf_officer','risk.view_evidence','limited'), ('investigator','risk.view_evidence','assigned'), ('manager','risk.view_evidence','restricted'), ('admin','risk.view_evidence','restricted'),
  ('claimant','requests.create','no'), ('lawyer','requests.create','no'), ('raf_officer','requests.create','yes'), ('investigator','requests.create','no'), ('manager','requests.create','no'), ('admin','requests.create','no'),
  ('claimant','investigations.review','no'), ('lawyer','investigations.review','no'), ('raf_officer','investigations.review','limited'), ('investigator','investigations.review','yes'), ('manager','investigations.review','summary'), ('admin','investigations.review','no'),
  ('claimant','users.manage','no'), ('lawyer','users.manage','no'), ('raf_officer','users.manage','no'), ('investigator','users.manage','no'), ('manager','users.manage','no'), ('admin','users.manage','yes'),
  ('raf_officer','claims.assign','permitted'), ('admin','claims.assign','admin'),
  ('raf_officer','audit.view','permitted'), ('admin','audit.view','admin'),
  ('lawyer','extractions.correct','authorised'), ('raf_officer','extractions.correct','assigned'),
  ('admin','settings.manage','configuration')
) as v (role_key, permission_key, scope);

insert into public.document_categories (key, name, is_required) values
  ('identity_document','Identity document',true), ('accident_report','Accident report',true),
  ('hospital_medical_report','Hospital medical report',true), ('serious_injury_assessment','Serious injury assessment',true),
  ('proof_of_earnings','Proof of earnings',false);

insert into public.validation_rules (id, name, version, readiness_category, required_inputs, impact, explanation, corrective_action, blocks_transition, creates_risk_alert, risk_indicator, risk_severity) values
  ('RULE-001','Required document missing','1.0.0','documentation','["documents"]','blocking','A required document category has not been supplied.','Request or upload the document.',true,false,null,null),
  ('RULE-002','Identity information conflict','1.0.0','identity','["extracted_fields"]','warning','Sources contain different identity values.','Review sources and verify the correct information.',false,true,'identity_mismatch','MEDIUM'),
  ('RULE-003','Date inconsistency','1.0.0','timeline','["extracted_fields"]','warning','Relevant sources contain conflicting dates.','Confirm dates and correct errors.',false,true,'date_inconsistency','HIGH'),
  ('RULE-004','Duplicate file','1.0.0','cross_document','["document_versions"]','warning','Two files have the same cryptographic hash.','Determine whether duplication is expected.',false,true,'duplicate_hash','LOW'),
  ('RULE-005','Extraction uncertainty','1.0.0','cross_document','["extracted_fields"]','warning','Extraction reported low confidence or failed validation. Manual verification required.','Review the source document and correct the extracted value.',false,false,null,null);

insert into public.readiness_settings (rules_version) values ('1.0.0');

insert into public.organisations (id, name, type, registration_number) values
  ('a0000000-0000-4000-8000-000000000001','Nkosi & Partners Attorneys','law_firm','LPC-44810'),
  ('a0000000-0000-4000-8000-000000000002','Demo Firm B Attorneys','law_firm','LPC-55920');

-- Demo auth users with fixed ids and no usable password.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v.email, '', now(),
       v.app::jsonb, v.meta::jsonb, now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-8000-000000000001','claimant.demo@example.com','{"provider":"email","providers":["email"]}','{"account_type":"claimant","first_name":"Thandiwe","surname":"Mokoena","popia_consent":true}'),
  ('00000000-0000-4000-8000-000000000002','claimant2.demo@example.com','{"provider":"email","providers":["email"]}','{"account_type":"claimant","first_name":"Sipho","surname":"Ndlovu","popia_consent":true}'),
  ('00000000-0000-4000-8000-000000000003','lawyer.demo@example.com','{"provider":"email","providers":["email"]}','{"account_type":"legal_practitioner","first_name":"Lindiwe","surname":"Nkosi","popia_consent":true,"firm_name":"Nkosi & Partners Attorneys","practice_number":"LPC-44810-01"}'),
  ('00000000-0000-4000-8000-000000000004','lawyer2.demo@example.com','{"provider":"email","providers":["email"]}','{"account_type":"legal_practitioner","first_name":"Ruan","surname":"Botha","popia_consent":true,"firm_name":"Demo Firm B Attorneys","practice_number":"LPC-55920-01"}'),
  ('00000000-0000-4000-8000-000000000005','officer.demo@example.com','{"provider":"email","providers":["email"],"account_type":"staff"}','{"first_name":"Demo","surname":"RAF Officer"}'),
  ('00000000-0000-4000-8000-000000000006','investigator.demo@example.com','{"provider":"email","providers":["email"],"account_type":"staff"}','{"first_name":"Ayesha","surname":"Patel"}'),
  ('00000000-0000-4000-8000-000000000007','manager.demo@example.com','{"provider":"email","providers":["email"],"account_type":"staff"}','{"first_name":"Demo","surname":"Manager"}'),
  ('00000000-0000-4000-8000-000000000008','admin.demo@example.com','{"provider":"email","providers":["email"],"account_type":"staff"}','{"first_name":"Demo","surname":"Administrator"}')
) as v (id, email, app, meta);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id, u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u where u.email like '%.demo@example.com';

update public.legal_practitioners set verification_status = 'verified' where profile_id in ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004');

insert into public.organisation_members (organisation_id, profile_id) values
  ('a0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004');

insert into public.user_roles (user_id, role_key, assigned_by, reason) values
  ('00000000-0000-4000-8000-000000000008','admin',null,'Demo seed'),
  ('00000000-0000-4000-8000-000000000003','lawyer','00000000-0000-4000-8000-000000000008','Demo seed'),
  ('00000000-0000-4000-8000-000000000004','lawyer','00000000-0000-4000-8000-000000000008','Demo seed'),
  ('00000000-0000-4000-8000-000000000005','raf_officer','00000000-0000-4000-8000-000000000008','Demo seed'),
  ('00000000-0000-4000-8000-000000000006','investigator','00000000-0000-4000-8000-000000000008','Demo seed'),
  ('00000000-0000-4000-8000-000000000007','manager','00000000-0000-4000-8000-000000000008','Demo seed');

insert into public.claimants (id, profile_id, first_name, surname, id_number, date_of_birth, email, created_by) values
  ('b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Thandiwe','Mokoena','SYN0000000001','1990-04-12','claimant.demo@example.com','00000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Sipho','Ndlovu','SYN0000000002','1984-02-14','claimant2.demo@example.com','00000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000003',null,'Nomsa','Khumalo','SYN0000000003','1994-01-29','n.khumalo@example.com','00000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000004',null,'Pieter','van der Merwe','SYN0000000004','1976-11-04','p.vdmerwe@example.com','00000000-0000-4000-8000-000000000004'),
  ('b0000000-0000-4000-8000-000000000005',null,'Lerato','Molefe','SYN0000000005','1995-11-04','l.molefe@example.com','00000000-0000-4000-8000-000000000003');

insert into public.client_relationships (organisation_id, claimant_id, assigned_lawyer_id, mandate_status) values
  ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','on_file'),
  ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','on_file'),
  ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003','on_file'),
  ('a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000004','on_file'),
  ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000003','on_file');

-- The five PRD 12.2 claims. Status is set on insert: guard_claim_status only applies to updates.
insert into public.claims (id, claimant_id, representing_organisation_id, status, claimant_role, accident_date, accident_province, accident_town, accident_location, police_station, cas_number, accident_description, injuries_summary, created_by) values
  ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','ready','passenger','2025-10-02','Gauteng','Johannesburg','N1 North near Grayston','SAPS Sandton','CAS 112/10/2025','Fictional example: the vehicle was struck from behind in slow traffic.','Fictional example: whiplash injury.','00000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','documents_needed','driver','2025-11-14','Limpopo','Polokwane','N1 Polokwane corridor','SAPS Polokwane','CAS 240/11/2025','Fictional example: a collision on the N1 near Polokwane.','Fictional example: fractured left wrist.','00000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','validation','pedestrian','2025-11-14','Gauteng','Midrand','R55 and Kyalami Junction','SAPS Midrand','CAS 319/11/2025','Fictional example: a pedestrian was struck at a junction.','Fictional example: fractured right tibia.','00000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','information_required','driver','2025-09-21','Western Cape','Cape Town','N2 near Airport Approach','SAPS Cape Town Central','CAS 88/09/2025','Fictional example: a rear-end collision on the N2.','Fictional example: lower back injury.','00000000-0000-4000-8000-000000000004'),
  ('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001','raf_review','cyclist','2026-03-12','KwaZulu-Natal','Durban','M4 at Argyle Road','SAPS Durban Central','CAS 57/03/2026','Fictional example: a cyclist was knocked over at an intersection.','Fictional example: concussion and shoulder injury.','00000000-0000-4000-8000-000000000003');

-- The trigger ignores supplied references, so the design references are set afterwards.
update public.claims set reference = v.reference from (values
  ('c0000000-0000-4000-8000-000000000001','CG-2026-000140'),
  ('c0000000-0000-4000-8000-000000000002','CG-2026-000141'),
  ('c0000000-0000-4000-8000-000000000003','CG-2026-000142'),
  ('c0000000-0000-4000-8000-000000000004','CG-2026-000143'),
  ('c0000000-0000-4000-8000-000000000005','CG-2026-000144')
) as v (id, reference) where claims.id = v.id::uuid;

insert into public.claim_parties (claim_id, party_type, full_name, organisation_id)
select c.id, 'claimant', cl.first_name || ' ' || cl.surname, null from public.claims c join public.claimants cl on cl.id = c.claimant_id
union all
select c.id, 'legal_representative', o.name, o.id from public.claims c join public.organisations o on o.id = c.representing_organisation_id;

insert into public.claim_vehicles (claim_id, registration_number, make_model) values
  ('c0000000-0000-4000-8000-000000000002','SAMPLE 01 GP','Fictional sedan'),
  ('c0000000-0000-4000-8000-000000000003','SAMPLE 02 GP','Fictional bakkie');

-- The officer is assigned to every claim except CG-2026-000141 (used by the deny test T-SEC-3b).
insert into public.claim_assignments (claim_id, profile_id, assignment_role, assigned_by)
select v.claim::uuid, '00000000-0000-4000-8000-000000000005', 'raf_officer', '00000000-0000-4000-8000-000000000008'
from (values ('c0000000-0000-4000-8000-000000000001'),('c0000000-0000-4000-8000-000000000003'),('c0000000-0000-4000-8000-000000000004'),('c0000000-0000-4000-8000-000000000005')) as v (claim);

-- Documents: identifiers derived from claim and category. CG-2026-000141 and 143 have no hospital report (RULE-001).
insert into public.documents (id, claim_id, category_key, processing_status, uploaded_by)
select md5(v.claim || v.category)::uuid, v.claim::uuid, v.category, 'processed', c.created_by
from (values
  ('c0000000-0000-4000-8000-000000000001','identity_document'),('c0000000-0000-4000-8000-000000000001','accident_report'),('c0000000-0000-4000-8000-000000000001','hospital_medical_report'),('c0000000-0000-4000-8000-000000000001','serious_injury_assessment'),('c0000000-0000-4000-8000-000000000001','proof_of_earnings'),
  ('c0000000-0000-4000-8000-000000000002','identity_document'),('c0000000-0000-4000-8000-000000000002','accident_report'),('c0000000-0000-4000-8000-000000000002','serious_injury_assessment'),
  ('c0000000-0000-4000-8000-000000000003','identity_document'),('c0000000-0000-4000-8000-000000000003','accident_report'),('c0000000-0000-4000-8000-000000000003','hospital_medical_report'),('c0000000-0000-4000-8000-000000000003','serious_injury_assessment'),
  ('c0000000-0000-4000-8000-000000000004','identity_document'),('c0000000-0000-4000-8000-000000000004','accident_report'),('c0000000-0000-4000-8000-000000000004','serious_injury_assessment'),
  ('c0000000-0000-4000-8000-000000000005','identity_document'),('c0000000-0000-4000-8000-000000000005','accident_report'),('c0000000-0000-4000-8000-000000000005','hospital_medical_report'),('c0000000-0000-4000-8000-000000000005','serious_injury_assessment')
) as v (claim, category)
join public.claims c on c.id = v.claim::uuid;

insert into public.document_versions (document_id, version, storage_path, filename, mime_type, size_bytes, confirmed, malware_scan_status, uploaded_by)
select d.id, 1, format('claims/%s/%s/v1/%s_SAMPLE.pdf', d.claim_id, d.id, d.category_key), d.category_key || '_SAMPLE.pdf', 'application/pdf', 1024, true, 'clean', d.uploaded_by
from public.documents d;

-- Mock extractions behind the identity conflict (RULE-002) and the date conflict (RULE-003).
insert into public.document_extractions (id, document_version_id, status, extracted_text)
select md5('extraction' || d.claim_id || d.category_key)::uuid, v.id, 'succeeded', 'SAMPLE fictional extracted text'
from public.documents d join public.document_versions v on v.document_id = d.id
where d.claim_id in ('c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000005')
  and d.category_key in ('identity_document','accident_report','hospital_medical_report');

insert into public.extracted_fields (id, extraction_id, field_key, value, confidence, source_page)
select md5('field' || v.claim || v.category || v.field)::uuid, md5('extraction' || v.claim || v.category)::uuid, v.field, v.value, v.confidence, 1
from (values
  ('c0000000-0000-4000-8000-000000000003','identity_document','full_name','Sipho M. Ndlovu',0.980),
  ('c0000000-0000-4000-8000-000000000003','hospital_medical_report','full_name','S. Ndhlovu',0.910),
  ('c0000000-0000-4000-8000-000000000005','accident_report','accident_date','2026-03-12',0.970),
  ('c0000000-0000-4000-8000-000000000005','hospital_medical_report','admission_date','2026-03-21',0.950)
) as v (claim, category, field, value, confidence);

-- Latest readiness assessment per claim (weights 30/25/15/15/15).
insert into public.readiness_assessments (id, claim_id, rules_version, input_hash, score, category_scores, blocking_count, warning_count, resolved_count)
select md5('assessment' || v.claim)::uuid, v.claim::uuid, '1.0.0', md5('seed' || v.claim), v.score, v.categories::jsonb, v.blocking, v.warning, 0
from (values
  ('c0000000-0000-4000-8000-000000000001',100,'{"documentation":100,"required_information":100,"identity":100,"timeline":100,"cross_document":100}',0,0),
  ('c0000000-0000-4000-8000-000000000002',93,'{"documentation":75,"required_information":100,"identity":100,"timeline":100,"cross_document":100}',1,0),
  ('c0000000-0000-4000-8000-000000000003',85,'{"documentation":100,"required_information":100,"identity":0,"timeline":100,"cross_document":100}',0,1),
  ('c0000000-0000-4000-8000-000000000004',93,'{"documentation":75,"required_information":100,"identity":100,"timeline":100,"cross_document":100}',1,0),
  ('c0000000-0000-4000-8000-000000000005',85,'{"documentation":100,"required_information":100,"identity":100,"timeline":0,"cross_document":100}',0,1)
) as v (claim, score, categories, blocking, warning);

insert into public.claim_checks (assessment_id, claim_id, rule_id, rule_version, result)
select md5('assessment' || c.id)::uuid, c.id, r.id, r.version,
  case
    when (r.id = 'RULE-001' and c.id in ('c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000004'))
      or (r.id = 'RULE-002' and c.id = 'c0000000-0000-4000-8000-000000000003')
      or (r.id = 'RULE-003' and c.id = 'c0000000-0000-4000-8000-000000000005') then 'failed'
    else 'passed'
  end
from public.claims c cross join public.validation_rules r
where c.id::text like 'c0000000-%';

insert into public.claim_issues (claim_id, rule_id, issue_key, title, explanation, corrective_action, impact, evidence) values
  ('c0000000-0000-4000-8000-000000000002','RULE-001','missing:hospital_medical_report','Hospital medical report missing','A required document category has not been supplied.','Request or upload the document.','blocking','[{"category":"hospital_medical_report"}]'),
  ('c0000000-0000-4000-8000-000000000004','RULE-001','missing:hospital_medical_report','Hospital medical report missing','A required document category has not been supplied.','Request or upload the document.','blocking','[{"category":"hospital_medical_report"}]'),
  ('c0000000-0000-4000-8000-000000000003','RULE-002','conflict:full_name','Claimant name differs between documents','The identity document shows "Sipho M. Ndlovu" and the hospital medical report shows "S. Ndhlovu".','Review sources and verify the correct information.','warning','[{"source":"identity_document","field":"full_name"},{"source":"hospital_medical_report","field":"full_name"}]'),
  ('c0000000-0000-4000-8000-000000000005','RULE-003','conflict:accident_date','Accident dates differ between documents','The accident report records 12 Mar 2026 and the hospital record shows admission on 21 Mar 2026.','Confirm dates and correct errors.','warning','[{"source":"accident_report","field":"accident_date"},{"source":"hospital_medical_report","field":"admission_date"}]');

-- Alert RA-2026-00031 (S36): an indicator for human review, never a finding of fraud.
insert into public.risk_alerts (id, reference, claim_id, rule_id, indicator_type, severity, status, title, explanation, assigned_to) values
  ('e0000000-0000-4000-8000-000000000001','RA-2026-00001','c0000000-0000-4000-8000-000000000005','RULE-003','date_inconsistency','HIGH','UNDER_REVIEW','Conflicting accident dates across documents','The accident report records 12 Mar 2026 and the hospital record shows admission on 21 Mar 2026. This is an indicator for human review, not a finding of wrongdoing.','00000000-0000-4000-8000-000000000006');
update public.risk_alerts set reference = 'RA-2026-00031' where id = 'e0000000-0000-4000-8000-000000000001';

insert into public.risk_evidence (alert_id, extracted_field_id, description) values
  ('e0000000-0000-4000-8000-000000000001', md5('fieldc0000000-0000-4000-8000-000000000005accident_reportaccident_date')::uuid, 'Accident date on the accident report (SAMPLE)'),
  ('e0000000-0000-4000-8000-000000000001', md5('fieldc0000000-0000-4000-8000-000000000005hospital_medical_reportadmission_date')::uuid, 'Admission date on the hospital medical report (SAMPLE)');

insert into public.information_requests (id, claim_id, title, description, recipient_type, requests_documents, due_date, created_by) values
  ('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','Provide hospital medical report','Please upload the hospital medical report for this fictional claim.','legal_representative',true,'2026-12-31','00000000-0000-4000-8000-000000000005');

insert into public.message_threads (id, claim_id, title, created_by) values
  ('f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','Medical report query','00000000-0000-4000-8000-000000000005');
insert into public.messages (thread_id, claim_id, author_id, body) values
  ('f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005','Please confirm the spelling of the claimant name on the hospital medical report.');
