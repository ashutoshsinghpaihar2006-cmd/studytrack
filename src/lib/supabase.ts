import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RuntimeSupabaseConfig = {
  configured: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

export function createSupabaseClient(config: RuntimeSupabaseConfig): SupabaseClient | null {
  if (!config.configured || !config.supabaseUrl || !config.supabaseAnonKey) return null;
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      flowType: "pkce",
    },
  });
}
