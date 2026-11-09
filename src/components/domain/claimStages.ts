import type { Step } from '@/components/ui/Stepper';
import { CLAIM_STATUSES } from './StatusChip';

const STAGES = ['draft', 'documents_needed', 'validation', 'ready', 'submitted', 'raf_review', 'assessment', 'negotiation', 'settlement', 'closed'];

/** The ten-stage claim tracker (S09, S14). */
export function claimStages(status: string): Step[] {
  const current = STAGES.indexOf(status === 'information_required' ? 'raf_review' : status);
  return STAGES.map((id, index) => ({ id, label: CLAIM_STATUSES[id]!, status: index < current ? 'complete' : index === current ? 'current' : 'upcoming' }));
}
