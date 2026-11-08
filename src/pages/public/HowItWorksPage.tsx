import { CircleAlert, CircleCheck, FileText, Gavel, Lock, Scale, ShieldAlert, UserCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { Chip, DarkCallout, PublicSection } from './PublicSection';

// S03 layout and order from the design; wording from PRD 5, 6, 9 and 18 (Section 18 #45).
// The right-hand panels are illustrations with fictional sample data.

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div aria-hidden className="rounded-card border border-border bg-surface p-5 shadow-card">
      <p className="text-label uppercase text-text-secondary">{label}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'error' | 'warning' }) {
  const tones = {
    default: 'border-border bg-surface-muted',
    error: 'border-error bg-error-tint',
    warning: 'border-warning bg-warning-tint',
  };
  return <div className={`flex items-center justify-between gap-3 rounded-input border p-3 text-small ${tones[tone]}`}>{children}</div>;
}

const STEPS: Array<{ title: string; text: string; note?: string; panel: ReactNode }> = [
  {
    title: 'Create a claim',
    text: 'A claimant or legal practitioner creates a claim using a structured form. Each claim receives a unique internal reference, and incomplete claims can be saved as drafts.',
    note: 'Drafts never count as ready.',
    panel: (
      <Panel label="Example claim (fictional)">
        <Row>
          <span className="font-mono text-mono text-primary">CG-2026-000142</span>
          <span className="rounded-chip bg-surface px-2 py-0.5 font-semibold text-text-secondary">Draft</span>
        </Row>
        <Row>
          <span className="text-text-secondary">Accident province</span>
          <span className="font-medium text-text">Gauteng</span>
        </Row>
        <Row>
          <span className="text-text-secondary">Claimant role</span>
          <span className="font-medium text-text">Pedestrian</span>
        </Row>
      </Panel>
    ),
  },
  {
    title: 'Upload documents',
    text: 'Supporting documents are stored privately. File type and size are checked, and every document shows its processing state.',
    note: 'PDF, JPG and PNG files up to 10 MB.',
    panel: (
      <Panel label="Required documents (fictional)">
        {[
          ['Identity document (SAMPLE).pdf', 'Processed'],
          ['Accident report (SAMPLE).pdf', 'Processing'],
          ['Hospital medical report (SAMPLE).pdf', 'Uploaded'],
        ].map(([name, state]) => (
          <Row key={name}>
            <span className="inline-flex items-center gap-2 text-text">
              <FileText className="size-icon-sm text-text-secondary" />
              {name}
            </span>
            <span className="rounded-chip bg-surface px-2 py-0.5 font-semibold text-text-secondary">{state}</span>
          </Row>
        ))}
      </Panel>
    ),
  },
  {
    title: 'Automated checks',
    text: 'Defined rules check required documents and fields and compare information across documents. Every failed check comes with an explanation.',
    panel: (
      <Panel label="Rules">
        {[
          ['RULE-001', 'Required document missing'],
          ['RULE-002', 'Identity information conflict'],
          ['RULE-003', 'Date inconsistency'],
          ['RULE-004', 'Duplicate file'],
          ['RULE-005', 'Extraction uncertainty'],
        ].map(([id, name]) => (
          <Row key={id}>
            <span className="font-mono text-mono text-accent">{id}</span>
            <span className="flex-1 text-text">{name}</span>
          </Row>
        ))}
      </Panel>
    ),
  },
  {
    title: 'Readiness score',
    text: 'Readiness is calculated from documented, weighted rules. A score never hides a blocking issue: blocking issues, warnings, resolved issues and the date of the last assessment are always shown.',
    note: 'A score is not a legal opinion or a guarantee of claim acceptance.',
    panel: (
      <Panel label="Example (fictional)">
        <Row tone="error">
          <span className="inline-flex items-center gap-2 font-semibold text-error">
            <CircleAlert className="size-icon-sm" />1 blocking issue
          </span>
          <span className="text-text">Hospital medical report missing</span>
        </Row>
        {['Documentation completeness', 'Required claim information', 'Identity consistency', 'Timeline consistency', 'Cross-document consistency'].map(
          (category) => (
            <Row key={category}>
              <span className="text-text">{category}</span>
            </Row>
          ),
        )}
      </Panel>
    ),
  },
  {
    title: 'Risk review',
    text: 'Defined indicators can raise a risk alert with an explanation and evidence. An authorised investigator reviews it. An alert is an indicator for human review, not a finding of fraud.',
    panel: (
      <Panel label="Example alert (fictional)">
        <Row tone="warning">
          <span className="inline-flex items-center gap-2 font-semibold text-warning">
            <ShieldAlert className="size-icon-sm" />
            MEDIUM
          </span>
          <span className="text-text">Identity information conflict</span>
        </Row>
        <Row>
          <span className="text-text-secondary">Evidence</span>
          <span className="text-text">Identity document (SAMPLE), Hospital medical report (SAMPLE)</span>
        </Row>
        <Row>
          <span className="inline-flex items-center gap-2 text-text">
            <UserCheck className="size-icon-sm text-accent" />
            Human decision required
          </span>
        </Row>
      </Panel>
    ),
  },
  {
    title: 'Resolution and audit trail',
    text: 'Issues are resolved or dismissed with a reason, and resolving an issue never erases its history. Important actions appear in the claim timeline and audit history.',
    panel: (
      <Panel label="Timeline (fictional)">
        {['Document uploaded', 'Checks updated', 'Issue resolved'].map((event) => (
          <Row key={event}>
            <span className="inline-flex items-center gap-2 text-text">
              <CircleCheck className="size-icon-sm text-success" />
              {event}
            </span>
          </Row>
        ))}
      </Panel>
    ),
  },
];

const JOURNEYS = [
  {
    id: 'raf_officer',
    label: 'RAF claims officer',
    steps: [
      'Sign in and open permitted claims queue.',
      'Select assigned or authorised claim.',
      'Review overview, documents, readiness and permitted risk alerts.',
      'Request additional information where necessary.',
      'Review response and update status where permitted.',
      'System records action in timeline and audit history.',
    ],
  },
  {
    id: 'claimant',
    label: 'Claimant',
    steps: [
      'Register and sign in.',
      'Open dashboard and create/open an authorised claim.',
      'Complete required information and upload supporting documents.',
      'Platform validates uploads and runs available checks.',
      'View readiness, outstanding issues and explanations.',
      'Supply corrections or additional documents.',
      'System recalculates readiness and progresses the claim when conditions are met.',
      'Receive status updates or information requests and respond through the workspace.',
      'Review the updated timeline.',
    ],
  },
  {
    id: 'lawyer',
    label: 'Legal practitioner',
    steps: [
      'Sign in and open client list.',
      'Select an authorised client and create a claim.',
      'Complete fields and upload documents.',
      'Review validation results and readiness issues.',
      'Correct issues and prepare claim for submission.',
      'Track requests, responses and outstanding tasks.',
    ],
  },
  {
    id: 'investigator',
    label: 'Risk investigator',
    steps: [
      'Sign in and open authorised risk queue.',
      'Filter alerts by severity, status or assignment.',
      'Review alert explanation and supporting evidence.',
      'Compare relevant documents and extracted fields.',
      'Record notes or request further verification.',
      'Record reasoned outcome and resolve or escalate.',
      'System preserves review history.',
    ],
  },
  {
    id: 'manager',
    label: 'Manager',
    steps: [
      'Sign in and open management dashboard.',
      'Review authorised aggregate metrics and outstanding work.',
      'Filter claims by permitted operational categories.',
      'Review authorised reports and workload patterns.',
      'Use information for operational planning.',
    ],
  },
];

/** S03 How it works. */
export function HowItWorksPage() {
  const [journeyId, setJourneyId] = useState(JOURNEYS[0]!.id);
  const journey = JOURNEYS.find((item) => item.id === journeyId) ?? JOURNEYS[0]!;

  return (
    <>
      <PublicSection className="pb-6">
        <Chip>Process</Chip>
        <h1 className="mt-4 text-h1 text-primary">How ClaimGuard works</h1>
        <p className="mt-2 max-w-3xl text-body text-text-secondary">
          ClaimGuard RAF identifies missing documents, inconsistent claimant details, conflicting dates and duplicate files,
          explains each potential issue, recommends next steps and provides controlled workflows for resolving them.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip icon={<CircleCheck aria-hidden className="size-icon-sm text-accent" />}>Explainable checks</Chip>
          <Chip icon={<CircleAlert aria-hidden className="size-icon-sm text-accent" />}>Blocking issues stay visible</Chip>
          <Chip icon={<Scale aria-hidden className="size-icon-sm text-accent" />}>Human review</Chip>
          <Chip icon={<Lock aria-hidden className="size-icon-sm text-accent" />}>Privacy by design</Chip>
        </div>
      </PublicSection>

      <PublicSection className="py-4">
        <ol data-testid="process-steps" className="space-y-6">
          {STEPS.map((step, index) => (
            <li key={step.title} data-testid="process-step" className="grid gap-6 md:grid-cols-[2fr_3fr]">
              <div>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-small font-semibold text-text-on-dark">
                    {index + 1}
                  </span>
                  <h2 className="text-h3 text-primary">{step.title}</h2>
                </div>
                <p className="mt-2 text-body text-text-secondary">{step.text}</p>
                {step.note ? <p className="mt-3 rounded-input bg-surface-muted p-3 text-small text-text-secondary">{step.note}</p> : null}
              </div>
              {step.panel}
            </li>
          ))}
        </ol>
      </PublicSection>

      <PublicSection eyebrow="Role journeys" title="Journeys by role" headingId="journeys-heading" intro="See how each role moves through ClaimGuard RAF.">
        <div className="rounded-card border border-border bg-surface p-6">
          <Tabs label="Role journeys" idPrefix="journey" tabs={JOURNEYS.map(({ id, label }) => ({ id, label }))} activeId={journey.id} onChange={setJourneyId} />
          <div role="tabpanel" id={`journey-panel-${journey.id}`} aria-labelledby={`journey-tab-${journey.id}`} className="pt-6">
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {journey.steps.map((step, index) => (
                <li key={step} className="rounded-card bg-surface-muted p-4">
                  <span className="font-mono text-mono text-accent">{`Step ${String(index + 1).padStart(2, '0')}`}</span>
                  <p className="mt-1 text-body text-text">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </PublicSection>

      <PublicSection className="py-4">
        <DarkCallout eyebrow="Human oversight" icon={<Gavel className="size-icon" />}>
          <p className="text-body text-text-on-dark">
            Automated analysis assists people; final investigative, legal and compensation decisions remain with authorised human
            decision-makers.
          </p>
        </DarkCallout>
      </PublicSection>
    </>
  );
}
