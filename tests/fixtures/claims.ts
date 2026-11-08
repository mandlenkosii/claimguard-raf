import type { ClaimDetail, ClaimListRow, TimelineEvent } from '@/features/claims/api';

export const CLAIM_ID = 'c0000000-0000-4000-8000-000000000003';

export const claimRow: ClaimListRow = {
  id: CLAIM_ID,
  reference: 'CG-2026-000142',
  claimant_name: 'Sipho Ndlovu',
  accident_date: '2025-11-14',
  status: 'validation',
  readiness_score: 85,
  blocking_count: 1,
  open_request_count: 2,
  updated_at: '2026-02-25T10:00:00Z',
};

export const claimDetail: ClaimDetail = {
  id: CLAIM_ID,
  reference: 'CG-2026-000142',
  status: 'validation',
  claimant_name: 'Sipho Ndlovu',
  claimant_id: 'b0000000-0000-4000-8000-000000000002',
  claimant_role: 'pedestrian',
  accident_date: '2025-11-14',
  accident_time: null,
  accident_province: 'Gauteng',
  accident_town: 'Midrand',
  accident_location: 'R55 and Kyalami Junction',
  police_station: 'SAPS Midrand',
  cas_number: 'CAS 319/11/2025',
  accident_description: 'Fictional example.',
  injuries_summary: 'Fictional injury.',
  created_at: '2026-01-12T10:00:00Z',
  readiness_score: 85,
  blocking_count: 1,
  parties: [
    { id: 'p1', party_type: 'claimant', full_name: 'Sipho Ndlovu' },
    { id: 'p2', party_type: 'legal_representative', full_name: 'Nkosi & Partners Attorneys' },
  ],
};

export const timelineEvents: TimelineEvent[] = [
  { id: 'e1', event_type: 'status_change_blocked', actor_id: 'a1', actor_name: 'Demo RAF Officer', actor_role: 'raf_officer', summary: 'Status change to Ready blocked', from_status: 'validation', to_status: 'ready', reason: 'Ready — 1 blocking issue open', created_at: '2026-02-25T12:15:00Z' },
  { id: 'e2', event_type: 'document_uploaded', actor_id: 'a2', actor_name: 'Lindiwe Nkosi', actor_role: 'lawyer', summary: 'Document uploaded', from_status: null, to_status: null, reason: null, created_at: '2026-02-25T09:00:00Z' },
  { id: 'e3', event_type: 'claim_created', actor_id: 'a2', actor_name: 'Lindiwe Nkosi', actor_role: 'lawyer', summary: 'Claim created', from_status: null, to_status: null, reason: null, created_at: '2026-01-12T10:00:00Z' },
];
