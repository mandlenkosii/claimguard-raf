import {
  ArrowRight,
  CalendarX2,
  ClipboardCheck,
  Copy,
  FileQuestion,
  FileSearch,
  FileWarning,
  Gavel,
  Gauge,
  History,
  Scale,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Chip, DarkCallout, PublicSection } from './PublicSection';

// S01 has no exported design (Section 18 #44): built from T-S1-1's section list in the S02–S04 style.
// All wording comes from the PRD (Sections 1, 3, 18).

const PROBLEMS = [
  { icon: FileQuestion, title: 'Missing documents', text: 'Required documents that have not been supplied.' },
  { icon: UserCheck, title: 'Inconsistent details', text: 'Claimant details that differ between sources.' },
  { icon: CalendarX2, title: 'Conflicting dates', text: 'Dates that do not agree across documents.' },
  { icon: Copy, title: 'Duplicate files', text: 'The same file uploaded more than once.' },
  { icon: FileWarning, title: 'Incomplete information', text: 'Supporting information that is still outstanding.' },
];

const FLOW = [
  'Claim information',
  'Document intelligence',
  'Validation',
  'Readiness',
  'Risk review',
  'Human decision',
  'Resolution and audit',
];

const ROLES = [
  { icon: UserRound, title: 'Claimant', text: 'Submits information, sees what is outstanding and follows claim progress.' },
  { icon: Scale, title: 'Legal practitioner', text: 'Prepares and manages claims for authorised clients of their firm.' },
  { icon: ClipboardCheck, title: 'RAF claims officer', text: 'Reviews claims, requests missing information and progresses permitted stages.' },
  { icon: ShieldAlert, title: 'Risk investigator', text: 'Reviews alerts and records evidence-based findings. An alert is not a fraud finding.' },
  { icon: Gauge, title: 'Manager', text: 'Monitors workloads, readiness and outstanding issues through aggregate dashboards.' },
  { icon: UserCog, title: 'Administrator', text: 'Maintains accounts, roles, organisations and selected configuration.' },
];

const PRINCIPLES = [
  { title: 'Human accountability', text: 'Automated checks and AI do not make final fraud, legal or compensation decisions.' },
  { title: 'Explainability', text: 'Every important warning includes a reason and supporting evidence.' },
  { title: 'Privacy by design', text: 'Users access only information they are authorised to view.' },
  { title: 'Complementary integration', text: 'Do not assume replacement of or access to existing RAF systems.' },
  { title: 'Data accuracy', text: 'Extracted information remains unverified until checked.' },
  { title: 'Traceability', text: 'Important actions, decisions and status changes are recorded.' },
  { title: 'Progressive delivery', text: 'Prototype first, then secure backend functionality in stages.' },
];

function HeroExample() {
  return (
    <div aria-hidden className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-mono text-primary">CG-2026-000142</span>
        <span className="rounded-chip bg-info-tint px-2 py-0.5 text-small font-semibold text-info">Validation</span>
      </div>
      <p className="mt-1 text-small text-text-secondary">Fictional example</p>
      <div className="mt-4 space-y-3">
        <div className="rounded-card border-l-4 border-error bg-error-tint p-3">
          <p className="text-small font-semibold text-error">RULE-001 · Blocking</p>
          <p className="text-body font-medium text-text">Required document missing</p>
          <p className="text-small text-text-secondary">Action: request or upload the document.</p>
        </div>
        <div className="rounded-card border-l-4 border-warning bg-warning-tint p-3">
          <p className="text-small font-semibold text-warning">RULE-002 · Warning</p>
          <p className="text-body font-medium text-text">Identity information conflict</p>
          <p className="text-small text-text-secondary">Action: review sources and verify the correct information.</p>
        </div>
      </div>
    </div>
  );
}

/** S01 Landing page. */
export function LandingPage() {
  return (
    <>
      <section data-testid="hero" className="mx-auto grid max-w-content items-center gap-10 px-6 py-14 md:grid-cols-[3fr_2fr]">
        <div>
          <Chip icon={<ShieldCheck aria-hidden className="size-icon-sm text-accent" />}>Claim Intelligence &amp; Assurance Platform</Chip>
          <h1 className="mt-4 text-h1 text-primary">
            Catch claim problems early. Resolve them with evidence.
          </h1>
          <p className="mt-4 max-w-xl text-body text-text-secondary">
            A secure, explainable and auditable platform that helps people identify claim-information problems earlier,
            resolve outstanding issues efficiently and make better-informed decisions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/register">
              Register
              <ArrowRight aria-hidden className="size-icon-sm" />
            </ButtonLink>
            <ButtonLink to="/how-it-works" variant="secondary">
              How it works
            </ButtonLink>
          </div>
        </div>
        <HeroExample />
      </section>

      <PublicSection data-testid="problem-strip" eyebrow="The problem" title="Problems found earlier" headingId="problems-heading">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PROBLEMS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-card border border-border bg-surface p-4">
              <Icon aria-hidden className="size-icon text-accent" />
              <p className="mt-2 text-body font-semibold text-primary">{title}</p>
              <p className="mt-1 text-small text-text-secondary">{text}</p>
            </li>
          ))}
        </ul>
      </PublicSection>

      <PublicSection data-testid="flow" eyebrow="How it fits together" title="From claim information to resolution" headingId="flow-heading">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {FLOW.map((step, index) => (
            <li key={step} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 lg:flex-col lg:items-start">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-small font-semibold text-text-on-dark">
                {index + 1}
              </span>
              <span className="text-body font-medium text-primary">{step}</span>
            </li>
          ))}
        </ol>
      </PublicSection>

      <PublicSection data-testid="roles" eyebrow="Who it is for" title="Built for six roles" headingId="roles-heading">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, text }) => (
            <article key={title} data-testid="role-card" className="rounded-card border border-border bg-surface p-5 shadow-card">
              <span aria-hidden className="flex size-10 items-center justify-center rounded-card bg-surface-muted text-accent">
                <Icon className="size-icon" />
              </span>
              <h3 className="mt-3 text-h3 text-primary">{title}</h3>
              <p className="mt-1 text-body text-text-secondary">{text}</p>
            </article>
          ))}
        </div>
      </PublicSection>

      <PublicSection data-testid="principles" eyebrow="Principles" title="Product principles" headingId="principles-heading">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((principle) => (
            <li key={principle.title} className="rounded-card border border-border bg-surface p-5">
              <p className="text-body font-semibold text-primary">{principle.title}</p>
              <p className="mt-1 text-small text-text-secondary">{principle.text}</p>
            </li>
          ))}
        </ul>
      </PublicSection>

      <PublicSection data-testid="human-decision">
        <DarkCallout eyebrow="Human decision" icon={<Gavel className="size-icon" />}>
          <p className="text-h3">People make the final decisions.</p>
          <p className="mt-2 max-w-3xl text-body text-text-on-dark-muted">
            Automated analysis assists people; final investigative, legal and compensation decisions remain with authorised
            human decision-makers. ClaimGuard RAF complements existing RAF systems and never decides fraud, legal entitlement
            or compensation.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-small text-text-on-dark-muted">
            <span className="inline-flex items-center gap-1">
              <FileSearch aria-hidden className="size-icon-sm" /> Every warning explained
            </span>
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden className="size-icon-sm" /> Reviewed by people
            </span>
            <span className="inline-flex items-center gap-1">
              <History aria-hidden className="size-icon-sm" /> Recorded in the audit history
            </span>
          </div>
        </DarkCallout>
      </PublicSection>
    </>
  );
}
