import { supabase } from '@/lib/supabase';

export type Thread = { id: string; title: string; created_at: string; last_message_at: string | null; last_message_body: string | null };
export type Participant = { id: string; name: string; role: string | null };
export type Messaging = { is_participant: boolean; threads: Thread[]; participants: Participant[] };
export type Message = { id: string; body: string; author_id: string; author_name: string; author_role: string | null; created_at: string };

/** OP37. */
export async function getMessaging(claimId: string): Promise<Messaging> {
  const { data, error } = await supabase.rpc('get_claim_messaging', { p_claim: claimId });
  if (error) throw error;
  return data as Messaging;
}

export async function getThreadMessages(threadId: string): Promise<Message[]> {
  const { data, error } = await supabase.rpc('get_thread_messages', { p_thread: threadId });
  if (error) throw error;
  return data as Message[];
}

/** OP36. */
export async function sendMessage({ claimId, threadId, body }: { claimId: string; threadId: string; body: string }): Promise<void> {
  const { error } = await supabase.from('messages').insert({ thread_id: threadId, claim_id: claimId, body });
  if (error) throw error;
}

export async function createThread({ claimId, title, body }: { claimId: string; title: string; body: string }): Promise<string> {
  const id = crypto.randomUUID();
  const thread = await supabase.from('message_threads').insert({ id, claim_id: claimId, title });
  if (thread.error) throw thread.error;
  await sendMessage({ claimId, threadId: id, body });
  return id;
}
