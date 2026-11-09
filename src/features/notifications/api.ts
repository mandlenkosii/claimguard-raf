import { supabase } from '@/lib/supabase';

export type Notification = { id: string; type: string; title: string; summary: string; link: string; read_at: string | null; created_at: string };
export type NotificationPage = { rows: Notification[]; total: number };

/** OP38. */
export async function getNotifications(tab: string, page: number, pageSize: number): Promise<NotificationPage> {
  let query = supabase.from('notifications').select('id, type, title, summary, link, read_at, created_at', { count: 'exact' });
  if (tab === 'unread') query = query.is('read_at', null);
  if (tab === 'requests') query = query.in('type', ['request', 'response']);
  if (tab === 'messages') query = query.eq('type', 'message');
  if (tab === 'updates') query = query.in('type', ['claim_update', 'assignment']);
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: data as Notification[], total: count ?? 0 };
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error) throw error;
}
