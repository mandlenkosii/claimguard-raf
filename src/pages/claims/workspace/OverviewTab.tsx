import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Stepper } from '@/components/ui/Stepper';
import { claimStages } from '@/components/domain/claimStages';
import * as api from '@/features/claims/api';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { formatDate } from '@/lib/format/dates';
import { useWorkspaceClaim } from './ClaimWorkspaceLayout';
import { ReadinessSnapshot } from './ReadinessSnapshot';

const PARTY_LABELS: Record<string, string> = { claimant: 'Claimant', legal_representative: 'Legal representative', other_driver: 'Other driver', other_party: 'Other party' };

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-label uppercase text-text-secondary">{label}</dt>
      <dd className="mt-1 text-body text-text">{value || '—'}</dd>
    </div>
  );
}

/** S14. */
export function OverviewTab() {
  const claim = useWorkspaceClaim();
  const assignments = useQuery({ queryKey: ['assignments', claim.id], queryFn: () => api.getAssignments(claim.id) });
  return (
    <div className="space-y-6">
      <Card>
        <Stepper label="Claim progress" variant="tracker" steps={claimStages(claim.status)} />
      </Card>
      <ReadinessSnapshot claimId={claim.id} />
      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title="Claim summary">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Accident date" value={formatDate(claim.accident_date)} />
            <Detail label="Accident location" value={[claim.accident_location, claim.accident_town, claim.accident_province].filter(Boolean).join(', ')} />
            <Detail label="Claimant role" value={claim.claimant_role && claim.claimant_role[0]!.toUpperCase() + claim.claimant_role.slice(1)} />
            <Detail label="Police station and case number" value={[claim.police_station, claim.cas_number].filter(Boolean).join(' · ')} />
            <div className="sm:col-span-2">
              <Detail label="Accident description" value={claim.accident_description} />
            </div>
            <div className="sm:col-span-2">
              <Detail label="Injuries" value={claim.injuries_summary} />
            </div>
          </dl>
        </Card>
        <div className="space-y-6">
          <Card title="Parties">
            <ul className="space-y-3">
              {claim.parties.map((party) => (
                <li key={party.id}>
                  <p className="text-label uppercase text-text-secondary">{PARTY_LABELS[party.party_type] ?? party.party_type}</p>
                  <p className="text-body text-text">{party.full_name || '—'}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Assignments">
            <ul className="space-y-3">
              {(assignments.data ?? []).map((assignment) => (
                <li key={assignment.profile_id + assignment.assignment_role}>
                  <p className="text-label uppercase text-text-secondary">{ROLE_LABELS[assignment.assignment_role as RoleKey] ?? assignment.assignment_role}</p>
                  <p className="text-body text-text">{assignment.display_name}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
