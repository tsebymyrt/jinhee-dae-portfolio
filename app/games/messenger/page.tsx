'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { logGameEvent } from '@/lib/logger';
import { isSupabaseConfigured, MessengerMessage } from '@/lib/supabase';
import {
  fetchRecentMessages,
  sendMessage,
  subscribeToMessages,
  unsubscribe,
  purgeExpiredMessages,
} from '@/lib/messenger';

// 채널 목록(장식용) — 실제 대화는 #general 한 곳에서 이뤄진다
const CHANNELS = [
  { id: 'general', name: '전체 공지', unread: 0, active: true },
  { id: 'dev', name: '개발팀', unread: 3 },
  { id: 'design', name: '디자인팀', unread: 0 },
  { id: 'random', name: '잡담', unread: 12 },
  { id: 'hr', name: '인사팀', unread: 1 },
];

// 색상: 닉네임 기반으로 일관된 아바타 색
const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (sameDay) {
    const ampm = d.getHours() < 12 ? '오전' : '오후';
    const h12 = d.getHours() % 12 || 12;
    return `${ampm} ${h12}:${mm}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function expiresIn(iso: string): string {
  const created = new Date(iso).getTime();
  const expiry = created + 48 * 60 * 60 * 1000;
  const left = expiry - Date.now();
  if (left <= 0) return '만료됨';
  const h = Math.floor(left / (60 * 60 * 1000));
  if (h >= 1) return `${h}시간 후 사라짐`;
  const m = Math.floor(left / (60 * 1000));
  return `${m}분 후 사라짐`;
}

export default function MessengerPage() {
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [input, setInput] = useState('');
  const [nickname, setNickname] = useState('anonymous');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const [, forceTick] = useState(0);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // 새 메시지를 중복 없이 추가
  const pushMessage = useCallback((msg: MessengerMessage) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem('acme_nickname')
      : null;
    if (stored) setNickname(stored);

    logGameEvent('messenger', 'enter', stored || undefined);

    let channel: ReturnType<typeof subscribeToMessages> = null;

    (async () => {
      // 만료 메시지 청소(best-effort) 후 최근 메시지 로드
      await purgeExpiredMessages();
      const recent = await fetchRecentMessages();
      recent.forEach((m) => seenIds.current.add(m.id));
      setMessages(recent);
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);

      channel = subscribeToMessages((msg) => {
        pushMessage(msg);
      });
      if (channel) setConnected(true);
    })();

    // "N시간 후 사라짐" 표시를 1분마다 갱신 + 만료된 메시지 화면에서 제거
    const tick = setInterval(() => {
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      setMessages((prev) =>
        prev.filter((m) => new Date(m.created_at).getTime() > cutoff)
      );
      forceTick((n) => n + 1);
    }, 60 * 1000);

    return () => {
      unsubscribe(channel);
      logGameEvent('messenger', 'exit', stored || undefined);
      clearInterval(tick);
    };
  }, [pushMessage, scrollToBottom]);

  // 메시지 추가되면 하단으로 스크롤
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    const ok = await sendMessage(nickname, text);
    if (!ok) {
      // 실패 시 입력 복구
      setInput(text);
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col text-sm">
      {/* Top bar (기업 포털 스타일 유지) */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="flex items-center justify-between px-4 h-10 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <Link href="/" className="bg-yellow-400 text-blue-900 font-black text-xs px-2 py-1 tracking-wider">
              ACME
            </Link>
            <span className="text-xs opacity-80 hidden sm:block">
              AcmeChat v4.2 · 사내 메신저
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 opacity-80">
              <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-400'}`} />
              {connected ? '실시간 연결됨' : '연결 중...'}
            </span>
            <Link href="/" className="opacity-60 hover:opacity-100">← 포털로</Link>
          </div>
        </div>
      </header>

      {/* 안내 배너 */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800 flex items-center gap-2">
        <span>⏳</span>
        <span>보안 정책에 따라 모든 대화는 <b>48시간 후 자동으로 삭제</b>됩니다. 중요한 내용은 별도 보관하세요.</span>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full p-3 flex gap-3 min-h-0">
        {/* 채널 사이드바 (장식) */}
        <aside className="w-44 flex-shrink-0 hidden md:block">
          <div className="bg-white border border-gray-300 shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-bold text-gray-700">
              채널
            </div>
            <ul className="py-1">
              {CHANNELS.map((c) => (
                <li key={c.id}>
                  <button
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors
                      ${c.active ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span># {c.name}</span>
                    {c.unread > 0 && (
                      <span className="bg-red-500 text-white rounded-full px-1.5 text-[10px] leading-4">
                        {c.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 px-3 py-2 text-[10px] text-gray-400">
              접속: <b className="text-gray-600">{nickname}</b> 님
            </div>
          </div>
        </aside>

        {/* 채팅 영역 */}
        <section className="flex-1 flex flex-col bg-white border border-gray-300 shadow-sm min-h-0">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800"># 전체 공지</h2>
            <span className="text-xs text-gray-400">
              {messages.length}개의 메시지 · 실시간
            </span>
          </div>

          {/* 메시지 리스트 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ minHeight: 320, maxHeight: 'calc(100vh - 240px)' }}
          >
            {!isSupabaseConfigured && (
              <div className="text-center text-xs text-red-500 py-4">
                ⚠️ 메신저 서버가 설정되지 않았습니다. (Supabase 환경변수 필요)
              </div>
            )}
            {loading && (
              <div className="text-center text-xs text-gray-400 py-8">
                메시지를 불러오는 중...
              </div>
            )}
            {!loading && messages.length === 0 && isSupabaseConfigured && (
              <div className="text-center text-xs text-gray-400 py-8">
                아직 대화가 없습니다. 첫 메시지를 남겨보세요! 👋
              </div>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const grouped = prev && prev.nickname === m.nickname &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
              const mine = m.nickname === nickname;
              return (
                <div key={m.id} className={`flex gap-2 ${grouped ? 'mt-0.5' : ''}`}>
                  <div className="w-8 flex-shrink-0">
                    {!grouped && (
                      <div className={`w-8 h-8 rounded-full ${colorFor(m.nickname)} text-white flex items-center justify-center text-xs font-bold`}>
                        {m.nickname.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {!grouped && (
                      <div className="flex items-baseline gap-2">
                        <span className={`text-xs font-bold ${mine ? 'text-blue-700' : 'text-gray-800'}`}>
                          {m.nickname}{mine && ' (나)'}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatTime(m.created_at)}</span>
                        <span className="text-[10px] text-gray-300" title="48시간 후 자동 삭제">
                          · {expiresIn(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 입력창 */}
          <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSupabaseConfigured ? `#전체 공지 에 메시지 보내기...` : '서버 미설정'}
              maxLength={500}
              disabled={!isSupabaseConfigured || sending}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-400 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={!isSupabaseConfigured || sending || !input.trim()}
              className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? '전송 중' : '전송'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
