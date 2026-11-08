# ClaimGuard RAF — Product Requirements Document

**Claim Intelligence & Assurance Platform**

| Field | Value |
| --- | --- |
| Version | 1.1 |
| Date | 4 November 2026 (v1.0: 2 November 2026) |
| Stage | Concept and prototype planning |
| Target | South African Road Accident Fund claims ecosystem, subject to stakeholder validation |
| Source | v1.0 text from `docs/ClaimGuard_RAF_Product_Requirements_Document.pdf`, plus the v1.1 answers in the Change log at the end of this file |

> Concept prototype. Not an official RAF system. Demonstration data must be fictional unless specifically authorised for a controlled pilot.

---

## 1. Executive Summary

ClaimGuard RAF is a secure digital platform designed to improve the quality, consistency, readiness and traceability of claims information associated with South Africa's Road Accident Fund. It supports claimants, legal practitioners, RAF officers, risk investigators and managers through a shared, structured environment.

The platform identifies missing documents, inconsistent claimant details, conflicting dates, duplicate files, incomplete supporting information and other indicators requiring review. It analyses information, explains potential issues, recommends next steps and provides controlled workflows for resolving them.

ClaimGuard is designed to complement existing RAF claims-management and document-processing systems, not replace them. Any future integration requires appropriate technical access, stakeholder approval and security assessment.

### 1.1 Problem statement

Claims may contain numerous documents, multiple parties, supporting evidence and several assessment stages. When information is missing, incorrect or contradictory, staff may need to perform additional checks, request information, investigate discrepancies or repeat work. ClaimGuard aims to improve information quality earlier in the process.

### 1.2 Product vision

> Provide a secure, explainable and auditable platform that helps people identify claim-information problems earlier, resolve outstanding issues efficiently and make better-informed decisions.

### 1.3 Objectives

- Improve completeness and quality of claim information.
- Identify document inconsistencies before they create additional processing work.
- Provide transparent claim-readiness assessments.
- Highlight potential integrity risks for authorised human review.
- Improve information-request management and communication.
- Maintain reliable claim activity and decision history.
- Provide operational dashboards for workload visibility.
- Establish a secure foundation for future approved integrations.

### 1.4 Product principles

- **Human accountability:** automated checks and AI do not make final fraud, legal or compensation decisions.
- **Explainability:** every important warning includes a reason and supporting evidence.
- **Privacy by design:** users access only information they are authorised to view.
- **Complementary integration:** do not assume replacement of or access to existing RAF systems.
- **Data accuracy:** extracted information remains unverified until checked.
- **Traceability:** important actions, decisions and status changes are recorded.
- **Progressive delivery:** prototype first, then secure backend functionality in stages.

## 2. Product Scope

### 2.1 In scope

- Authentication and role-based access control.
- Claim creation and management.
- Claimant and lawyer workspaces.
- Secure document upload, metadata and version management.
- Document classification and information extraction.
- Required-document and cross-document checks.
- Claim-readiness scoring and explainable risk alerts.
- Investigator review and notes.
- Information requests, responses, claim messaging and notifications.
- Claim timelines and audit history.
- Role-specific dashboards and operational reports.
- Administrative user and permission management.
- Mock integration interfaces and automated testing.

### 2.2 Out of scope for the initial MVP

- Replacing RAF's existing claims-management systems.
- Connecting to confidential RAF production systems without authorisation.
- Automatically approving or rejecting claims.
- Automatically determining that a person has committed fraud.
- Calculating final legal entitlements or compensation awards.
- Replacing legal advice or professional investigation.
- Processing compensation payments.
- Accessing government identity databases without approved integration.
- Training production AI models on confidential claimant data.
- Guaranteeing processing-time reductions before pilot evaluation.

## 3. Target Users and Personas

### 3.1 Claimant

Submits information, understands outstanding requirements and follows claim progress. Needs secure sign-in, claim creation/viewing, document uploads, readiness results, issue explanations, request responses, messaging and notifications. Must not view another claimant's private information or internal investigative material.

### 3.2 Lawyer or Legal Practitioner

Prepares and manages authorised client claims. Needs client relationships, claim creation, document organisation, readiness review, issue resolution, information-request responses, messaging and task tracking. Access is limited to authorised firms and assigned clients.

### 3.3 RAF Claims Officer

Reviews claims, identifies outstanding information and progresses permitted workflow stages. Needs authorised claim queues, document/readiness review, information requests, communications, notes and claim history.

### 3.4 Risk or Fraud Investigator

Investigates potential inconsistencies and records evidence-based findings. Needs a risk queue, evidence references, document comparison, notes, assignment, escalation and review outcomes. An alert is not a confirmed fraud finding.

### 3.5 Manager

Monitors operational workloads, readiness and outstanding issues through authorised aggregate dashboards and reports. Management access must not automatically expose confidential investigative evidence.

### 3.6 Administrator

Maintains accounts, role assignments, organisation records, selected configuration, system health and relevant audit access. Administrative privileges do not automatically grant access to every claim document.

## 4. Role-Based Access Control

Implement role-based access control (RBAC) together with resource-level authorisation. The table describes the intended baseline; exact permissions require stakeholder and legal validation.

| Capability | Claimant | Lawyer | RAF Officer | Investigator | Manager | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| View claims | Own | Authorised | Assigned/permitted | Risk-authorised | Summary/permitted | Admin scope |
| Create claims | Own | Authorised clients | If permitted | No default | No default | No default |
| Upload documents | Own claims | Authorised claims | If permitted | If permitted | No default | No default |
| View readiness | Own | Authorised | Permitted | Investigation context | Aggregated | Configuration |
| View risk evidence | No default | Limited | Limited | Assigned/permitted | Restricted | Restricted |
| Create requests | No | If permitted | Yes | If permitted | No default | No default |
| Review investigations | No | No default | Limited | Yes | Summary | No automatic access |
| Manage users/roles | No | No | No | No | No default | Yes |

> **Security requirement:** Hiding a button in the frontend is not sufficient. Every sensitive operation must also be authorised server-side or through enforced database policies.

The meanings of the cells above were defined in v1.1 (Change log, answers #6, #24, #25, #35, #36).

## 5. Core Functional Requirements

Priority: P0 = must have for a credible secure MVP; P1 = should have, potentially after the first vertical slice; P2 = could have in a later release.

### 5.1 Authentication and user profiles

- FR-AUTH-01 (P0): supported user types can register or receive an authorised account.
- FR-AUTH-02 (P0): users can authenticate and end sessions securely.
- FR-AUTH-03 (P0): users can view and update permitted profile fields.
- FR-AUTH-04 (P0): permissions are determined by authorised role assignments.
- FR-AUTH-05 (P0): disabled or suspended accounts cannot access protected resources.
- FR-AUTH-06 (P0): provide secure account recovery.

Acceptance checks:

- Unauthenticated users cannot access protected data.
- Users cannot grant themselves privileged roles.
- Role changes follow defined session and authorisation rules.

### 5.2 Claim intake and management

- FR-CLM-01 (P0): authorised users can create a claim using a structured form.
- FR-CLM-02 (P0): each claim receives a unique internal reference.
- FR-CLM-03 (P0): capture the minimum information required by the configured workflow.
- FR-CLM-04 (P0): incomplete claims can be saved as drafts.
- FR-CLM-05 (P0): each claim has a workspace for overview, documents, readiness, requests, messages, timeline and authorised risk information.
- FR-CLM-06 (P0): record claimant, representative, organisation and authorised staff assignments.
- FR-CLM-07 (P1): authorised users can search and filter claims.

Acceptance checks:

- Required fields are validated before relevant transitions.
- Drafts do not imply readiness.
- Claim references are unique.
- Changing a URL identifier does not grant access to another claim.
- Ownership and assignment changes are audited.

### 5.3 Document management

- FR-DOC-01 (P0): authorised users can upload supported document types.
- FR-DOC-02 (P0): documents are stored privately and accessed through authorised mechanisms.
- FR-DOC-03 (P0): record category, filename, uploader, upload date, processing status and claim.
- FR-DOC-04 (P1): updated documents are stored as new versions.
- FR-DOC-05 (P0): validate file types and size; support appropriate malware scanning.
- FR-DOC-06 (P0): distinguish uploaded, processing, processed, failed and review-required states.
- FR-DOC-07 (P1): deletion follows permissions and retention rules.

Acceptance checks:

- Users cannot download documents from unrelated claims.
- Invalid file types are rejected.
- Processing failures are visible.
- Replacement preserves required history.
- Show upload success only after confirmation.

### 5.4 Document intelligence and OCR

- FR-INT-01 (P1): identify or allow selection of document category.
- FR-INT-02 (P1): extract readable text from supported documents.
- FR-INT-03 (P1): identify relevant fields such as names, dates and references where supported.
- FR-INT-04 (P1): record extraction confidence or validation status where available.
- FR-INT-05 (P1): allow authorised correction while preserving original extraction and correction history.
- FR-INT-06 (P0): record failures and provide retry or manual-review paths.

Acceptance checks:

- Start with a mock extraction service and fictional sample documents.
- Treat extracted fields as suggestions until validated.
- Preserve source-document references.

### 5.5 Claim readiness engine

- FR-READY-01 (P0): check configured required document categories.
- FR-READY-02 (P0): identify missing required claim fields.
- FR-READY-03 (P0): run defined validation rules against available claim and document data.
- FR-READY-04 (P0): calculate readiness using documented rules.
- FR-READY-05 (P0): explain contributing issues and how to address them.
- FR-READY-06 (P0): recalculate when relevant claim information or documents change.
- FR-READY-07 (P1): retain previous assessments.

Acceptance checks:

- Identical inputs and rule versions produce identical results.
- Every failed check has an explanation.
- Missing documents are completeness issues, not automatically fraud alerts.
- A score is not a legal opinion or guarantee of claim acceptance.
- Record the rules or assessment version.

### 5.6 Cross-document validation

- FR-VAL-01 (P0): compare selected fields across claim records and extracted document data.
- FR-VAL-02 (P0): flag defined discrepancies such as conflicting identity information or dates.
- FR-VAL-03 (P0): identify source fields/documents supporting each discrepancy.
- FR-VAL-04 (P0): track issues as open, under review, resolved or dismissed with a reason.
- FR-VAL-05 (P1): prevent repeated runs creating uncontrolled duplicate open issues.

Acceptance checks:

- Every discrepancy identifies conflicting values or relevant sources.
- Users can distinguish a genuine discrepancy from extraction error.
- Resolving an issue does not erase history.

### 5.7 Risk and integrity engine

- FR-RISK-01 (P0): create alerts from defined, configurable indicators.
- FR-RISK-02 (P0): support LOW, MEDIUM, HIGH and CRITICAL severity.
- FR-RISK-03 (P0): include explanation and evidence references.
- FR-RISK-04 (P0): support OPEN, UNDER REVIEW, ESCALATED, RESOLVED and DISMISSED states.
- FR-RISK-05 (P0): allow authorised investigator assignment.
- FR-RISK-06 (P0): record outcome, rationale and next action.
- FR-RISK-07 (P0): never automatically label a claim or person fraudulent based solely on an alert.
- FR-RISK-08 (P0): audit changes to severity, assignment, status and outcomes.

Acceptance checks:

- Initial indicators: identity mismatch, date/timeline inconsistency, vehicle inconsistency, claim-reference mismatch, duplicate hashes, similar documents, suspicious metadata where appropriate, and conflicting extracted information.
- An indicator is not proof of wrongdoing; legitimate explanations and technical errors remain possible.

### 5.8 Investigation workspace

- FR-INV-01 (P0): investigators view alerts they are authorised to review.
- FR-INV-02 (P0): display severity, evidence, relevant documents, issues and history.
- FR-INV-03 (P0): allow notes with author and timestamp.
- FR-INV-04 (P0): allow authorised assignment and escalation.
- FR-INV-05 (P0): record outcome, explanation and next action.
- FR-INV-06 (P0): restrict sensitive investigative notes and evidence.

Acceptance checks:

- Investigators can trace alerts to source evidence.
- Notes cannot be silently overwritten.
- Finalised reviews record who completed them and when.
- Closing an alert does not close or reject the claim automatically.

### 5.9 Information requests

- FR-REQ-01 (P0): authorised staff can request missing information or clarification.
- FR-REQ-02 (P0): request includes title, description, recipient, creation date, status and optional due date.
- FR-REQ-03 (P0): intended recipient can submit a response and supporting documents.
- FR-REQ-04 (P0): track pending, responded-to, under-review and closed requests.
- FR-REQ-05 (P0): notify relevant participants of requests and responses.
- FR-REQ-06 (P0): preserve request, response, attachment and status history.

Acceptance checks:

- Only authorised users create requests for a claim.
- Only authorised recipients or representatives respond.
- A response does not automatically resolve a request before review.
- Overdue requests are distinguishable from requests without due dates.

### 5.10 Secure messaging

- FR-MSG-01 (P0): allow claim-linked messages between authorised participants.
- FR-MSG-02 (P0): retain author and timestamp.
- FR-MSG-03 (P1): support authorised, securely stored attachments.
- FR-MSG-04 (P0): prevent access to messages from inaccessible claims.
- FR-MSG-05 (P0): notify recipients of new messages.
- FR-MSG-06 (P0): apply audit and retention policies.

Acceptance checks:

- Messaging must not imply that a message is an official RAF submission or legally effective notice unless specifically validated and implemented.

### 5.11 Claim workflow and timeline

- FR-WF-01 (P0): allow only valid transitions for role and current state.
- FR-WF-02 (P0): record previous/new state, actor, timestamp and required reason.
- FR-WF-03 (P0): display chronological claim activity.
- FR-WF-04 (P0): enforce prerequisites before transitions.
- FR-WF-05 (P1): support authorised withdrawal, escalation and exceptional outcomes.

Acceptance checks:

- A claimant cannot move directly from DRAFT to SETTLEMENT.
- Workflow checks cannot be bypassed through direct API requests.
- Transitions check state, permissions and prerequisites.
- Relevant blocked actions are logged where required.

### 5.12 Notifications

- FR-NOT-01 (P0): in-app notifications for requests, responses, assignments and updates.
- FR-NOT-02 (P0): identify unread notifications.
- FR-NOT-03 (P1): manage permitted notification preferences.
- FR-NOT-04 (P0): avoid unnecessary disclosure of sensitive claim details in external notifications.

### 5.13 Dashboards and analytics

- FR-DASH-01 (P0): provide role-specific dashboards.
- FR-DASH-02 (P0): show relevant claim counts and workflow statuses.
- FR-DASH-03 (P0): identify outstanding requests and unresolved issues.
- FR-DASH-04 (P1): show permitted risk workload summaries.
- FR-DASH-05 (P1): provide readiness, outstanding-work and issue-resolution reports.
- FR-DASH-06 (P0): respect permissions and data boundaries.
- FR-DASH-07 (P0): never present invented statistics as real RAF data.

### 5.14 Administration

- FR-ADM-01 (P0): authorised administrators manage accounts within scope.
- FR-ADM-02 (P0): role assignment is restricted and checked server-side.
- FR-ADM-03 (P1): manage selected workflow settings and validation rules.
- FR-ADM-04 (P0): log administrative actions.
- FR-ADM-05 (P0): administrative access does not automatically grant unrestricted claim or investigation access.

## 6. Main User Journeys

### 6.1 Claimant journey

- Register and sign in.
- Open dashboard and create/open an authorised claim.
- Complete required information and upload supporting documents.
- Platform validates uploads and runs available checks.
- View readiness, outstanding issues and explanations.
- Supply corrections or additional documents.
- System recalculates readiness and progresses the claim when conditions are met.
- Receive status updates or information requests and respond through the workspace.
- Review the updated timeline.

### 6.2 Lawyer journey

- Sign in and open client list.
- Select an authorised client and create a claim.
- Complete fields and upload documents.
- Review validation results and readiness issues.
- Correct issues and prepare claim for submission.
- Track requests, responses and outstanding tasks.

### 6.3 RAF officer journey

- Sign in and open permitted claims queue.
- Select assigned or authorised claim.
- Review overview, documents, readiness and permitted risk alerts.
- Request additional information where necessary.
- Review response and update status where permitted.
- System records action in timeline and audit history.

### 6.4 Investigator journey

- Sign in and open authorised risk queue.
- Filter alerts by severity, status or assignment.
- Review alert explanation and supporting evidence.
- Compare relevant documents and extracted fields.
- Record notes or request further verification.
- Record reasoned outcome and resolve or escalate.
- System preserves review history.

### 6.5 Manager journey

- Sign in and open management dashboard.
- Review authorised aggregate metrics and outstanding work.
- Filter claims by permitted operational categories.
- Review authorised reports and workload patterns.
- Use information for operational planning.

## 7. Product Screens and Navigation

### 7.1 Public pages

- `/` — Landing page
- `/about` — Product overview
- `/how-it-works` — Process explanation
- `/security` — Security principles
- `/login` — Sign-in
- `/register` — Registration

### 7.2 Shared authenticated pages

- `/dashboard`
- `/notifications`
- `/profile`
- `/claims`
- `/claims/new`
- `/claims/:id`

### 7.3 Claim workspace

- Overview
- Documents
- Readiness
- Risk (permission-controlled)
- Messages
- Requests
- Timeline
- Audit (permission-controlled)

### 7.4 Lawyer pages

- `/lawyer/dashboard`
- `/lawyer/clients`
- `/lawyer/clients/:id`
- `/lawyer/claims`
- `/lawyer/tasks`
- `/lawyer/profile`

### 7.5 RAF pages

- `/raf/dashboard`
- `/raf/claims`
- `/raf/claims/:id`
- `/raf/tasks`
- `/raf/reports`

### 7.6 Risk and investigation

- `/raf/risk`
- `/raf/risk/:id`

### 7.7 Management and administration

- `/raf/management`
- `/admin/users`
- `/admin/roles`
- `/admin/settings`
- `/admin/audit`

Routes may change during implementation, but role boundaries and page responsibilities must remain clear. Confidential tabs and data must not be rendered to unauthorised users; backend authorisation remains mandatory.

v1.1 adds `/reset-password` (password recovery) and `/admin/organisations` (organisations and system health). See Change log answer #19.

## 8. Data Model Requirements

The database must support claims, access control, documents, validation, risk review, communication and auditing. These are logical entities and do not necessarily map one-to-one to final tables.

| Entity | Purpose |
| --- | --- |
| Profiles | User profile and account-related information |
| Organisations | Law firms and other authorised organisations |
| Roles, permissions, user roles | Application capabilities and role assignments |
| Claimants and lawyers | Relevant claimant and legal-practitioner records |
| Claims | Main claim records and workflow status |
| Claim parties and assignments | People, organisations and staff linked to claims |
| Documents and versions | Metadata, storage references and version history |
| Document extractions | OCR output and extracted fields |
| Claim checks | Automated completeness and validation results |
| Claim issues | Actionable information-quality issues |
| Risk alerts, evidence, reviews | Potential indicators, supporting evidence and outcomes |
| Information requests and responses | Requests for additional information and replies |
| Messages and attachments | Claim-related communication and secure files |
| Claim timeline | Chronological claim events |
| Notifications | User notifications |
| Audit logs | Important actions and security events |

### 8.1 Important data distinctions

**Claim checks:** results produced by automated rules. **Claim issues:** actionable problems requiring correction or review. **Risk alerts:** potential indicators that may warrant further investigation. A failed completeness check must not automatically create a fraud finding.

### 8.2 Relationships and integrity

- A claim can have multiple documents; a document can have multiple versions.
- A document can produce multiple extracted fields.
- A claim can have multiple checks and issues.
- A risk alert can reference multiple evidence items.
- A claim can have multiple requests, responses, messages and timeline events.
- Users can have multiple authorised roles subject to the access model.
- Enforce primary/foreign keys, unique claim references, required fields, valid statuses, timestamps and referential integrity.
- Do not copy sensitive information unnecessarily into analytics tables or audit records.

## 9. Claim Readiness and Validation Rules

### 9.1 Rules engine

Each rule should define a rule identifier, name and version; applicable claim type; required inputs; validation logic; severity or impact; user-facing explanation; corrective action; workflow-blocking behaviour; and evidence references.

### 9.2 Example rules

- **RULE-001 — Required document missing:** A required category has not been supplied. Result: completeness issue. Action: request or upload the document. Fraud classification: none.
- **RULE-002 — Identity information conflict:** Sources contain different identity values. Result: consistency issue and possibly a risk alert under configured rules. Action: review sources and verify the correct information. Final decision: human review.
- **RULE-003 — Date inconsistency:** Relevant sources conflict under a defined rule. Result: review issue. Action: confirm dates and correct errors.
- **RULE-004 — Duplicate file:** Two files have the same cryptographic hash. Result: potential duplicate-document finding. Action: determine whether duplication is expected.
- **RULE-005 — Extraction uncertainty:** OCR reports low confidence or fails validation. Result: manual verification required. Action: review source document and correct extracted value.

### 9.3 Illustrative readiness score

Possible initial weights: documentation completeness 30%; required claim information 25%; identity consistency 15%; timeline consistency 15%; cross-document consistency 15%. These are illustrative, unvalidated business rules and must be reviewed with stakeholders and test data.

A score must never conceal a blocking issue. Display overall score, blocking issues, warnings requiring review, resolved issues and date of last assessment.

## 10. Non-Functional Requirements

### 10.1 Security

- Enforce authentication and server-side authorisation.
- Use PostgreSQL Row Level Security for applicable user-accessible data.
- Store claim documents privately with controlled access.
- Protect secrets and service credentials from the frontend.
- Validate inputs and control upload types and sizes.
- Record security-sensitive actions.
- Test cross-claim and cross-organisation access boundaries.
- Apply rate limiting and abuse protection where appropriate.

### 10.2 Privacy and data protection

- Assess applicable South African law, including POPIA, before real claimant data is processed.
- Collect only necessary information and limit access by role and purpose.
- Define retention, deletion and incident-response rules.
- Protect document contents and extracted data.
- Assess third-party AI/OCR providers before sharing personal information.
- Record applicable consent or other lawful-processing requirements where needed.

### 10.3 Performance

- Prototype pages should normally load within 3 seconds under agreed test conditions.
- Common database interactions should normally complete within 2 seconds, excluding external processing.
- Document processing must show a visible processing state.
- Large lists should use pagination or controlled loading.
- Validate targets against the chosen hosting environment and representative workloads.

### 10.4 Availability and reliability

- Failed requests produce understandable errors.
- Temporary failures must not cause silent data loss.
- Important operations should be retryable where safe.
- Processing failures are visible.
- Define backups and recovery before production.
- Introduce monitoring before an operational pilot.

### 10.5 Usability and accessibility

- Responsive desktop, tablet and mobile layouts.
- Clear labels and validation messages.
- Communicate statuses through text as well as colour.
- Support keyboard navigation.
- Keep common screen sizes usable.
- Explain technical issues and next steps in plain language.

### 10.6 Maintainability

- Separate UI components from business rules.
- Keep access-control logic centralised and testable.
- Use version-controlled database migrations.
- Separate OCR/AI providers behind service interfaces.
- Document environment variables and deployment.
- Automate critical workflow tests.
- Avoid hardcoding demo data into production logic.

### 10.7 Auditability

- Record claim creation and significant edits.
- Record document uploads and version changes.
- Record validation runs and readiness assessments.
- Record risk-alert changes and investigation outcomes.
- Record requests, responses and status transitions.
- Record role, assignment and administrative changes.
- Capture actor, action, affected resource and timestamp, with reason where required.
- Never log credentials, document contents or unnecessary personal information.

This PRD is not a legal compliance certification. Production use requires appropriate legal, privacy and security review.

## 11. Proposed Technical Architecture

### 11.1 Frontend

React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React and TanStack Query where useful. The frontend renders role-specific interfaces, collects input, displays claim/workflow information and communicates with the backend. The browser is not the security boundary.

### 11.2 Backend and data platform

Supabase: Auth for authentication; PostgreSQL for structured records; RLS for database access; private Storage for documents; Edge Functions or another controlled server-side layer for privileged operations; migrations for schema versioning. Sensitive actions and workflow transitions require trusted server-side logic or carefully enforced database operations.

### 11.3 Document intelligence

Define an OCR service interface that receives an authorised document reference, processes it through an approved provider, returns extracted text and fields, records status/confidence and errors, and supports manual review. Begin with a mock provider.

### 11.4 AI analysis

AI may assist with classification, extraction and summarisation. Outputs are untrusted suggestions until validated. Preserve evidence references and never allow AI to bypass permissions or make final fraud or compensation decisions.

### 11.5 Integration architecture

Future approved integration boundaries may support RAF claims systems, document services, identity providers, notifications and reporting. The prototype must use mock APIs or seeded data and must not claim a production RAF connection unless approved, implemented and tested.

### 11.6 Deployment

Proposed demonstration deployment: GitHub for version control, Vercel for the web frontend and Supabase for authentication, database and storage. Use separate development, preview and production configurations with restricted credentials and monitoring.

## 12. Prototype Requirements

### 12.1 Demo roles

- Claimant, lawyer, RAF officer, risk investigator, manager and administrator.

Demo login or role switching without real authentication must be clearly labelled as simulation and must never protect real data.

### 12.2 Fictional demonstration claims

- High-readiness claim with no major outstanding issues.
- Claim with missing supporting documents.
- Claim with conflicting identity information.
- Claim with an open information request.
- Claim requiring investigator review.

Use fictional names, example.com email addresses and synthetic document content. Do not use real claimant information or real identity numbers.

### 12.3 Required demonstrations

- Open a role-specific dashboard and view a claim.
- Upload or simulate a document upload.
- Run validation checks and display readiness.
- Explain an issue and create a risk alert.
- Review an alert as an investigator.
- Create and respond to an information request.
- Update the claim timeline.
- Show a restricted view for a role without permission.
- Record a meaningful action in audit history.

> **Prototype notice:** "ClaimGuard RAF — Concept Prototype. Not an official RAF system. Demonstration data only."

## 13. MVP Definition and Release Plan

These are the PRD's release stages. The build phases in `IMPLEMENTATION_PLAN.md` Section 13 split this work more finely.

| Phase | Name | Work | Exit |
| --- | --- | --- | --- |
| 1 | Foundation | React/TypeScript/Vite app, Tailwind design system, routing, shared layouts, GitHub workflow, public pages, mock data and role-specific demo views | App builds and main screens are navigable |
| 2 | Authentication and access control | Supabase project, authentication, profiles, roles, organisations, schema/migrations, RLS policies and permission tests | Users access only permitted records |
| 3 | Claims and workflow | Claim creation/editing, references, workspace, controlled transitions and timeline | Authorised users progress claims through permitted states |
| 4 | Documents | Private storage, upload, metadata, file validation, versions and processing states | Authorised file access works without cross-user exposure |
| 5 | Readiness and validation | Required-field/document checks, cross-document validation, readiness calculation, issue resolution and history | System explains why a claim is or is not ready |
| 6 | Risk and investigation | Risk rules, severity, evidence-linked alerts, investigator queue, notes, assignments, outcomes and audit events | Investigator reviews alerts without automated fraud decisions |
| 7 | Requests and communication | Information requests, responses, claim messaging, notifications and history | Participants exchange information through authorised workflows |
| 8 | Dashboards and reporting | Role-specific dashboards, outstanding-work summaries, readiness metrics, risk workload summaries and basic reports | Metrics reflect actual application data |
| 9 | Testing and deployment | Automated tests, security/accessibility reviews, error handling, Vercel preview, production configuration if approved and operational documentation | Critical workflows pass and no critical access-control defects remain |
| 10 | Controlled pilot | Agree scope and stakeholders, use synthetic or authorised data, define baselines, train users, monitor, gather feedback and measure outcomes | Pilot findings inform the next release |

## 14. Testing and Quality Assurance

### 14.1 Unit tests

- Readiness calculations and validation rules.
- Risk severity rules and workflow transitions.
- Input validation and permission-check helpers.
- Duplicate-file detection and notification rules.

### 14.2 Integration tests

- Authentication and profile creation.
- Claim creation and assignment.
- Document upload and retrieval.
- Readiness recalculation.
- Risk-alert creation and review.
- Information requests and responses.
- Messaging, timeline and audit recording.

### 14.3 Security tests

- Claimants cannot access other claimants' claims.
- Lawyers cannot access clients outside their authorised scope.
- Officers cannot access restricted claims without permission.
- Managers cannot automatically access confidential investigation evidence.
- Investigators cannot grant themselves additional permissions.
- Unauthorised users cannot download private documents.
- Workflow checks cannot be bypassed through direct API requests.
- Disabled accounts cannot access protected resources.
- Credentials are never exposed in frontend code.

### 14.4 End-to-end tests

- Create a claim, upload documents, run checks and resolve an issue.
- Detect a simulated inconsistency and review it as an investigator.
- Request information, submit a response and close the request.
- Attempt cross-user claim access and confirm denial.
- Attempt an invalid transition and confirm backend rejection.

## 15. Success Metrics

Establish a baseline before claiming measurable operational improvement.

### 15.1 Product adoption

- Active users by role.
- Claims created or processed through the platform.
- Percentage completing key workflows.
- User-reported usability and clarity.

### 15.2 Claim readiness

- Percentage with required information at initial assessment.
- Average unresolved completeness issues per claim.
- Time to resolve identified issues.
- Percentage reaching the defined ready state.

### 15.3 Information requests

- Average requests per claim.
- Time between request and response.
- Percentage resolved within agreed period.
- Repeated requests for the same underlying issue.

### 15.4 Risk and investigation

- Alerts by category and severity.
- Percentage reviewed by authorised people.
- Time to review an alert.
- Percentage resolved, dismissed or escalated.
- False-positive/negative rates where reliable labelled evaluation data exists.

### 15.5 Reliability and security

- Application error rate.
- Document-processing failure rate.
- Failed workflow transitions.
- Unauthorised access attempts.
- Security incidents by severity.
- Recovery time after service interruption.

A high number of alerts is not automatically evidence of success. Alert usefulness, accuracy and review burden must also be measured.

### 15.6 Pilot evaluation

Compare baseline and post-deployment results using a defined evaluation method. Claims of reduced delays, improved readiness or reduced workload must be supported by observed evidence.

## 16. Risks, Dependencies and Assumptions

### 16.1 Product risks

| Risk | Mitigation |
| --- | --- |
| Existing RAF systems already cover some functionality. | Position ClaimGuard as complementary and validate the specific gap with stakeholders. |
| Automated checks produce false alerts. | Use explainable rules, evidence, confidence where available and human review. |
| Sensitive information is exposed. | Apply RLS, server-side authorisation, private storage, access testing and privacy controls. |
| OCR extracts incorrect information. | Retain source references, expose uncertainty and provide manual correction. |
| Scope becomes too large. | Build a narrow vertical slice and expand only after core workflows work. |
| External integrations are unavailable. | Use mock interfaces and service boundaries before integration. |
| Product is mistaken for official RAF service. | Clearly identify the prototype and avoid unauthorised RAF branding. |

### 16.2 Dependencies

- Functioning Supabase environment.
- Approved database and storage design.
- Authentication and permission configuration.
- Defined claim fields and document categories.
- Agreed workflow and validation rules.
- Synthetic test documents.
- Testing and deployment environments.
- Approved OCR/AI services if introduced.
- Stakeholder validation before operational use.
- Formal approval for production integration.

### 16.3 Assumptions requiring validation

- A valuable information-quality gap exists for ClaimGuard to address.
- Users benefit from explainable readiness assessments.
- The proposed workflow aligns with actual user responsibilities.
- Existing systems can expose information through approved methods if integration is pursued.
- Proposed risk indicators are useful and legally appropriate.
- Selected technology can meet final security, privacy and hosting requirements.

These are product hypotheses, not established facts. Stakeholder discovery and pilot evidence must determine whether they hold.

## 17. Acceptance Criteria for the MVP

- [ ] Users can sign in through the implemented authentication flow.
- [ ] Role-specific dashboards display appropriate information.
- [ ] Authorised users can create and view claims.
- [ ] Claims follow controlled workflow transitions.
- [ ] Supported documents upload to private storage.
- [ ] Document metadata and processing status are recorded.
- [ ] Completeness and validation checks run.
- [ ] Readiness scores have documented calculation rules.
- [ ] Readiness issues include explanations and corrective actions.
- [ ] Risk alerts link to supporting evidence.
- [ ] Investigators can record review outcomes.
- [ ] Information requests can be created and answered.
- [ ] Claim messaging respects access permissions.
- [ ] Important actions appear in timeline and audit history.
- [ ] Database policies prevent unauthorised cross-claim access.
- [ ] Automated tests cover critical workflows and permissions.
- [ ] Loading, empty, success and error states are implemented.
- [ ] Demo data is fictional and prototype notice is visible.
- [ ] No production integration is claimed unless implemented and authorised.

## 18. Final Product Positioning

ClaimGuard RAF should be presented as a claim intelligence and assurance platform that improves the quality of information around the claims process. Its value does not depend on replacing RAF's existing claims-management systems. It adds structured validation, readiness assessments, evidence-linked risk alerts, information-request management and an auditable human-review process.

> Claim information → Document intelligence → Validation → Readiness → Risk review → Human decision → Resolution and audit.

This creates a coherent process in which problems are identified, explained, assigned and resolved instead of remaining scattered across documents and communications. Automated analysis assists people; final investigative, legal and compensation decisions remain with authorised human decision-makers.

**Final vision statement**

> ClaimGuard RAF aims to make claims information easier to validate, outstanding issues easier to resolve and risk evidence easier to review, while supporting a more transparent and accountable claims workflow.

The recommended next step is to validate the highest-priority requirements, complete the prototype and build the MVP through small, testable stages. Any operational deployment should follow stakeholder approval, privacy and security assessment, and a controlled pilot.

---

## Change log

| Version | Date | What changed |
| --- | --- | --- |
| 1.1 | 4 November 2026 | Adopted the 42 answers below (from `IMPLEMENTATION_PLAN.md` Section 18). Where an answer and the v1.0 text above differ, the answer applies. |
| 1.0 | 2 November 2026 | First version. |

### v1.1 answers

| # | Topic | Answer |
| --- | --- | --- |
| 1 | Test, lint and secret-scan tools | Vitest, React Testing Library + jsdom, pgTAP (`supabase test db`), Playwright + @axe-core/playwright, ESLint, `tsc`, gitleaks. |
| 2 | IDs | F# = Section 5 area; US# = one FR requirement; S# = design pack screen numbers (S01–S46); M1–M3 = the three modals; BR# = business rules; edge cases = the implementation plan's Section 15 list. |
| 3 | Fields and limits | Columns and length limits as in the implementation plan 8.1. Required to leave Draft: claimant, accident date, accident province, claimant role, accident description. Organisation types: law_firm, raf, other. Contact methods: email, phone. Party types: claimant, legal_representative, other_driver, other_party. Claimant ID numbers are stored (masked in the UI); demo values are synthetic. Passwords: at least 8 characters with a letter and a number. |
| 4 | Required document categories | Identity document, Accident report, Hospital medical report and Serious injury assessment are required; Proof of earnings is optional. |
| 5 | Workflow transitions | The implementation plan 8.3 matrix, including withdrawn, escalated and rejected (P1). A reason is required on every transition. |
| 6 | Access-table meanings | Own = the claim's claimant is linked to the user. Authorised (lawyer) = the user's firm represents the claim and the user is the assigned lawyer. Assigned/permitted (officer) = an active assignment or the `claims.view` permission. Risk-authorised = an investigator assignment or an alert assigned to the user. If permitted = granted in `role_permissions`. "Limited" risk evidence = the neutral "Under review" flag only. The seed grants `claims.assign` and `audit.view` to RAF officers and no other "If permitted" capability. Extra permission keys `claims.assign`, `audit.view`, `extractions.correct`, `reports.export`, `settings.manage`. |
| 7 | Staff assignment and teams | RAF officers with `claims.assign`, and administrators, assign staff. No teams in v1; "Team queue" shows every claim the officer may view. |
| 8 | Legal practitioner sign-up | Self-registered legal practitioners stay pending until an administrator assigns the lawyer role. |
| 9 | Demo login | One-click role buttons on the sign-in page call a server function that signs in the fictional demo account. Enabled only when `DEMO_LOGIN_ENABLED` is true; hidden in production. |
| 10 | Readiness scoring | Category score = passed checks ÷ applicable checks × 100, weighted 30/25/15/15/15. Documentation = RULE-001; required information = required-field checks; identity = RULE-002; timeline = RULE-003; cross-document = RULE-004 and RULE-005. RULE-001 and missing required fields are blocking; RULE-002 to RULE-005 are warnings. |
| 11 | Risk indicators | Only RULE-002 (identity mismatch, MEDIUM), RULE-003 (date inconsistency, HIGH) and RULE-004 (duplicate hash, LOW) create alerts, when configured. The other five 5.7 indicators are deferred. |
| 12 | Mock extraction | The mock extraction service is built with documents; the document viewer comes later. |
| 13 | RULE-005 threshold | Confidence below 0.70. |
| 14 | Files | PDF, JPG and PNG up to 10 MB. Malware scanning uses a scanner interface with a mock scanner only. |
| 15 | Retention and deletion | No hard delete. The uploader may soft-delete a document before the claim is Submitted. Messages and user accounts are never deleted in the prototype. |
| 16 | Tasks | Built from open requests and unresolved issues only. No stored or manual tasks, no "New task" button, no client Notes tab. |
| 17 | Message participants | The claimant (if they have an account), authorised lawyer(s) and assigned officer(s). |
| 18 | Email notifications | In-app only. Email toggles are not shown. |
| 19 | Routes | Password recovery = `/reset-password`. Landing pages: investigator → `/raf/risk`, administrator → `/admin/users`. `/lawyer/claims`, `/lawyer/profile` and `/raf/claims/:id` reuse the claims list, profile and claim workspace screens. Organisations and system health = `/admin/organisations`. Reports are for RAF officers only. Sidebar items without a route are removed. |
| 20 | Wording | All errors, empty states, toasts and notifications use the message catalogue TXT-1 … TXT-64 in the implementation plan Section 10. |
| 21 | Rate limiting | Supabase Auth limits for sign-in, sign-up and reset, plus at most 10 document uploads per minute per user. |
| 22 | Performance test conditions | Vercel preview with hosted Supabase and seed data, desktop Chrome, first cold load excluded. |
| 23 | Role changes and several roles | Permissions are read from the database on every request; the UI refreshes on the next navigation. The first role in the order claimant, lawyer, RAF officer, investigator, manager, administrator decides the landing page. |
| 24 | Manager summary data | Reference, status, readiness score, counts and dates; no names or contact details. |
| 25 | Admin scope | The same summary fields as the manager. |
| 26 | Editing and correcting | The claimant (own) and authorised lawyer edit claim details before Submitted. The lawyer and assigned officer resolve or dismiss issues and correct extracted fields. |
| 27 | Requests | The request creator or the assigned officer reviews and closes requests. Recipients are the claimant or the legal representative only. |
| 28 | System health | Browser checks of Auth, Database, Storage, Edge Functions and the mock OCR provider, labelled demo. |
| 29 | Designs | Stitch project https://stitch.withgoogle.com/projects/3126694362497483814, exported to `docs/designs/`. |
| 30 | Repository | https://github.com/mandlenkosii/claimguard-raf |
| 31 | Reference formats | `CG-YYYY-NNNNNN` for claims and `RA-YYYY-NNNNN` for alerts; numbering restarts each year. |
| 32 | Role permission editing | View only at first; editing with a reason comes with FR-ADM-03. |
| 33 | Hosting | The project owner creates the hosted Supabase and Vercel projects. Preview deployment only; production is deferred. |
| 34 | Claim types | None in v1. |
| 35 | Claim audit tab | Administrators, and RAF officers with `audit.view` on claims they can access. |
| 36 | Officers and investigations | Officers see no investigation notes; only the alert status flag and the final outcome label. |
| 37 | Notification events | Claim status changes, assignment changes, new requests, responses and messages only. |
| 38 | Responsive screens | Screens without mobile or tablet designs are still responsive, using the same rules. |
| 39 | Missing design details | Colours and sizes come from the exported Stitch screens; fonts load from Google Fonts; charts are SVG components; PDFs use the browser's viewer, with highlight boxes on images only. |
| 40 | Saved views | Not in v1. |
| 41 | Seed data | CG-2026-000142 = Sipho Ndlovu (identity conflict). Thandiwe Mokoena owns the missing-documents claim. Staff: Demo RAF Officer, Ayesha Patel (investigator), Demo Manager, Demo Administrator. Second firm: Demo Firm B Attorneys. |
| 42 | Export formats | CSV only. |
