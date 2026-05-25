import { createClient } from "@supabase/supabase-js";

async function fetchConfig() {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("No se pudo obtener la configuración de Supabase");
  return res.json() as Promise<{ url: string; anonKey: string }>;
}

let _supabase: ReturnType<typeof createClient> | null = null;

export async function getSupabase() {
  if (_supabase) return _supabase;
  const { url, anonKey } = await fetchConfig();
  _supabase = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _supabase;
}
