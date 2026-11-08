import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Timeline } from '@/components/domain/Timeline';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import * as api from '@/features/claims/api';
import { dateKey } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';

const EVENT_TYPES: Record<string, string> = {
  claim_created: 'Claim created',
  claim_updated: 'Claim updated',
  status_changed: 'Status changed',
  status_change_blocked: 'Blocked status change',
  document_uploaded: 'Document uploaded',
  document_version_added: 'Document version added',
  document_processed: 'Document processed',
  validation_run: 'Validation run',
  readiness_assessed: 'Readiness assessed',
  request_sent: 'Request sent',
  response_received: 'Response received',
  request_closed: 'Request closed',
  assignment_changed: 'Assignment changed',
  message_posted: 'Message posted',
};

/** S23. */
export function TimelineTab() {
  const { id = '' } = useParams();
  const [eventType, setEventType] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const query = useQuery({ queryKey: ['timeline', id], queryFn: () => api.getTimeline(id) });

  const events = useMemo(() => query.data ?? [], [query.data]);
  const visible = events.filter((event) => {
    const day = dateKey(event.created_at);
    return (!eventType || event.event_type === eventType) && (!actor || event.actor_name === actor) && (!from || day >= from) && (!to || day <= to);
  });
  const actors = [...new Set(events.map((event) => event.actor_name).filter((name): name is string => Boolean(name)))];

  if (query.isPending) return <Skeleton variant="table" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      <FilterBar
        selects={[
          { label: 'Event type', value: eventType, onChange: setEventType, options: Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label })) },
          { label: 'Actor', value: actor, onChange: setActor, options: actors.map((name) => ({ value: name, label: name })) },
        ]}
        onClear={() => {
          setEventType('');
          setActor('');
          setFrom('');
          setTo('');
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="From date" name="from" type="date" value={from} onChange={setFrom} />
        <TextField label="To date" name="to" type="date" value={to} onChange={setTo} />
      </div>
      {visible.length ? <Timeline events={visible} /> : <EmptyState icon={History} message={TXT[55]} />}
    </div>
  );
}
