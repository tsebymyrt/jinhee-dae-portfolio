-- Mini Game Heaven - Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Game logs table
CREATE TABLE IF NOT EXISTS public.game_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL DEFAULT 'anonymous',
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  game_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('enter', 'exit', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS game_logs_game_id_idx ON public.game_logs(game_id);
CREATE INDEX IF NOT EXISTS game_logs_action_idx ON public.game_logs(action);
CREATE INDEX IF NOT EXISTS game_logs_created_at_idx ON public.game_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for logging)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.game_logs;
CREATE POLICY "Allow anonymous inserts" ON public.game_logs
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anonymous reads (for play counts on hub page)
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.game_logs;
CREATE POLICY "Allow anonymous reads" ON public.game_logs
  FOR SELECT TO anon
  USING (true);

-- Helpful view: play counts per game
CREATE OR REPLACE VIEW public.game_play_counts AS
SELECT
  game_id,
  COUNT(*) FILTER (WHERE action = 'enter') AS enter_count,
  COUNT(*) FILTER (WHERE action = 'complete') AS complete_count,
  COUNT(DISTINCT nickname) AS unique_players
FROM public.game_logs
GROUP BY game_id;

-- Mystery game rankings table
CREATE TABLE IF NOT EXISTS public.mystery_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL,
  time_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS mystery_rankings_time_idx ON public.mystery_rankings(time_seconds ASC);
ALTER TABLE public.mystery_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.mystery_rankings;
CREATE POLICY "Allow anonymous inserts" ON public.mystery_rankings FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.mystery_rankings;
CREATE POLICY "Allow anonymous reads" ON public.mystery_rankings FOR SELECT TO anon USING (true);

-- ============================================================
-- 사내 메신저 (실시간 채팅) — messenger_messages
-- 48시간이 지난 메시지는 조회에서 제외되고, 접속 시 자동 삭제됩니다.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messenger_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL DEFAULT 'anonymous',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS messenger_messages_created_at_idx
  ON public.messenger_messages(created_at DESC);

ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.messenger_messages;
CREATE POLICY "Allow anonymous inserts" ON public.messenger_messages
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous reads" ON public.messenger_messages;
CREATE POLICY "Allow anonymous reads" ON public.messenger_messages
  FOR SELECT TO anon USING (true);

-- 48시간 지난 메시지 삭제를 클라이언트가 호출할 수 있도록 함수 제공
DROP POLICY IF EXISTS "Allow anonymous deletes of expired" ON public.messenger_messages;
CREATE POLICY "Allow anonymous deletes of expired" ON public.messenger_messages
  FOR DELETE TO anon USING (created_at < NOW() - INTERVAL '48 hours');

-- 실시간(Realtime) 활성화: 새 메시지가 즉시 구독자에게 전송됩니다.
-- 이미 추가되어 있으면 에러가 날 수 있으나 무시해도 됩니다.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
