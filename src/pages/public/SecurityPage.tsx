import {
  EyeOff,
  FileLock2,
  History,
  KeyRound,
  Link2,
  Lock,
  Scale,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { Chip, PublicSection } from './PublicSection';

// S04 layout and order from the design; wording from PRD 1.4, 3, 4, 10 and plan BR27 (Section 18 #45).
// Signed links expire after 5 minutes (BR27), not the design's 15 minutes.

const PRINCIPLES = [
  { icon: Users, title: 'Role-based access (RBAC)', text: 'Each of the six roles sees only what it needs. Permissions come from authorised role assignments, and users cannot grant themselves privileged roles.' },
  { icon: ServerCog, title: 'Server-side authorisation and RLS', text: 'Every sensitive operation is authorised on the server or by database row-level security. Hiding a button is never the only check.' },
  { icon: Link2, title: 'Short-lived signed links', text: 'Claim documents are stored privately. Downloads use signed links that expire after 5 minutes.' },
  { icon: History, title: 'Append-only audit trail', text: 'Important actions are recorded with actor, action, resource and time. Audit records cannot be changed or deleted.' },
  { icon: Scale, title: 'Separation of duties', text: 'Administrative access does not grant claim or investigation access, and managers do not see confidential investigation evidence.' },
  { icon: ShieldAlert, title: 'Explainable alerts and human review', text: 'Every alert includes a reason and evidence. Alerts are indicators for review, and people make the final decision.' },
  { icon: EyeOff, title: 'Data minimisation', text: 'Only necessary information is collected. Credentials, document contents and unnecessary personal information are never written to logs.' },
  { icon: FileLock2, title: 'POPIA-aware design', text: 'Privacy by design throughout. Applicable South African law, including POPIA, must be assessed before any real claimant data is processed.' },
];

const GATES = [
  { icon: UserCheck, title: 'Signed-in, active user', text: 'Suspended or disabled accounts cannot reach protected resources, even with a valid session.' },
  { icon: KeyRound, title: 'Assigned role', text: 'Roles are assigned by an administrator on the server. No one can assign a role to themselves.' },
  { icon: Lock, title: 'Claim access', text: 'Own claim, authorised firm and client, or an active assignment. Changing a URL never grants access to another claim.' },
  { icon: ShieldCheck, title: 'Permitted data', text: 'Confidential tabs and fields are not rendered for roles without access. Risk evidence is for authorised investigators only.' },
];

/** S04 Security. */
export function SecurityPage() {
  return (
    <>
      <PublicSection className="pb-6">
        <Chip>Data protection</Chip>
        <h1 className="mt-4 text-h1 text-primary">Security and privacy by design</h1>
        <p className="mt-2 max-w-3xl text-body text-text-secondary">
          Authentication, server-side authorisation, private document storage and strict human review protect claim information
          at every step. Users access only information they are authorised to view.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip icon={<Users aria-hidden className="size-icon-sm text-accent" />}>Role-based access</Chip>
          <Chip icon={<ServerCog aria-hidden className="size-icon-sm text-accent" />}>Server-side authorisation</Chip>
          <Chip icon={<Lock aria-hidden className="size-icon-sm text-accent" />}>Privacy by design</Chip>
          <Chip icon={<Scale aria-hidden className="size-icon-sm text-accent" />}>Human review</Chip>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Core principles"
        title="Eight security principles"
        headingId="principles-heading"
        intro="Every principle below is enforced by the server or the database, not only in the interface."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map(({ icon: Icon, title, text }, index) => (
            <article key={title} data-testid="principle-card" className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between">
                <span aria-hidden className="flex size-10 items-center justify-center rounded-input bg-surface-muted text-primary">
                  <Icon className="size-icon" />
                </span>
                <span className="font-mono text-mono text-text-secondary">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-3 text-h3 text-primary">{title}</h3>
              <p className="mt-1 text-small text-text-secondary">{text}</p>
            </article>
          ))}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Access model" title="Four checks before data is shown" headingId="access-heading">
        <ol className="grid gap-4 rounded-card border border-border bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4">
          {GATES.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="rounded-card bg-surface-muted p-4">
              <p className="font-mono text-mono text-text-secondary">{`Check ${index + 1}`}</p>
              <p className="mt-2 flex items-center gap-2 text-body font-semibold text-primary">
                <Icon aria-hidden className="size-icon-sm text-accent" />
                {title}
              </p>
              <p className="mt-1 text-small text-text-secondary">{text}</p>
            </li>
          ))}
        </ol>
      </PublicSection>

      <PublicSection className="py-4">
        <div className="flex items-start gap-4 rounded-card border border-border bg-surface p-6">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-input bg-error-tint text-error">
            <ShieldAlert className="size-icon" />
          </span>
          <div>
            <p className="text-label uppercase text-error">Prototype notice</p>
            <h2 className="mt-1 text-h3 text-primary">Prototype disclaimer</h2>
            <p className="mt-1 text-body text-text-secondary">This prototype uses fictional data. It is not a legal compliance certification.</p>
          </div>
        </div>
      </PublicSection>
    </>
  );
}
