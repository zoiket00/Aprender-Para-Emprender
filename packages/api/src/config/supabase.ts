import { createClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_KEY"];
const anonKey = process.env["SUPABASE_ANON_KEY"];

if (!url || !serviceKey || !anonKey) {
  console.error("❌  Falta SUPABASE_URL, SUPABASE_SERVICE_KEY o SUPABASE_ANON_KEY");
  process.exit(1);
}

export const supabase = createClient(url, serviceKey);

export const supabaseConfig = { url, anonKey };
