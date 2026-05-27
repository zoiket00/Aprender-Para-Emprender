import { createClient } from "@supabase/supabase-js";

const API_BASE = (import.meta as { env?: Record<string, string> }).env?.["VITE_API_URL"] ?? "";

async function fetchConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("No se pudo obtener la configuración de Supabase");
  return res.json() as Promise<{ url: string; anonKey: string }>;
}

let _promise: Promise<ReturnType<typeof createClient>> | null = null;

export function getSupabase() {
  if (!_promise) {
    _promise = fetchConfig().then(({ url, anonKey }) =>
      createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    );
  }
  return _promise;
}
