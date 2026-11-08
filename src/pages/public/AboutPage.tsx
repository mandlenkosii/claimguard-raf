import {
  BarChart3,
  Check,
  CircleCheck,
  FileCheck2,
  Flag,
  Gavel,
  History,
  Lightbulb,
  MessagesSquare,
  Play,
  ScanSearch,
  ShieldCheck,
  Ban,
  X,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Chip, DarkCallout, Eyebrow, PublicSection } from './PublicSection';

// S02 layout and order from the design; wording from PRD 1.2, 1.3, 2.2 and 18 (Section 18 #45).

const OBJECTIVES = [
  { icon: FileCheck2, title: 'Completeness', text: 'Improve completeness and quality of claim information.' },
  { icon: ScanSearch, title: 'Early inconsistency detection', text: 'Identify document inconsistencies before they create additional processing work.' },
  { icon: CircleCheck, title: 'Transparent readiness', text: 'Provide transparent claim-readiness assessments.' },
  { icon: Flag, title: 'Human review flags', text: 'Highlight potential integrity risks for authorised human review.' },
  { icon: MessagesSquare, title: 'Streamlined requests', text: 'Improve information-request management and communication.' },
  { icon: History, title: 'Reliable history', text: 'Maintain reliable claim activity and decision history.' },
  { icon: BarChart3, title: 'Operational dashboards', text: 'Provide operational dashboards for workload visibility.' },
  { icon: ShieldCheck, title: 'Secure foundation', text: 'Establish a secure foundation for future approved integrations.' },
];

const DOES = [
  { title: 'Checks document completeness', text: 'Checks configured required document categories and required claim fields.' },
  { title: 'Highlights cross-document discrepancies', text: 'Compares selected fields across claim records and document data, and shows the sources.' },
  { title: 'Explains readiness', text: 'Calculates readiness using documented rules and explains how to address each issue.' },
  { title: 'Supports information requests', text: 'Tracks requests, responses and messages between authorised participants.' },
  { title: 'Keeps an audit history', text: 'Records important actions, decisions and status changes.' },
];

const DOES_NOT = [
  { title: 'Does not approve or reject claims', text: 'Claim decisions stay with authorised Road Accident Fund officers.' },
  { title: 'Does not decide fraud', text: 'Risk alerts are indicators for human review. It never labels a claim or person fraudulent.' },
  { title: 'Does not calculate compensation', text: 'Final legal entitlements and compensation awards are outside its scope.' },
  { title: 'Does not replace RAF systems', text: 'It complements existing RAF claims-management and document-processing systems.' },
  { title: 'Does not access government databases', text: 'It does not access government identity databases without approved integration.' },
];

/** S02 About. */
export function AboutPage() {
  return (
    <>
      <PublicSection className="pb-6">
        <Chip>Public information</Chip>
        <h1 className="mt-4 text-h1 text-primary">About ClaimGuard RAF</h1>
        <p className="mt-2 max-w-3xl text-body text-text-secondary">
          A claim intelligence and assurance platform that improves the quality of information around the Road Accident Fund
          claims process. It complements existing RAF systems and does not replace them.
        </p>
      </PublicSection>

      <PublicSection className="py-4">
        <div data-testid="vision-card" className="rounded-card border border-border border-t-4 border-t-accent bg-surface p-8 shadow-card">
          <span className="inline-flex items-center gap-1 rounded-chip bg-surface-muted px-2 py-0.5 text-label uppercase text-accent">
            <Lightbulb aria-hidden className="size-icon-sm" />
            Our vision
          </span>
          <blockquote className="mt-4 max-w-4xl text-h2 text-primary">
            “Provide a secure, explainable and auditable platform that helps people identify claim-information problems earlier,
            resolve outstanding issues efficiently and make better-informed decisions.”
          </blockquote>
          <p className="mt-4 max-w-4xl text-body text-text-secondary">
            Claims may contain numerous documents, multiple parties, supporting evidence and several assessment stages. When
            information is missing, incorrect or contradictory, staff may need to perform additional checks, request information,
            investigate discrepancies or repeat work. ClaimGuard aims to improve information quality earlier in the process.
          </p>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Objectives"
        title="Core objectives"
        headingId="objectives-heading"
        intro="What ClaimGuard RAF sets out to improve across the claims process."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OBJECTIVES.map(({ icon: Icon, title, text }, index) => (
            <article key={title} data-testid="objective-card" className="rounded-card border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-mono text-accent">{String(index + 1).padStart(2, '0')}</span>
                <span aria-hidden className="flex size-8 items-center justify-center rounded-input bg-surface-muted text-primary">
                  <Icon className="size-icon-sm" />
                </span>
              </div>
              <h3 className="mt-3 text-h3 text-primary">{title}</h3>
              <p className="mt-1 text-small text-text-secondary">{text}</p>
            </article>
          ))}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Boundaries" title="System boundary" headingId="boundary-heading">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex size-10 items-center justify-center rounded-input bg-accent text-text-on-dark">
                <Check className="size-icon" />
              </span>
              <h3 className="text-h3 text-primary">What ClaimGuard does</h3>
            </div>
            <ul className="mt-4 space-y-4">
              {DOES.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <Check aria-hidden className="mt-0.5 size-icon-sm shrink-0 text-success" />
                  <div>
                    <p className="text-body font-medium text-text">{item.title}</p>
                    <p className="text-small text-text-secondary">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div data-testid="does-not-do" className="rounded-card border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex size-10 items-center justify-center rounded-input bg-primary text-text-on-dark">
                <Ban className="size-icon" />
              </span>
              <h3 className="text-h3 text-primary">What ClaimGuard does not do</h3>
            </div>
            <ul className="mt-4 space-y-4">
              {DOES_NOT.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <X aria-hidden className="mt-0.5 size-icon-sm shrink-0 text-error" />
                  <div>
                    <p className="text-body font-medium text-text">{item.title}</p>
                    <p className="text-small text-text-secondary">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PublicSection>

      <PublicSection className="py-4">
        <DarkCallout eyebrow="Governance principle" icon={<Gavel className="size-icon" />}>
          <p className="text-h3">“Automated analysis assists people; final investigative, legal and compensation decisions remain with authorised human decision-makers.”</p>
        </DarkCallout>
      </PublicSection>

      <section className="mt-6 bg-surface-muted">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-6 px-6 py-10">
          <div>
            <Eyebrow>Demonstration</Eyebrow>
            <h2 className="mt-1 text-h2 text-primary">Explore the demo console</h2>
            <p className="mt-1 max-w-xl text-body text-text-secondary">
              See how ClaimGuard RAF organises claim information and explains issues, using fictional demonstration data only.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/login" icon={<Play aria-hidden className="size-icon-sm" />}>
              Launch demo console
            </ButtonLink>
            <ButtonLink to="/how-it-works" variant="secondary">
              View how it works
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
