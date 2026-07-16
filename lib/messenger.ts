import {
  supabase,
  MessengerMessage,
  isSupabaseConfigured,
  MESSAGE_TTL_HOURS,
} from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// 48시간 경계 시각(ISO)을 반환
function ttlCutoffISO(): string {
  return new Date(Date.now() - MESSAGE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

// 최근 48시간 이내 메시지를 오래된 순으로 가져온다
export async function fetchRecentMessages(
  limit = 200
): Promise<MessengerMessage[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('messenger_messages')
      .select('*')
      .gt('created_at', ttlCutoffISO())
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as MessengerMessage[]).reverse();
  } catch (err) {
    console.error('[Messenger] fetch failed:', err);
    return [];
  }
}

// 메시지 전송
export async function sendMessage(
  nickname: string,
  body: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const trimmed = body.trim();
  if (!trimmed) return false;
  try {
    const { error } = await supabase
      .from('messenger_messages')
      .insert({ nickname: nickname || 'anonymous', body: trimmed.slice(0, 500) });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Messenger] send failed:', err);
    return false;
  }
}

// 48시간이 지난 메시지를 실제로 삭제 (best-effort)
export async function purgeExpiredMessages(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('messenger_messages')
      .delete()
      .lt('created_at', ttlCutoffISO());
  } catch (err) {
    console.error('[Messenger] purge failed:', err);
  }
}

// 실시간 구독: 새 메시지가 INSERT되면 콜백 호출
export function subscribeToMessages(
  onInsert: (msg: MessengerMessage) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured) return null;
  const channel = supabase
    .channel('messenger-room')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messenger_messages' },
      (payload) => {
        onInsert(payload.new as MessengerMessage);
      }
    )
    .subscribe();
  return channel;
}

export function unsubscribe(channel: RealtimeChannel | null): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
