# ClaimGuard RAF

> **ClaimGuard RAF — Concept Prototype. Not an official RAF system. Demonstration data only.**

ClaimGuard RAF is a claim intelligence and assurance platform. It helps claimants, lawyers and Road Accident Fund staff find and resolve problems with claim information earlier. All data in this project is fictional.

## What it does

| Role | What they can do |
| --- | --- |
| Claimant | Create a claim, upload documents, see readiness, answer information requests and message their representatives |
| Lawyer | Manage clients and claims for their firm, resolve issues and work through outstanding tasks |
| RAF officer | Work the claims queue, send information requests, review responses and move claims through the workflow |
| Investigator | Review risk alerts with their evidence, keep append-only notes and record outcomes |
| Manager | See totals only, with no claimant details or evidence |
| Administrator | Manage users, roles and organisations and read the audit log, without access to claim content |

Main features:

- A readiness score from five weighted categories, with rules RULE-001 to RULE-005 explaining every problem found
- Private document storage, with extraction by a mock OCR provider
- Risk alerts that are indicators for human review, and never a finding of fraud
- A server-enforced claim workflow, row-level security on every table and an append-only audit log

## Technology

React, TypeScript and Vite on the front end. Supabase provides the database, sign-in, file storage and Edge Functions. The site is hosted on Vercel.

## Run it on your computer

You need Node.js 22 or later and a Supabase project. To run the Edge Function type check you also need Deno, and to run the secret scan you need gitleaks.

```bash
git clone https://github.com/mandlenkosii/claimguard-raf.git
cd claimguard-raf
npm install
cp .env.example .env     # then fill in the values described below
npm run db:reset         # WARNING: erases the Supabase project in .env, then loads the demo data
npm run functions:deploy
npm run dev              # opens on http://localhost:5173
```

## Environment variables

Keep real values in `.env`, which Git ignores. Never commit them.

| Variable | Used by | What it is |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | App and Vercel | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | App and Vercel | The publishable (anon) key, which is safe in the browser |
| `VITE_APP_ENV` | App and Vercel | `development` or `preview`. Set to `production` to hide the demo sign-in buttons |
| `SUPABASE_SERVICE_ROLE_KEY` | Server scripts and tests only | The secret key. Never put it in Vercel or any `VITE_` variable |
| `SUPABASE_DB_URL` | Database scripts and tests | The Postgres connection string |
| `SUPABASE_ACCESS_TOKEN` | Function deployment | A Supabase personal access token |
| `DEMO_USER_PASSWORD` | Demo data and tests | The password given to every demo account |
| `DEMO_LOGIN_ENABLED` | Edge Functions | `true` turns on the demo sign-in buttons |
| `OCR_PROVIDER` | Edge Functions | `mock` |

Vercel needs only the three `VITE_` variables.

## Test logins

All accounts are fictional. On the sign-in page, the **Demo accounts** buttons sign you in without a password. To sign in by hand, use the email below with the `DEMO_USER_PASSWORD` value from `.env`.

| Role | Email | Name |
| --- | --- | --- |
| Claimant | `claimant.demo@example.com` | Thandiwe Mokoena |
| Claimant (second) | `claimant2.demo@example.com` | Sipho Ndlovu |
| Lawyer | `lawyer.demo@example.com` | Lindiwe Nkosi |
| Lawyer (second firm) | `lawyer2.demo@example.com` | Ruan Botha |
| RAF officer | `officer.demo@example.com` | Demo RAF Officer |
| Investigator | `investigator.demo@example.com` | Ayesha Patel |
| Manager | `manager.demo@example.com` | Demo Manager |
| Administrator | `admin.demo@example.com` | Demo Administrator |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app locally |
| `npm run build` | Type-checks and builds for production |
| `npm run preview` | Serves the production build |
| `npm run db:push` | Applies new database migrations |
| `npm run db:reset` | **Erases the project in `.env`** and reloads the demo data |
| `npm run functions:deploy` | Sets function secrets and deploys the Edge Functions |
| `npm run lint` | Checks code style and design-token rules |
| `npm run typecheck` | Type-checks the app and the Edge Functions |
| `npm run scan:secrets` | Scans the code and Git history for secrets |
| `npm run test:unit` | Runs unit and component tests |
| `npm run test:db` | Runs the database tests |
| `npm run test:integration` | Runs integration tests against Supabase |
| `npm run test:e2e` | Runs the browser tests |
| `npm run check` | Runs lint, type checks, the secret scan, and unit, database and integration tests |

Integration and browser tests create records in the Supabase project. Run `npm run db:reset` afterwards to return to clean demo data.

To run the browser tests against a deployed site:

```bash
PLAYWRIGHT_BASE_URL=https://your-site.vercel.app npx playwright test tests/e2e/release.spec.ts
```

## Deploying

1. Import this repository into Vercel. `vercel.json` already sets the build and page routing.
2. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_APP_ENV=preview`.
3. In Supabase under **Authentication > URL Configuration**, add the Vercel address as the Site URL and as a redirect URL.

To share the prototype, send people the Vercel address and point them to the **Demo accounts** buttons.

## Demo script

| Step | Sign in as | Do this |
| --- | --- | --- |
| 1. Open a dashboard and view a claim | Lawyer | Open the dashboard, then claim CG-2026-000142 |
| 2. Upload a document | Claimant | Open CG-2026-000141, go to Documents and upload a PDF as the hospital medical report. Include `IDENTITY_CONFLICT` in the file name to simulate a name mismatch |
| 3. Run checks and show readiness | Claimant | Open Readiness on the same claim. The score has updated and the missing-document issue is resolved |
| 4. Explain an issue and show a risk alert | Lawyer | Open Readiness on CG-2026-000142 and read the name comparison. A risk alert is raised when checks find a new conflict |
| 5. Review an alert | Investigator | Open RA-2026-00031, compare 12 Mar 2026 with 21 Mar 2026, add a note and record an outcome. The claim status does not change |
| 6. Request information and respond | RAF officer, then the recipient | On an assigned claim open Requests, send a new request, respond as its recipient, then review and close it as the officer |
| 7. Update the claim timeline | Lawyer | Use Change status on a claim, then open Timeline |
| 8. Show a restricted view | Manager | Open a claim. Only the summary appears, with no Risk or Audit tabs |
| 9. See it in the audit history | Administrator | Open Audit log and find the actions you just performed |

## Known limits of this prototype

- Document extraction uses a mock provider, and there is no connection to any RAF system
- Mobile screens have no separate design file, and wide tables scroll within their own box on tablets
- Features marked "Should" in the plan, such as document versions and report exports, are planned after the first release

## Project documents

- `docs/PRD.md`: product requirements
- `IMPLEMENTATION_PLAN.md`: build plan, decisions (Section 18) and progress log (Section 17)
- `docs/designs/`: screen designs

