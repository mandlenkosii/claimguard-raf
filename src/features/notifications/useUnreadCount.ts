import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from './api';

/** The bell. Polls so a new notification shows without a page reload. */
export function useUnreadCount(enabled: boolean): number {
  const { data } = useQuery({ queryKey: ['unread-count'], queryFn: getUnreadCount, enabled, refetchInterval: 15000, retry: false });
  return data ?? 0;
}
