import { createClient } from "@supabase/supabase-js";

async function fetchConfig() {
  const res = await fetch("/api/config");
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
