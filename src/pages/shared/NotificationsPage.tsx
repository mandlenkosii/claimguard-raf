import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff } from 'lucide-react';
import { useState } from 'react';
import { NotificationItem } from '@/components/domain/NotificationItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/notifications/api';
import { dateKey } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';

const PAGE_SIZE = 20;
const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'requests', label: 'Requests' },
  { id: 'messages', label: 'Messages' },
  { id: 'updates', label: 'Claim updates' },
];

function groups(rows: api.Notification[]) {
  const today = dateKey(new Date().toISOString());
  const yesterday = dateKey(new Date(Date.now() - 86_400_000).toISOString());
  const bucket = (row: api.Notification) => {
    const key = dateKey(row.created_at);
    return key === today ? 'Today' : key === yesterday ? 'Yesterday' : 'Earlier';
  };
  return ['Today', 'Yesterday', 'Earlier'].map((title) => ({ title, items: rows.filter((row) => bucket(row) === title) })).filter((group) => group.items.length);
}

/** S12. */
export function NotificationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['notifications', tab, page], queryFn: () => api.getNotifications(tab, page, PAGE_SIZE) });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['unread-count'] });
  };
  const failed = () => toast.show({ tone: 'error', message: TXT[2] });
  const markAll = useMutation({ mutationFn: () => api.markAllRead(), onSuccess: refresh, onError: failed });
  const markOne = useMutation({ mutationFn: (id: string) => api.markRead(id), onSuccess: refresh });

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-primary">Notifications</h1>
        <Button variant="secondary" loading={markAll.isPending} disabled={markAll.isPending} onClick={() => markAll.mutate()}>
          Mark all as read
        </Button>
      </div>
      <Tabs
        label="Notifications"
        idPrefix="notifications"
        tabs={TABS}
        activeId={tab}
        onChange={(id) => {
          setTab(id);
          setPage(1);
        }}
      />
      {list.isPending ? <Skeleton variant="card" /> : null}
      {list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : null}
      {list.data && !list.data.rows.length ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState icon={BellOff} message={TXT[50]} />
        </div>
      ) : null}
      {list.data
        ? groups(list.data.rows).map((group) => (
            <div key={group.title} data-testid={`group-${group.title}`}>
              <Card title={group.title}>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <NotificationItem notification={item} onOpen={(id) => markOne.mutate(id)} />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))
        : null}
      {list.data?.rows.length ? <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={setPage} /> : null}
    </div>
  );
}
