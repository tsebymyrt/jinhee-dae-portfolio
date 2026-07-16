import { createClient } from '@supabase/supabase-js';

// Use placeholder values if env vars not set (for build-time only)
// At runtime, real values from .env.local will be used
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GameLog = {
  id?: string;
  nickname: string;
  ip_address: string;
  game_id: string;
  action: 'enter' | 'exit' | 'complete';
  created_at?: string;
};

export type MessengerMessage = {
  id: string;
  nickname: string;
  body: string;
  created_at: string;
};

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const MESSAGE_TTL_HOURS = 48;
